package app

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"reflect"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"wifiyka/backend/internal/apperr"
	"wifiyka/backend/internal/models"
)

func (a *App) SyncOutbox(ctx context.Context, sessionToken string, input models.SyncOutboxRequest) (models.SyncOutboxResponse, error) {
	record, err := a.loadSession(ctx, sessionToken, true)
	if err != nil {
		return models.SyncOutboxResponse{}, err
	}

	if len(input.Operations) == 0 || len(input.Operations) > 100 {
		return models.SyncOutboxResponse{}, apperr.Validation("send between 1 and 100 operations", nil)
	}
	results := make([]models.SyncOperationResult, 0, len(input.Operations))
	for _, op := range input.Operations {
		if _, err := uuid.Parse(op.ClientOperationID); err != nil {
			return models.SyncOutboxResponse{}, apperr.Validation("client_operation_id must be UUID", nil)
		}
		result, err := a.syncOperation(ctx, record.User, op)
		if err != nil {
			return models.SyncOutboxResponse{}, err
		}
		results = append(results, result)
	}
	return models.SyncOutboxResponse{Results: results, ServerTime: time.Now().UTC()}, nil
}

func (a *App) syncOperation(ctx context.Context, actor models.User, op models.SyncOperationRequest) (models.SyncOperationResult, error) {
	result := models.SyncOperationResult{ClientOperationID: op.ClientOperationID, Status: "applied"}
	tx, err := a.db.Begin(ctx)
	if err != nil {
		return result, apperr.Internal(err)
	}
	defer tx.Rollback(ctx)
	// A transaction-scoped database lock serializes retries across processes.
	if _, err = tx.Exec(ctx, "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", actor.UserID+":"+op.ClientOperationID); err != nil {
		return result, apperr.Internal(err)
	}
	var status, entityType, operationType string
	var entityID, message *string
	var payload []byte
	var fingerprint *string
	requestFingerprint := operationFingerprint(op)
	err = tx.QueryRow(ctx, `SELECT status, entity_id::text, error_message, entity_type, operation_type, payload, request_fingerprint
        FROM sync_operations WHERE user_id=$1 AND client_operation_id=$2`, actor.UserID, op.ClientOperationID).Scan(&status, &entityID, &message, &entityType, &operationType, &payload, &fingerprint)
	if err == nil {
		if entityType != op.EntityType || operationType != op.OperationType || !sameJSON(payload, op.Payload) || (fingerprint != nil && *fingerprint != requestFingerprint) {
			return result, apperr.Conflict("operation_reused", "operation ID was already used with another payload")
		}
		if status == "pending" {
			return result, apperr.Conflict("legacy_pending_operation", "older unfinished operation requires reconciliation")
		}
		result.Status, result.EntityID, result.ErrorMessage = status, entityID, message
		return result, nil
	}
	if err != pgx.ErrNoRows {
		return result, apperr.Internal(err)
	}
	if (strings.HasPrefix(op.OperationType, "place_") && op.EntityType != "place") || (strings.HasPrefix(op.OperationType, "vote_") && op.EntityType != "place_vote") {
		return result, apperr.Validation("entity_type does not match operation", nil)
	}
	_, err = tx.Exec(ctx, `INSERT INTO sync_operations (sync_operation_id,user_id,client_operation_id,entity_type,entity_id,operation_type,payload,status,created_at,request_fingerprint)
        VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',now(),$8)`, uuid.New(), actor.UserID, op.ClientOperationID, op.EntityType, op.EntityID, op.OperationType, op.Payload, requestFingerprint)
	if err != nil {
		return result, apperr.Internal(err)
	}
	scoped := *a
	scoped.db = tx // Mutations use nested savepoints; entity and receipt commit together.
	entityID, applyErr := scoped.applySyncOperation(ctx, actor, op)
	if applyErr != nil {
		var apiErr *apperr.Error
		if !errors.As(applyErr, &apiErr) || apiErr.Status >= 500 || apiErr.Status == 429 {
			return result, applyErr
		}
		result.Status = "failed"
		if apiErr.Status == 409 {
			result.Status = "conflict"
		}
		result.ErrorCode, result.ErrorMessage = &apiErr.Code, &apiErr.Message
	} else {
		result.EntityID = entityID
	}
	_, err = tx.Exec(ctx, `UPDATE sync_operations SET status=$3,entity_id=COALESCE($4,entity_id),error_message=$5
        WHERE user_id=$1 AND client_operation_id=$2`, actor.UserID, op.ClientOperationID, result.Status, result.EntityID, result.ErrorMessage)
	if err != nil {
		return result, apperr.Internal(err)
	}
	if err = tx.Commit(ctx); err != nil {
		return result, apperr.Internal(err)
	}
	return result, nil
}

