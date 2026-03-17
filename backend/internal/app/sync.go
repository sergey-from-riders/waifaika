package app

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"io/fs"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"

	"wifiyka/backend/internal/apperr"
	"wifiyka/backend/internal/models"
)

func (a *App) SyncBootstrap(ctx context.Context, sessionToken string, query models.NearbyQuery) (models.SyncBootstrapResponse, error) {
	record, err := a.loadSession(ctx, sessionToken, true)
	if err != nil {
		return models.SyncBootstrapResponse{}, err
	}
	nearby, err := a.NearbyPlaces(ctx, sessionToken, query)
	if err != nil {
		return models.SyncBootstrapResponse{}, err
	}
	myPlaces, err := a.listMyPlaces(ctx, record.User.UserID)
	if err != nil {
		return models.SyncBootstrapResponse{}, err
	}
	myVotes, err := a.listMyVotes(ctx, record.User.UserID)
	if err != nil {
		return models.SyncBootstrapResponse{}, err
	}
	offline, err := a.OfflineManifest(ctx, query)
	if err != nil {
		return models.SyncBootstrapResponse{}, err
	}
	return models.SyncBootstrapResponse{
		Me:         a.meResponse(record),
		Nearby:     nearby,
		MyPlaces:   myPlaces,
		MyVotes:    myVotes,
		Offline:    offline.Packs,
		ServerTime: time.Now().UTC(),
	}, nil
}

func (a *App) SyncChanges(ctx context.Context, sessionToken string, since time.Time) (models.SyncChangesResponse, error) {
	record, err := a.loadSession(ctx, sessionToken, false)
	if err != nil {
		return models.SyncChangesResponse{}, err
	}
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
		WHERE updated_at >= $1
		  AND status <> 'deleted'
		ORDER BY updated_at ASC
	`, since)
	if err != nil {
		return models.SyncChangesResponse{}, apperr.Internal(err)
	}
	defer rows.Close()

	places := make([]models.Place, 0)
	for rows.Next() {
		place, err := a.scanPlace(rows)
		if err != nil {
			return models.SyncChangesResponse{}, apperr.Internal(err)
		}
		places = append(places, place)
	}

	myVotes, err := a.listMyVotes(ctx, record.User.UserID)
	if err != nil {
		return models.SyncChangesResponse{}, err
	}
	filteredVotes := make([]models.PlaceVote, 0, len(myVotes))
	for _, vote := range myVotes {
		if vote.UpdatedAt.After(since) || vote.UpdatedAt.Equal(since) {
			filteredVotes = append(filteredVotes, vote)
		}
	}

	return models.SyncChangesResponse{
		Places:     places,
		MyVotes:    filteredVotes,
		ServerTime: time.Now().UTC(),
	}, nil
}

func (a *App) OfflineManifest(ctx context.Context, query models.NearbyQuery) (models.OfflineManifestResponse, error) {
	if err := a.ensureOfflinePacksDir(); err != nil {
		return models.OfflineManifestResponse{}, apperr.Internal(err)
	}
	root, err := os.OpenRoot(a.cfg.OfflinePacksDir)
	if err != nil {
		return models.OfflineManifestResponse{}, apperr.Internal(err)
	}
	defer root.Close()

	entries, err := fs.ReadDir(root.FS(), ".")
	if err != nil {
		return models.OfflineManifestResponse{}, apperr.Internal(err)
	}
	packs := make([]models.OfflinePack, 0)
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".pmtiles") {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			return models.OfflineManifestResponse{}, apperr.Internal(err)
		}
		hash, err := fileHash(root, entry.Name())
		if err != nil {
			return models.OfflineManifestResponse{}, apperr.Internal(err)
		}
		packs = append(packs, models.OfflinePack{
			PackID:      strings.TrimSuffix(entry.Name(), ".pmtiles"),
			RegionName:  strings.TrimSuffix(strings.ReplaceAll(entry.Name(), "_", " "), ".pmtiles"),
			URL:         strings.TrimRight(a.cfg.OfflinePacksBase, "/") + "/" + entry.Name(),
			SizeBytes:   info.Size(),
			VersionHash: hash,
			UpdatedAt:   info.ModTime().UTC(),
		})
	}
	return models.OfflineManifestResponse{
		Packs:      packs,
		RadiusKM:   query.RadiusKM,
		ServerTime: time.Now().UTC(),
	}, nil
}

func fileHash(root *os.Root, name string) (string, error) {
	file, err := root.Open(name)
	if err != nil {
		return "", err
	}
	defer file.Close()

	sum := sha256.New()
	if _, err := io.Copy(sum, file); err != nil {
		return "", err
	}
	return hex.EncodeToString(sum.Sum(nil)), nil
}

func isNoRows(err error) bool {
	return err == pgx.ErrNoRows
}
