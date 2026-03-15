package app

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"wifiyka/backend/internal/apperr"
	"wifiyka/backend/internal/models"
)

func (a *App) ListPlaces(ctx context.Context, sessionToken string, query models.PlaceQuery) ([]models.Place, error) {
	var viewer *sessionRecord
	if strings.TrimSpace(sessionToken) != "" {
		record, err := a.loadSession(ctx, sessionToken, false)
		if err == nil {
			viewer = &record
		}
	}
	if query.MineOnly && viewer == nil {
		return nil, apperr.Unauthorized("session is required")
	}

	var (
		sqlBuilder strings.Builder
		args       []any
	)
	sqlBuilder.WriteString(`
		SELECT
			place_id::text,
			user_id::text,
			venue_type,
			place_name,
			wifi_name,
			description,
			promo_text,
			access_type,
			status,
			ST_Y(geom::geometry),
			ST_X(geom::geometry),
			works_count,
			not_works_count,
			last_verified_at,
			version,
			created_at,
			updated_at
		FROM places
		WHERE status = 'active'
	`)
	if query.MineOnly && viewer != nil {
		args = append(args, viewer.User.UserID)
		sqlBuilder.WriteString(fmt.Sprintf(" AND user_id = $%d", len(args)))
	}
	if query.BBox != "" {
		var minLng, minLat, maxLng, maxLat float64
		if _, err := fmt.Sscanf(query.BBox, "%f,%f,%f,%f", &minLng, &minLat, &maxLng, &maxLat); err != nil {
			return nil, apperr.Validation("bbox must be minLng,minLat,maxLng,maxLat", nil)
		}
		args = append(args, minLng, minLat, maxLng, maxLat)
		sqlBuilder.WriteString(fmt.Sprintf(" AND ST_Intersects(geom::geometry, ST_MakeEnvelope($%d, $%d, $%d, $%d, 4326))", len(args)-3, len(args)-2, len(args)-1, len(args)))
	}
	if len(query.AccessTypes) > 0 {
		filtered := make([]string, 0, len(query.AccessTypes))
		for _, item := range query.AccessTypes {
			if item = strings.TrimSpace(item); item != "" {
				filtered = append(filtered, item)
			}
		}
		if len(filtered) > 0 {
			args = append(args, filtered)
			sqlBuilder.WriteString(fmt.Sprintf(" AND access_type = ANY($%d)", len(args)))
		}
	}
	sqlBuilder.WriteString(" ORDER BY updated_at DESC LIMIT 300")

	rows, err := a.db.Query(ctx, sqlBuilder.String(), args...)
	if err != nil {
		return nil, apperr.Internal(err)
	}
	defer rows.Close()

	places := make([]models.Place, 0)
	for rows.Next() {
		place, err := a.scanPlace(rows)
		if err != nil {
			return nil, apperr.Internal(err)
		}
		places = append(places, place)
	}
	return places, nil
}

func (a *App) NearbyPlaces(ctx context.Context, sessionToken string, query models.NearbyQuery) ([]models.Place, error) {
	rows, err := a.db.Query(ctx, `
		SELECT
			place_id::text,
			user_id::text,
			venue_type,
			place_name,
			wifi_name,
			description,
			promo_text,
			access_type,
			status,
			ST_Y(geom::geometry),
			ST_X(geom::geometry),
			works_count,
			not_works_count,
			last_verified_at,
			version,
			created_at,
			updated_at
		FROM places
		WHERE status = 'active'
		  AND ST_DWithin(
		    geom,
		    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
		    $3 * 1000
		  )
		ORDER BY ST_Distance(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)
		LIMIT 250
	`, query.Lng, query.Lat, query.RadiusKM)
	if err != nil {
		return nil, apperr.Internal(err)
	}
	defer rows.Close()

	places := make([]models.Place, 0)
	for rows.Next() {
		place, err := a.scanPlace(rows)
		if err != nil {
			return nil, apperr.Internal(err)
		}
		places = append(places, place)
	}
	return places, nil
}