func operationFingerprint(op models.SyncOperationRequest) string {
	var payload any
	decoder := json.NewDecoder(strings.NewReader(string(op.Payload)))
	decoder.UseNumber()
	_ = decoder.Decode(&payload)
	encoded, _ := json.Marshal([]any{op.EntityType, op.EntityID, op.OperationType, payload})
	hash := sha256.Sum256(encoded)
	return hex.EncodeToString(hash[:])
}

func sameJSON(left, right []byte) bool {
	var a, b any
	if json.Unmarshal(left, &a) != nil || json.Unmarshal(right, &b) != nil {
		return false
	}
	return reflect.DeepEqual(a, b)
}

func (a *App) applySyncOperation(ctx context.Context, actor models.User, op models.SyncOperationRequest) (*string, error) {
	switch op.OperationType {
	case "place_create":
		var input models.PlaceInput
		if err := json.Unmarshal(op.Payload, &input); err != nil {
			return nil, apperr.Validation("invalid sync payload", nil)
		}
		place, err := a.createPlaceForUser(ctx, actor, input)
		if err != nil {
			return nil, err
		}
		return &place.PlaceID, nil
	case "place_update":
		if op.EntityID == nil {
			return nil, apperr.Validation("entity_id is required for place_update", nil)
		}
		var input models.PlacePatch
		if err := json.Unmarshal(op.Payload, &input); err != nil {
			return nil, apperr.Validation("invalid sync payload", nil)
		}
		place, err := a.updatePlaceAsActor(ctx, actor, *op.EntityID, input)
		if err != nil {
			return nil, err
		}
		return &place.PlaceID, nil
	case "place_delete":
		if op.EntityID == nil {
			return nil, apperr.Validation("entity_id is required for place_delete", nil)
		}
		var input models.DeleteInput
		if err := json.Unmarshal(op.Payload, &input); err != nil {
			return nil, apperr.Validation("invalid sync payload", nil)
		}
		if err := a.deletePlaceAsActor(ctx, actor, *op.EntityID, input.Version); err != nil {
			return nil, err
		}
		return op.EntityID, nil
	case "vote_upsert":
		if op.EntityID == nil {
			return nil, apperr.Validation("entity_id is required for vote_upsert", nil)
		}
		var input models.VoteInput
		if err := json.Unmarshal(op.Payload, &input); err != nil {
			return nil, apperr.Validation("invalid sync payload", nil)
		}
		vote, err := a.upsertVoteAsActor(ctx, actor, *op.EntityID, input)
		if err != nil {
			return nil, err
		}
		return &vote.PlaceVoteID, nil
	case "vote_delete":
		if op.EntityID == nil {
			return nil, apperr.Validation("entity_id is required for vote_delete", nil)
		}
		var input models.DeleteInput
		if err := json.Unmarshal(op.Payload, &input); err != nil {
			return nil, apperr.Validation("invalid sync payload", nil)
		}
		result, err := a.deleteVoteForActor(ctx, actor, *op.EntityID, input.Version, true)
		if err != nil {
			return nil, err
		}
		if result == nil {
			return nil, nil
		}
		return &result.PlaceVoteID, nil
	default:
		return nil, apperr.Validation("unsupported sync operation", map[string]any{"operation_type": op.OperationType})
	}
}
