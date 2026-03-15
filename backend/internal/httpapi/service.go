package httpapi

import (
	"context"
	"time"

	"wifiyka/backend/internal/models"
)

type Service interface {
	BootstrapSession(ctx context.Context, sessionToken, userAgent, ip string) (models.MeResponse, string, error)
	GetMe(ctx context.Context, sessionToken string) (models.MeResponse, error)
	StartBindEmail(ctx context.Context, sessionToken string, input models.EmailStartRequest) error
	ConfirmBindEmail(ctx context.Context, sessionToken, token, userAgent, ip string) (models.MeResponse, string, error)
	StartLogin(ctx context.Context, input models.LoginStartRequest) error
	ConfirmLogin(ctx context.Context, token, userAgent, ip string) (models.MeResponse, string, error)
	Logout(ctx context.Context, sessionToken string) error
	ListPlaces(ctx context.Context, sessionToken string, query models.PlaceQuery) ([]models.Place, error)
	NearbyPlaces(ctx context.Context, sessionToken string, query models.NearbyQuery) ([]models.Place, error)
	GetPlace(ctx context.Context, sessionToken, placeID string) (models.Place, error)
	CreatePlace(ctx context.Context, sessionToken string, input models.PlaceInput) (models.Place, error)
	UpdatePlace(ctx context.Context, sessionToken, placeID string, input models.PlacePatch) (models.Place, error)
	DeletePlace(ctx context.Context, sessionToken, placeID string, version int64) error
	UpsertVote(ctx context.Context, sessionToken, placeID string, input models.VoteInput) (models.PlaceVote, error)
	DeleteVote(ctx context.Context, sessionToken, placeID string, version int64) (models.VoteDeleteResponse, error)
	GetMyVote(ctx context.Context, sessionToken, placeID string) (models.PlaceVote, error)
	CreateReport(ctx context.Context, sessionToken, placeID string, input models.ReportInput) (models.PlaceReport, error)
	SyncOutbox(ctx context.Context, sessionToken string, input models.SyncOutboxRequest) (models.SyncOutboxResponse, error)
	SyncBootstrap(ctx context.Context, sessionToken string, query models.NearbyQuery) (models.SyncBootstrapResponse, error)
	SyncChanges(ctx context.Context, sessionToken string, since time.Time) (models.SyncChangesResponse, error)
	OfflineManifest(ctx context.Context, query models.NearbyQuery) (models.OfflineManifestResponse, error)
}
