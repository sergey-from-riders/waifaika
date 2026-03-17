package app

import (
	"context"
	"fmt"
	"strings"

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