func (a *App) GetPlace(ctx context.Context, sessionToken, placeID string) (models.Place, error) {
	place, err := a.getPlaceByID(ctx, a.db, placeID)
	if err != nil {
		return models.Place{}, err
	}
	if strings.TrimSpace(sessionToken) == "" {
		return place, nil
	}
	record, err := a.loadSession(ctx, sessionToken, false)
	if err != nil {
		return place, nil
	}
	vote, err := a.GetMyVote(ctx, sessionToken, placeID)
	if err == nil {
		place.MyVote = &vote
	}
	_ = record
	return place, nil
}

func (a *App) CreatePlace(ctx context.Context, sessionToken string, input models.PlaceInput) (models.Place, error) {
	record, err := a.loadSession(ctx, sessionToken, true)
	if err != nil {
		return models.Place{}, err
	}
	return a.createPlaceForUser(ctx, record.User, input)
}

func (a *App) createPlaceForUser(ctx context.Context, actor models.User, input models.PlaceInput) (models.Place, error) {
	if err := validatePlaceInput(input); err != nil {
		return models.Place{}, err
	}
	if !a.limiter.Allow("place-create:"+actor.UserID, 20, 15*time.Minute) {
		return models.Place{}, apperr.RateLimited("too many create place requests")
	}
	tx, err := a.db.Begin(ctx)
	if err != nil {
		return models.Place{}, apperr.Internal(err)
	}
	defer tx.Rollback(ctx)

	if err := a.ensureNoDuplicatePlace(ctx, tx, "", input); err != nil {
		return models.Place{}, err
	}

	row := tx.QueryRow(ctx, `
		INSERT INTO places (
			place_id,
			user_id,
			venue_type,
			place_name,
			wifi_name,
			description,
			promo_text,
			access_type,
			status,
			geom,
			works_count,
			not_works_count,
			version,
			created_at,
			updated_at
		)
		VALUES (
			$1,
			$2,
			$3,
			$4,
			$5,
			$6,
			$7,
			$8,
			'active',
			ST_SetSRID(ST_MakePoint($9, $10), 4326)::geography,
			0,
			0,
			1,
			now(),
			now()
		)
		RETURNING
			place_id::text,
			user_id::text,
			venue_type,
			place_name,
			wifi_name,
			description,
			promo_text,
			access_type,
			status,
			ST_Y(geom::geometry),
			ST_X(geom::geometry),
			works_count,
			not_works_count,
			last_verified_at,
			version,
			created_at,
			updated_at
	`, uuid.New(), actor.UserID, input.VenueType, strings.TrimSpace(input.PlaceName), strings.TrimSpace(input.WifiName), input.Description, input.PromoText, input.AccessType, input.Lng, input.Lat)
	place, err := a.scanPlace(row)
	if err != nil {
		return models.Place{}, apperr.Internal(err)
	}
	if err := a.writePlaceVersion(ctx, tx, place, "insert", &actor.UserID); err != nil {
		return models.Place{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return models.Place{}, apperr.Internal(err)
	}
	return place, nil
}

func (a *App) UpdatePlace(ctx context.Context, sessionToken, placeID string, input models.PlacePatch) (models.Place, error) {
	record, err := a.loadSession(ctx, sessionToken, true)
	if err != nil {
		return models.Place{}, err
	}
	tx, err := a.db.Begin(ctx)
	if err != nil {
		return models.Place{}, apperr.Internal(err)
	}
	defer tx.Rollback(ctx)

	current, err := a.getPlaceByIDForUpdate(ctx, tx, placeID)
	if err != nil {
		return models.Place{}, err
	}
	if current.UserID != record.User.UserID && !contains([]string{"moderator", "admin"}, record.User.UserType) {
		return models.Place{}, apperr.Forbidden("you cannot edit this place")
	}
	if current.Version != input.Version {
		return models.Place{}, apperr.Conflict("version_conflict", "place version does not match")
	}

	next := current
	if input.VenueType != nil {
		next.VenueType = strings.TrimSpace(*input.VenueType)
	}
	if input.PlaceName != nil {
		next.PlaceName = strings.TrimSpace(*input.PlaceName)
	}
	if input.WifiName != nil {
		next.WifiName = strings.TrimSpace(*input.WifiName)
	}
	if input.Description != nil {
		next.Description = input.Description
	}
	if input.PromoText != nil {
		next.PromoText = input.PromoText
	}
	if input.AccessType != nil {
		next.AccessType = strings.TrimSpace(*input.AccessType)
	}
	if input.Lat != nil {
		next.Lat = *input.Lat
	}
	if input.Lng != nil {
		next.Lng = *input.Lng
	}
	if err := validatePlaceInput(models.PlaceInput{
		VenueType:   next.VenueType,
		PlaceName:   next.PlaceName,
		WifiName:    next.WifiName,
		Description: next.Description,
		PromoText:   next.PromoText,
		AccessType:  next.AccessType,
		Lat:         next.Lat,
		Lng:         next.Lng,
	}); err != nil {
		return models.Place{}, err
	}
	if err := a.ensureNoDuplicatePlace(ctx, tx, placeID, models.PlaceInput{
		VenueType:   next.VenueType,
		PlaceName:   next.PlaceName,
		WifiName:    next.WifiName,
		Description: next.Description,
		PromoText:   next.PromoText,
		AccessType:  next.AccessType,
		Lat:         next.Lat,
		Lng:         next.Lng,
	}); err != nil {
		return models.Place{}, err
	}

	row := tx.QueryRow(ctx, `
		UPDATE places
		SET venue_type = $2,
			place_name = $3,
			wifi_name = $4,
			description = $5,
			promo_text = $6,
			access_type = $7,
			geom = ST_SetSRID(ST_MakePoint($8, $9), 4326)::geography,
			version = version + 1,
			updated_at = now()
		WHERE place_id = $1
		RETURNING
			place_id::text,
			user_id::text,
			venue_type,
			place_name,
			wifi_name,
			description,
			promo_text,
			access_type,
			status,
			ST_Y(geom::geometry),
			ST_X(geom::geometry),
			works_count,
			not_works_count,
			last_verified_at,
			version,
			created_at,
			updated_at
	`, placeID, next.VenueType, next.PlaceName, next.WifiName, next.Description, next.PromoText, next.AccessType, next.Lng, next.Lat)
	updated, err := a.scanPlace(row)
	if err != nil {
		return models.Place{}, apperr.Internal(err)
	}
	if err := a.writePlaceVersion(ctx, tx, updated, "update", &record.User.UserID); err != nil {
		return models.Place{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return models.Place{}, apperr.Internal(err)
	}
	return updated, nil
}

func (a *App) DeletePlace(ctx context.Context, sessionToken, placeID string, version int64) error {
	record, err := a.loadSession(ctx, sessionToken, true)
	if err != nil {
		return err
	}
	tx, err := a.db.Begin(ctx)
	if err != nil {
		return apperr.Internal(err)
	}
	defer tx.Rollback(ctx)

	current, err := a.getPlaceByIDForUpdate(ctx, tx, placeID)
	if err != nil {
		return err
	}
	if current.UserID != record.User.UserID && !contains([]string{"moderator", "admin"}, record.User.UserType) {
		return apperr.Forbidden("you cannot delete this place")
	}
	if current.Version != version {
		return apperr.Conflict("version_conflict", "place version does not match")
	}
	deleted, err := a.scanPlace(tx.QueryRow(ctx, `
		UPDATE places
		SET status = 'deleted',
			version = version + 1,
			updated_at = now()
		WHERE place_id = $1
		RETURNING
			place_id::text,
			user_id::text,
			venue_type,
			place_name,
			wifi_name,
			description,
			promo_text,
			access_type,
			status,
			ST_Y(geom::geometry),
			ST_X(geom::geometry),
			works_count,
			not_works_count,
			last_verified_at,
			version,
			created_at,
			updated_at
	`, placeID))
	if err != nil {
		return apperr.Internal(err)
	}
	if err := a.writePlaceVersion(ctx, tx, deleted, "delete", &record.User.UserID); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return apperr.Internal(err)
	}
	return nil
}

func (a *App) UpsertVote(ctx context.Context, sessionToken, placeID string, input models.VoteInput) (models.PlaceVote, error) {
	record, err := a.loadSession(ctx, sessionToken, true)
	if err != nil {
		return models.PlaceVote{}, err
	}
	if err := validateVote(input.Vote); err != nil {
		return models.PlaceVote{}, err
	}

	tx, err := a.db.Begin(ctx)
	if err != nil {
		return models.PlaceVote{}, apperr.Internal(err)
	}
	defer tx.Rollback(ctx)

	place, err := a.getPlaceByIDForUpdate(ctx, tx, placeID)
	if err != nil {
		return models.PlaceVote{}, err
	}
	if place.Status != "active" {
		return models.PlaceVote{}, apperr.NotFound("place not found")
	}

	var existing models.PlaceVote
	err = tx.QueryRow(ctx, `
		SELECT place_vote_id::text, place_id::text, user_id::text, vote, version, created_at, updated_at
		FROM place_votes
		WHERE place_id = $1 AND user_id = $2
		FOR UPDATE
	`, placeID, record.User.UserID).Scan(
		&existing.PlaceVoteID,
		&existing.PlaceID,
		&existing.UserID,
		&existing.Vote,
		&existing.Version,
		&existing.CreatedAt,
		&existing.UpdatedAt,
	)
	action := "insert"
	worksDelta := 0
	notWorksDelta := 0
	var vote models.PlaceVote

	switch {
	case err == pgx.ErrNoRows:
		vote, err = a.scanVote(tx.QueryRow(ctx, `
			INSERT INTO place_votes (
				place_vote_id,
				place_id,
				user_id,
				vote,
				version,
				created_at,
				updated_at
			)
			VALUES ($1, $2, $3, $4, 1, now(), now())
			RETURNING place_vote_id::text, place_id::text, user_id::text, vote, version, created_at, updated_at
		`, uuid.New(), placeID, record.User.UserID, input.Vote))
		if err != nil {
			return models.PlaceVote{}, apperr.Internal(err)
		}
		if input.Vote == "works" {
			worksDelta = 1
		} else {
			notWorksDelta = 1
		}
	case err != nil:
		return models.PlaceVote{}, apperr.Internal(err)
	default:
		if input.Version != nil && existing.Version != *input.Version {
			return models.PlaceVote{}, apperr.Conflict("version_conflict", "vote version does not match")
		}
		if existing.Vote == input.Vote {
			return existing, nil
		}
		action = "update"
		if existing.Vote == "works" {
			worksDelta--
		} else {
			notWorksDelta--
		}
		if input.Vote == "works" {
			worksDelta++
		} else {
			notWorksDelta++
		}
		vote, err = a.scanVote(tx.QueryRow(ctx, `
			UPDATE place_votes
			SET vote = $2,
				version = version + 1,
				updated_at = now()
			WHERE place_vote_id = $1
			RETURNING place_vote_id::text, place_id::text, user_id::text, vote, version, created_at, updated_at
		`, existing.PlaceVoteID, input.Vote))
		if err != nil {
			return models.PlaceVote{}, apperr.Internal(err)
		}
	}

	place, err = a.scanPlace(tx.QueryRow(ctx, `
		UPDATE places
		SET works_count = GREATEST(0, works_count + $2),
			not_works_count = GREATEST(0, not_works_count + $3),
			last_verified_at = now(),
			version = version + 1,
			updated_at = now()
		WHERE place_id = $1
		RETURNING
			place_id::text,
			user_id::text,
			venue_type,
			place_name,
			wifi_name,
			description,
			promo_text,
			access_type,
			status,
			ST_Y(geom::geometry),
			ST_X(geom::geometry),
			works_count,
			not_works_count,
			last_verified_at,
			version,
			created_at,
			updated_at
	`, placeID, worksDelta, notWorksDelta))
	if err != nil {
		return models.PlaceVote{}, apperr.Internal(err)
	}

	if err := a.writeVoteVersion(ctx, tx, vote, action, &record.User.UserID); err != nil {
		return models.PlaceVote{}, err
	}
	if err := a.writePlaceVersion(ctx, tx, place, "update", &record.User.UserID); err != nil {
		return models.PlaceVote{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return models.PlaceVote{}, apperr.Internal(err)
	}
	return vote, nil
}

func (a *App) DeleteVote(ctx context.Context, sessionToken, placeID string, version int64) (models.VoteDeleteResponse, error) {
	record, err := a.loadSession(ctx, sessionToken, true)
	if err != nil {
		return models.VoteDeleteResponse{}, err
	}

	result, err := a.deleteVoteForActor(ctx, record.User, placeID, version, false)
	if err != nil {
		return models.VoteDeleteResponse{}, err
	}
	if result == nil {
		return models.VoteDeleteResponse{}, apperr.NotFound("vote not found")
	}
	return *result, nil
}

func (a *App) GetMyVote(ctx context.Context, sessionToken, placeID string) (models.PlaceVote, error) {
	record, err := a.loadSession(ctx, sessionToken, false)
	if err != nil {
		return models.PlaceVote{}, err
	}
	vote, err := a.scanVote(a.db.QueryRow(ctx, `
		SELECT place_vote_id::text, place_id::text, user_id::text, vote, version, created_at, updated_at
		FROM place_votes
		WHERE place_id = $1 AND user_id = $2
	`, placeID, record.User.UserID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return models.PlaceVote{}, apperr.NotFound("vote not found")
		}
		return models.PlaceVote{}, apperr.Internal(err)
	}
	return vote, nil
}

func (a *App) CreateReport(ctx context.Context, sessionToken, placeID string, input models.ReportInput) (models.PlaceReport, error) {
	record, err := a.loadSession(ctx, sessionToken, true)
	if err != nil {
		return models.PlaceReport{}, err
	}
	if !contains([]string{"spam", "double", "wrong_location", "closed", "other"}, input.Reason) {
		return models.PlaceReport{}, apperr.Validation("unsupported reason", map[string]any{"field": "reason"})
	}
	if !a.limiter.Allow("report:"+record.User.UserID, 15, 10*time.Minute) {
		return models.PlaceReport{}, apperr.RateLimited("too many reports")
	}
	var report models.PlaceReport
	err = a.db.QueryRow(ctx, `
		INSERT INTO place_reports (
			place_report_id,
			place_id,
			user_id,
			reason,
			comment,
			created_at
		)
		VALUES ($1, $2, $3, $4, $5, now())
		RETURNING place_report_id::text, place_id::text, user_id::text, reason, comment, created_at
	`, uuid.New(), placeID, record.User.UserID, input.Reason, input.Comment).Scan(
		&report.PlaceReportID,
		&report.PlaceID,
		&report.UserID,
		&report.Reason,
		&report.Comment,
		&report.CreatedAt,
	)
	if err != nil {
		return models.PlaceReport{}, apperr.Internal(err)
	}
	return report, nil
}

func (a *App) getPlaceByID(ctx context.Context, q interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}, placeID string) (models.Place, error) {
	place, err := a.scanPlace(q.QueryRow(ctx, `
		SELECT
			place_id::text,
			user_id::text,
			venue_type,
			place_name,
			wifi_name,
			description,
			promo_text,
			access_type,
			status,
			ST_Y(geom::geometry),
			ST_X(geom::geometry),
			works_count,
			not_works_count,
			last_verified_at,
			version,
			created_at,
			updated_at
		FROM places
		WHERE place_id = $1 AND status <> 'deleted'
	`, placeID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return models.Place{}, apperr.NotFound("place not found")
		}
		return models.Place{}, apperr.Internal(err)
	}
	return place, nil
}

func (a *App) getPlaceByIDForUpdate(ctx context.Context, tx pgx.Tx, placeID string) (models.Place, error) {
	place, err := a.scanPlace(tx.QueryRow(ctx, `
		SELECT
			place_id::text,
			user_id::text,
			venue_type,
			place_name,
			wifi_name,
			description,
			promo_text,
			access_type,
			status,
			ST_Y(geom::geometry),
			ST_X(geom::geometry),
			works_count,
			not_works_count,
			last_verified_at,
			version,
			created_at,
			updated_at
		FROM places
		WHERE place_id = $1
		FOR UPDATE
	`, placeID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return models.Place{}, apperr.NotFound("place not found")
		}
		return models.Place{}, apperr.Internal(err)
	}
	return place, nil
}

func (a *App) ensureNoDuplicatePlace(ctx context.Context, tx pgx.Tx, exceptPlaceID string, input models.PlaceInput) error {
	var found string
	err := tx.QueryRow(ctx, `
		SELECT place_id::text
		FROM places
		WHERE status = 'active'
		  AND lower(place_name) = lower($1)
		  AND ST_DWithin(geom, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, 50)
		  AND ($4 = '' OR place_id::text <> $4)
		LIMIT 1
	`, input.PlaceName, input.Lng, input.Lat, exceptPlaceID).Scan(&found)
	if err == nil {
		return apperr.Conflict("duplicate_place", "similar place already exists nearby")
	}
	if err == pgx.ErrNoRows {
		return nil
	}
	return apperr.Internal(err)
}

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

func (a *App) deletePlaceAsActor(ctx context.Context, actor models.User, placeID string, version int64) error {
	tx, err := a.db.Begin(ctx)
	if err != nil {
		return apperr.Internal(err)
	}
	defer tx.Rollback(ctx)

	current, err := a.getPlaceByIDForUpdate(ctx, tx, placeID)
	if err != nil {
		return err
	}
	if current.UserID != actor.UserID && !contains([]string{"moderator", "admin"}, actor.UserType) {
		return apperr.Forbidden("you cannot delete this place")
	}
	if current.Version != version {
		return apperr.Conflict("version_conflict", "place version does not match")
	}
	deleted, err := a.scanPlace(tx.QueryRow(ctx, `
		UPDATE places
		SET status = 'deleted', version = version + 1, updated_at = now()
		WHERE place_id = $1
		RETURNING
			place_id::text, user_id::text, venue_type, place_name, wifi_name, description, promo_text,
			access_type, status, ST_Y(geom::geometry), ST_X(geom::geometry), works_count, not_works_count,
			last_verified_at, version, created_at, updated_at
	`, placeID))
	if err != nil {
		return apperr.Internal(err)
	}
	if err := a.writePlaceVersion(ctx, tx, deleted, "delete", &actor.UserID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (a *App) upsertVoteAsActor(ctx context.Context, actor models.User, placeID string, input models.VoteInput) (models.PlaceVote, error) {
	if err := validateVote(input.Vote); err != nil {
		return models.PlaceVote{}, err
	}
	tx, err := a.db.Begin(ctx)
	if err != nil {
		return models.PlaceVote{}, apperr.Internal(err)
	}
	defer tx.Rollback(ctx)

	place, err := a.getPlaceByIDForUpdate(ctx, tx, placeID)
	if err != nil {
		return models.PlaceVote{}, err
	}
	if place.Status != "active" {
		return models.PlaceVote{}, apperr.NotFound("place not found")
	}

	var existing models.PlaceVote
	err = tx.QueryRow(ctx, `
		SELECT place_vote_id::text, place_id::text, user_id::text, vote, version, created_at, updated_at
		FROM place_votes
		WHERE place_id = $1 AND user_id = $2
		FOR UPDATE
	`, placeID, actor.UserID).Scan(
		&existing.PlaceVoteID,
		&existing.PlaceID,
		&existing.UserID,
		&existing.Vote,
		&existing.Version,
		&existing.CreatedAt,
		&existing.UpdatedAt,
	)
	action := "insert"
	worksDelta := 0
	notWorksDelta := 0
	var vote models.PlaceVote

	switch {
	case err == pgx.ErrNoRows:
		vote, err = a.scanVote(tx.QueryRow(ctx, `
			INSERT INTO place_votes (
				place_vote_id, place_id, user_id, vote, version, created_at, updated_at
			)
			VALUES ($1, $2, $3, $4, 1, now(), now())
			RETURNING place_vote_id::text, place_id::text, user_id::text, vote, version, created_at, updated_at
		`, uuid.New(), placeID, actor.UserID, input.Vote))
		if err != nil {
			return models.PlaceVote{}, apperr.Internal(err)
		}
		if input.Vote == "works" {
			worksDelta = 1
		} else {
			notWorksDelta = 1
		}
	case err != nil:
		return models.PlaceVote{}, apperr.Internal(err)
	default:
		if input.Version != nil && existing.Version != *input.Version {
			return models.PlaceVote{}, apperr.Conflict("version_conflict", "vote version does not match")
		}
		if existing.Vote == input.Vote {
			return existing, nil
		}
		action = "update"
		if existing.Vote == "works" {
			worksDelta--
		} else {
			notWorksDelta--
		}
		if input.Vote == "works" {
			worksDelta++
		} else {
			notWorksDelta++
		}
		vote, err = a.scanVote(tx.QueryRow(ctx, `
			UPDATE place_votes
			SET vote = $2, version = version + 1, updated_at = now()
			WHERE place_vote_id = $1
			RETURNING place_vote_id::text, place_id::text, user_id::text, vote, version, created_at, updated_at
		`, existing.PlaceVoteID, input.Vote))
		if err != nil {
			return models.PlaceVote{}, apperr.Internal(err)
		}
	}

	place, err = a.scanPlace(tx.QueryRow(ctx, `
		UPDATE places
		SET works_count = GREATEST(0, works_count + $2),
			not_works_count = GREATEST(0, not_works_count + $3),
			last_verified_at = now(),
			version = version + 1,
			updated_at = now()
		WHERE place_id = $1
		RETURNING
			place_id::text, user_id::text, venue_type, place_name, wifi_name, description, promo_text,
			access_type, status, ST_Y(geom::geometry), ST_X(geom::geometry), works_count, not_works_count,
			last_verified_at, version, created_at, updated_at
	`, placeID, worksDelta, notWorksDelta))
	if err != nil {
		return models.PlaceVote{}, apperr.Internal(err)
	}
	if err := a.writeVoteVersion(ctx, tx, vote, action, &actor.UserID); err != nil {
		return models.PlaceVote{}, err
	}
	if err := a.writePlaceVersion(ctx, tx, place, "update", &actor.UserID); err != nil {
		return models.PlaceVote{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return models.PlaceVote{}, apperr.Internal(err)
	}
	return vote, nil
}

func (a *App) deleteVoteForActor(ctx context.Context, actor models.User, placeID string, version int64, idempotentMissing bool) (*models.VoteDeleteResponse, error) {
	tx, err := a.db.Begin(ctx)
	if err != nil {
		return nil, apperr.Internal(err)
	}
	defer tx.Rollback(ctx)

	place, err := a.getPlaceByIDForUpdate(ctx, tx, placeID)
	if err != nil {
		return nil, err
	}
	if place.Status != "active" {
		return nil, apperr.NotFound("place not found")
	}

	var existing models.PlaceVote
	err = tx.QueryRow(ctx, `
		SELECT place_vote_id::text, place_id::text, user_id::text, vote, version, created_at, updated_at
		FROM place_votes
		WHERE place_id = $1 AND user_id = $2
		FOR UPDATE
	`, placeID, actor.UserID).Scan(
		&existing.PlaceVoteID,
		&existing.PlaceID,
		&existing.UserID,
		&existing.Vote,
		&existing.Version,
		&existing.CreatedAt,
		&existing.UpdatedAt,
	)
	switch {
	case err == pgx.ErrNoRows:
		if idempotentMissing {
			if commitErr := tx.Commit(ctx); commitErr != nil {
				return nil, apperr.Internal(commitErr)
			}
			return nil, nil
		}
		return nil, apperr.NotFound("vote not found")
	case err != nil:
		return nil, apperr.Internal(err)
	}

	if existing.Version != version {
		return nil, apperr.Conflict("version_conflict", "vote version does not match")
	}

	deletedVote := existing
	deletedVote.Version++
	deletedVote.UpdatedAt = time.Now().UTC()

	if _, err := tx.Exec(ctx, `
		DELETE FROM place_votes
		WHERE place_vote_id = $1
	`, existing.PlaceVoteID); err != nil {
		return nil, apperr.Internal(err)
	}

	worksDelta := 0
	notWorksDelta := 0
	if existing.Vote == "works" {
		worksDelta = -1
	} else {
		notWorksDelta = -1
	}

	place, err = a.scanPlace(tx.QueryRow(ctx, `
		UPDATE places
		SET works_count = GREATEST(0, works_count + $2),
			not_works_count = GREATEST(0, not_works_count + $3),
			last_verified_at = now(),
			version = version + 1,
			updated_at = now()
		WHERE place_id = $1
		RETURNING
			place_id::text, user_id::text, venue_type, place_name, wifi_name, description, promo_text,
			access_type, status, ST_Y(geom::geometry), ST_X(geom::geometry), works_count, not_works_count,
			last_verified_at, version, created_at, updated_at
	`, placeID, worksDelta, notWorksDelta))
	if err != nil {
		return nil, apperr.Internal(err)
	}

	if err := a.writeVoteVersion(ctx, tx, deletedVote, "delete", &actor.UserID); err != nil {
		return nil, err
	}
	if err := a.writePlaceVersion(ctx, tx, place, "update", &actor.UserID); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, apperr.Internal(err)
	}

	return &models.VoteDeleteResponse{
		Status:      "deleted",
		PlaceID:     placeID,
		PlaceVoteID: existing.PlaceVoteID,
	}, nil
}

func (a *App) updatePlaceAsActor(ctx context.Context, actor models.User, placeID string, input models.PlacePatch) (models.Place, error) {
	tx, err := a.db.Begin(ctx)
	if err != nil {
		return models.Place{}, apperr.Internal(err)
	}
	defer tx.Rollback(ctx)

	current, err := a.getPlaceByIDForUpdate(ctx, tx, placeID)
	if err != nil {
		return models.Place{}, err
	}
	if current.UserID != actor.UserID && !contains([]string{"moderator", "admin"}, actor.UserType) {
		return models.Place{}, apperr.Forbidden("you cannot edit this place")
	}
	if current.Version != input.Version {
		return models.Place{}, apperr.Conflict("version_conflict", "place version does not match")
	}

	next := current
	if input.VenueType != nil {
		next.VenueType = strings.TrimSpace(*input.VenueType)
	}
	if input.PlaceName != nil {
		next.PlaceName = strings.TrimSpace(*input.PlaceName)
	}
	if input.WifiName != nil {
		next.WifiName = strings.TrimSpace(*input.WifiName)
	}
	if input.Description != nil {
		next.Description = input.Description
	}
	if input.PromoText != nil {
		next.PromoText = input.PromoText
	}
	if input.AccessType != nil {
		next.AccessType = strings.TrimSpace(*input.AccessType)
	}
	if input.Lat != nil {
		next.Lat = *input.Lat
	}
	if input.Lng != nil {
		next.Lng = *input.Lng
	}
	if err := validatePlaceInput(models.PlaceInput{
		VenueType:   next.VenueType,
		PlaceName:   next.PlaceName,
		WifiName:    next.WifiName,
		Description: next.Description,
		PromoText:   next.PromoText,
		AccessType:  next.AccessType,
		Lat:         next.Lat,
		Lng:         next.Lng,
	}); err != nil {
		return models.Place{}, err
	}
	if err := a.ensureNoDuplicatePlace(ctx, tx, placeID, models.PlaceInput{
		VenueType:   next.VenueType,
		PlaceName:   next.PlaceName,
		WifiName:    next.WifiName,
		Description: next.Description,
		PromoText:   next.PromoText,
		AccessType:  next.AccessType,
		Lat:         next.Lat,
		Lng:         next.Lng,
	}); err != nil {
		return models.Place{}, err
	}

	updated, err := a.scanPlace(tx.QueryRow(ctx, `
		UPDATE places
		SET venue_type = $2,
			place_name = $3,
			wifi_name = $4,
			description = $5,
			promo_text = $6,
			access_type = $7,
			geom = ST_SetSRID(ST_MakePoint($8, $9), 4326)::geography,
			version = version + 1,
			updated_at = now()
		WHERE place_id = $1
		RETURNING
			place_id::text, user_id::text, venue_type, place_name, wifi_name, description, promo_text,
			access_type, status, ST_Y(geom::geometry), ST_X(geom::geometry), works_count, not_works_count,
			last_verified_at, version, created_at, updated_at
	`, placeID, next.VenueType, next.PlaceName, next.WifiName, next.Description, next.PromoText, next.AccessType, next.Lng, next.Lat))
	if err != nil {
		return models.Place{}, apperr.Internal(err)
	}
	if err := a.writePlaceVersion(ctx, tx, updated, "update", &actor.UserID); err != nil {
		return models.Place{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return models.Place{}, apperr.Internal(err)
	}
	return updated, nil
}
