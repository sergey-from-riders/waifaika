package app

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"wifiyka/backend/internal/apperr"
	"wifiyka/backend/internal/models"
)

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
