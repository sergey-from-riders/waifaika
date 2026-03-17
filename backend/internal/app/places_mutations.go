package app

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"

	"wifiyka/backend/internal/apperr"
	"wifiyka/backend/internal/models"
)

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
