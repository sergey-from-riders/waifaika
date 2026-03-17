package app

import (
	"context"
	"encoding/json"
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

	results := make([]models.SyncOperationResult, 0, len(input.Operations))
	for _, op := range input.Operations {
		result := models.SyncOperationResult{
			ClientOperationID: op.ClientOperationID,
			Status:            "applied",
		}

		var existingStatus string
		var existingEntityID *string
		var existingMessage *string
		err := a.db.QueryRow(ctx, `
			SELECT status, entity_id::text, error_message
			FROM sync_operations
			WHERE user_id = $1 AND client_operation_id = $2
		`, record.User.UserID, op.ClientOperationID).Scan(&existingStatus, &existingEntityID, &existingMessage)
		if err == nil {
			result.Status = existingStatus
			result.EntityID = existingEntityID
			result.ErrorMessage = existingMessage
			results = append(results, result)
			continue
		}
		if err != nil && err != pgx.ErrNoRows {
			return models.SyncOutboxResponse{}, apperr.Internal(err)
		}

		payload := op.Payload
		_, err = a.db.Exec(ctx, `
			INSERT INTO sync_operations (
				sync_operation_id,
				user_id,
				client_operation_id,
				entity_type,
				entity_id,
				operation_type,
				payload,
				status,
				created_at
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', now())
		`, uuid.New(), record.User.UserID, op.ClientOperationID, op.EntityType, op.EntityID, op.OperationType, payload)
		if err != nil {
			return models.SyncOutboxResponse{}, apperr.Internal(err)
		}

		entityID, applyErr := a.applySyncOperation(ctx, record.User, op)
		if applyErr != nil {
			errorCode := "sync_conflict"
			status := "failed"
			if apiErr, ok := applyErr.(*apperr.Error); ok {
				errorCode = apiErr.Code
				if apiErr.Code == "version_conflict" {
					status = "conflict"
				}
			}
			message := applyErr.Error()
			result.Status = status
			result.ErrorCode = &errorCode
			result.ErrorMessage = &message
			_, _ = a.db.Exec(ctx, `
				UPDATE sync_operations
				SET status = $3, error_message = $4
				WHERE user_id = $1 AND client_operation_id = $2
			`, record.User.UserID, op.ClientOperationID, status, message)
			results = append(results, result)
			continue
		}

		result.EntityID = entityID
		_, err = a.db.Exec(ctx, `
			UPDATE sync_operations
			SET status = 'applied', entity_id = $3, error_message = NULL
			WHERE user_id = $1 AND client_operation_id = $2
		`, record.User.UserID, op.ClientOperationID, entityID)
		if err != nil {
			return models.SyncOutboxResponse{}, apperr.Internal(err)
		}
		results = append(results, result)
	}

	return models.SyncOutboxResponse{
		Results:    results,
		ServerTime: time.Now().UTC(),
	}, nil
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
