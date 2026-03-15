package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"wifiyka/backend/internal/apperr"
	"wifiyka/backend/internal/models"
)

type stubService struct {
	bootstrap  func(context.Context, string, string, string) (models.MeResponse, string, error)
	me         func(context.Context, string) (models.MeResponse, error)
	deleteVote func(context.Context, string, string, int64) (models.VoteDeleteResponse, error)
}

func (s stubService) BootstrapSession(ctx context.Context, sessionToken, userAgent, ip string) (models.MeResponse, string, error) {
	if s.bootstrap != nil {
		return s.bootstrap(ctx, sessionToken, userAgent, ip)
	}
	return models.MeResponse{}, "", errors.New("not implemented")
}

func (s stubService) GetMe(ctx context.Context, sessionToken string) (models.MeResponse, error) {
	if s.me != nil {
		return s.me(ctx, sessionToken)
	}
	return models.MeResponse{}, errors.New("not implemented")
}

func (s stubService) StartBindEmail(context.Context, string, models.EmailStartRequest) error {
	return nil
}
func (s stubService) ConfirmBindEmail(context.Context, string, string, string, string) (models.MeResponse, string, error) {
	return models.MeResponse{}, "", nil
}
func (s stubService) StartLogin(context.Context, models.LoginStartRequest) error { return nil }
func (s stubService) ConfirmLogin(context.Context, string, string, string) (models.MeResponse, string, error) {
	return models.MeResponse{}, "", nil
}
func (s stubService) Logout(context.Context, string) error { return nil }
func (s stubService) ListPlaces(context.Context, string, models.PlaceQuery) ([]models.Place, error) {
	return nil, nil
}
func (s stubService) NearbyPlaces(context.Context, string, models.NearbyQuery) ([]models.Place, error) {
	return nil, nil
}
func (s stubService) GetPlace(context.Context, string, string) (models.Place, error) {
	return models.Place{}, nil
}
func (s stubService) CreatePlace(context.Context, string, models.PlaceInput) (models.Place, error) {
	return models.Place{}, nil
}
func (s stubService) UpdatePlace(context.Context, string, string, models.PlacePatch) (models.Place, error) {
	return models.Place{}, nil
}
func (s stubService) DeletePlace(context.Context, string, string, int64) error { return nil }
func (s stubService) UpsertVote(context.Context, string, string, models.VoteInput) (models.PlaceVote, error) {
	return models.PlaceVote{}, nil
}
func (s stubService) DeleteVote(ctx context.Context, sessionToken, placeID string, version int64) (models.VoteDeleteResponse, error) {
	if s.deleteVote != nil {
		return s.deleteVote(ctx, sessionToken, placeID, version)
	}
	return models.VoteDeleteResponse{}, nil
}
func (s stubService) GetMyVote(context.Context, string, string) (models.PlaceVote, error) {
	return models.PlaceVote{}, nil
}
func (s stubService) CreateReport(context.Context, string, string, models.ReportInput) (models.PlaceReport, error) {
	return models.PlaceReport{}, nil
}
func (s stubService) SyncOutbox(context.Context, string, models.SyncOutboxRequest) (models.SyncOutboxResponse, error) {
	return models.SyncOutboxResponse{}, nil
}
func (s stubService) SyncBootstrap(context.Context, string, models.NearbyQuery) (models.SyncBootstrapResponse, error) {
	return models.SyncBootstrapResponse{}, nil
}
func (s stubService) SyncChanges(context.Context, string, time.Time) (models.SyncChangesResponse, error) {
	return models.SyncChangesResponse{}, nil
}
func (s stubService) OfflineManifest(context.Context, models.NearbyQuery) (models.OfflineManifestResponse, error) {
	return models.OfflineManifestResponse{}, nil
}

func TestBootstrapSessionSetsCookie(t *testing.T) {
	service := stubService{
		bootstrap: func(context.Context, string, string, string) (models.MeResponse, string, error) {
			return models.MeResponse{
				User: models.User{UserID: "u-1", UserType: "anonymous", IsActive: true, Version: 1},
				Session: models.SessionSummary{
					SessionID:  "s-1",
					ExpiresAt:  time.Now().Add(time.Hour),
					CookieName: "v_session",
				},
			}, "raw-token", nil
		},
	}
	router := New(service, nil, nil, "v_session", true)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/session/bootstrap", http.NoBody)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	cookies := rec.Result().Cookies()
	if len(cookies) == 0 || cookies[0].Name != "v_session" || cookies[0].Value != "raw-token" {
		t.Fatalf("expected session cookie to be set, got %#v", cookies)
	}
}

func TestMeReturnsErrorShape(t *testing.T) {
	service := stubService{
		me: func(context.Context, string) (models.MeResponse, error) {
			return models.MeResponse{}, apperr.Unauthorized("session is required")
		},
	}
	router := New(service, nil, nil, "v_session", true)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/me", http.NoBody)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
	var payload map[string]any
	if err := json.NewDecoder(bytes.NewReader(rec.Body.Bytes())).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if _, ok := payload["request_id"]; !ok {
		t.Fatalf("expected request_id in error payload")
	}
	errorShape, ok := payload["error"].(map[string]any)
	if !ok || errorShape["code"] != "unauthorized" {
		t.Fatalf("unexpected error payload: %#v", payload)
	}
}

func TestOfflineManifestValidation(t *testing.T) {
	router := New(stubService{}, nil, nil, "v_session", false)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/offline/manifest", http.NoBody)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestDeleteVoteRoute(t *testing.T) {
	service := stubService{
		deleteVote: func(_ context.Context, sessionToken, placeID string, version int64) (models.VoteDeleteResponse, error) {
			if sessionToken != "token-1" {
				t.Fatalf("expected session token, got %q", sessionToken)
			}
			if placeID != "place-1" {
				t.Fatalf("expected place id place-1, got %q", placeID)
			}
			if version != 3 {
				t.Fatalf("expected version 3, got %d", version)
			}
			return models.VoteDeleteResponse{
				Status:      "deleted",
				PlaceID:     placeID,
				PlaceVoteID: "vote-1",
			}, nil
		},
	}
	router := New(service, nil, nil, "v_session", true)

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/places/place-1/vote", bytes.NewBufferString(`{"version":3}`))
	req.AddCookie(&http.Cookie{Name: "v_session", Value: "token-1"})
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var payload models.VoteDeleteResponse
	if err := json.NewDecoder(bytes.NewReader(rec.Body.Bytes())).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.Status != "deleted" || payload.PlaceID != "place-1" || payload.PlaceVoteID != "vote-1" {
		t.Fatalf("unexpected payload: %#v", payload)
	}
}

func TestDeleteVoteValidation(t *testing.T) {
	router := New(stubService{}, nil, nil, "v_session", false)
	req := httptest.NewRequest(http.MethodDelete, "/api/v1/places/place-1/vote", bytes.NewBufferString(`{}`))
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}
