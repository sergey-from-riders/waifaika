package httpapi

import (
	"encoding/json"
	"errors"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"wifiyka/backend/internal/apperr"
	"wifiyka/backend/internal/models"
)

type Router struct {
	service      Service
	staticRoot   http.Handler
	offlinePacks http.Handler
	cookieName   string
	secure       bool
}

func New(service Service, staticRoot http.Handler, offlinePacks http.Handler, cookieName string, secure bool) http.Handler {
	rt := &Router{
		service:      service,
		staticRoot:   staticRoot,
		offlinePacks: offlinePacks,
		cookieName:   cookieName,
		secure:       secure,
	}

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Compress(5))
	r.Use(middleware.Timeout(30 * time.Second))
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Permissions-Policy", "geolocation=(self)")
			next.ServeHTTP(w, r)
		})
	})

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, r, http.StatusOK, map[string]any{"status": "ok"})
	})
	r.Get("/readyz", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, r, http.StatusOK, map[string]any{"status": "ready"})
	})

	r.Route("/api/v1", func(api chi.Router) {
		api.Post("/session/bootstrap", rt.bootstrapSession)
		api.Get("/me", rt.me)
		api.Post("/auth/email/start-bind", rt.startBindEmail)
		api.Post("/auth/email/confirm-bind", rt.confirmBindEmail)
		api.Post("/auth/email/start-login", rt.startLogin)
		api.Post("/auth/email/confirm-login", rt.confirmLogin)
		api.Post("/auth/logout", rt.logout)

		api.Get("/places", rt.listPlaces)
		api.Get("/places/nearby", rt.nearbyPlaces)
		api.Post("/places", rt.createPlace)
		api.Get("/places/{placeID}", rt.getPlace)
		api.Patch("/places/{placeID}", rt.updatePlace)
		api.Delete("/places/{placeID}", rt.deletePlace)
		api.Post("/places/{placeID}/vote", rt.vote)
		api.Delete("/places/{placeID}/vote", rt.deleteVote)
		api.Get("/places/{placeID}/my-vote", rt.myVote)
		api.Post("/places/{placeID}/report", rt.report)

		api.Post("/sync/outbox", rt.syncOutbox)
		api.Get("/sync/bootstrap", rt.syncBootstrap)
		api.Get("/sync/changes", rt.syncChanges)

		api.Get("/offline/manifest", rt.offlineManifest)
	})

	if offlinePacks != nil {
		r.Handle("/offline-packs/*", http.StripPrefix("/offline-packs/", offlinePacks))
	}
	if staticRoot != nil {
		r.Handle("/*", staticRoot)
	}

	return r
}

func (rt *Router) bootstrapSession(w http.ResponseWriter, r *http.Request) {
	me, token, err := rt.service.BootstrapSession(r.Context(), rt.sessionToken(r), r.UserAgent(), clientIP(r))
	if err != nil {
		writeError(w, r, err)
		return
	}
	rt.setSessionCookie(w, token)
	writeJSON(w, r, http.StatusOK, me)
}

func (rt *Router) me(w http.ResponseWriter, r *http.Request) {
	me, err := rt.service.GetMe(r.Context(), rt.sessionToken(r))
	if err != nil {
		writeError(w, r, err)
		return
	}
	writeJSON(w, r, http.StatusOK, me)
}

func (rt *Router) startBindEmail(w http.ResponseWriter, r *http.Request) {
	var input models.EmailStartRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, r, err)
		return
	}
	if err := rt.service.StartBindEmail(r.Context(), rt.sessionToken(r), input); err != nil {
		writeError(w, r, err)
		return
	}
	writeJSON(w, r, http.StatusAccepted, map[string]any{"status": "link_sent"})
}

func (rt *Router) confirmBindEmail(w http.ResponseWriter, r *http.Request) {
	var input models.EmailConfirmRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, r, err)
		return
	}
	me, token, err := rt.service.ConfirmBindEmail(r.Context(), rt.sessionToken(r), input.Token, r.UserAgent(), clientIP(r))
	if err != nil {
		writeError(w, r, err)
		return
	}
	rt.setSessionCookie(w, token)
	writeJSON(w, r, http.StatusOK, me)
}

func (rt *Router) startLogin(w http.ResponseWriter, r *http.Request) {
	var input models.LoginStartRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, r, err)
		return
	}
	if err := rt.service.StartLogin(r.Context(), input); err != nil {
		writeError(w, r, err)
		return
	}
	writeJSON(w, r, http.StatusAccepted, map[string]any{"status": "link_sent"})
}

func (rt *Router) confirmLogin(w http.ResponseWriter, r *http.Request) {
	var input models.EmailConfirmRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, r, err)
		return
	}
	me, token, err := rt.service.ConfirmLogin(r.Context(), input.Token, r.UserAgent(), clientIP(r))
	if err != nil {
		writeError(w, r, err)
		return
	}
	rt.setSessionCookie(w, token)
	writeJSON(w, r, http.StatusOK, me)
}

func (rt *Router) logout(w http.ResponseWriter, r *http.Request) {
	if err := rt.service.Logout(r.Context(), rt.sessionToken(r)); err != nil {
		writeError(w, r, err)
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     rt.cookieName,
		Path:     "/",
		Value:    "",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   rt.secure,
	})
	writeJSON(w, r, http.StatusOK, map[string]any{"status": "logged_out"})
}

func (rt *Router) listPlaces(w http.ResponseWriter, r *http.Request) {
	query := models.PlaceQuery{
		BBox:     strings.TrimSpace(r.URL.Query().Get("bbox")),
		MineOnly: r.URL.Query().Get("mine") == "true",
	}
	if raw := strings.TrimSpace(r.URL.Query().Get("access_type")); raw != "" {
		query.AccessTypes = strings.Split(raw, ",")
	}
	places, err := rt.service.ListPlaces(r.Context(), rt.sessionToken(r), query)
	if err != nil {
		writeError(w, r, err)
		return
	}
	writeJSON(w, r, http.StatusOK, map[string]any{"places": places})
}

func (rt *Router) nearbyPlaces(w http.ResponseWriter, r *http.Request) {
	query, err := parseNearbyQuery(r)
	if err != nil {
		writeError(w, r, err)
		return
	}
	places, err := rt.service.NearbyPlaces(r.Context(), rt.sessionToken(r), query)
	if err != nil {
		writeError(w, r, err)
		return
	}
	writeJSON(w, r, http.StatusOK, map[string]any{"places": places})
}

func (rt *Router) getPlace(w http.ResponseWriter, r *http.Request) {
	place, err := rt.service.GetPlace(r.Context(), rt.sessionToken(r), chi.URLParam(r, "placeID"))
	if err != nil {
		writeError(w, r, err)
		return
	}
	writeJSON(w, r, http.StatusOK, place)
}

func (rt *Router) createPlace(w http.ResponseWriter, r *http.Request) {
	var input models.PlaceInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, r, err)
		return
	}
	place, err := rt.service.CreatePlace(r.Context(), rt.sessionToken(r), input)
	if err != nil {
		writeError(w, r, err)
		return
	}
	writeJSON(w, r, http.StatusCreated, place)
}

func (rt *Router) updatePlace(w http.ResponseWriter, r *http.Request) {
	var input models.PlacePatch
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, r, err)
		return
	}
	place, err := rt.service.UpdatePlace(r.Context(), rt.sessionToken(r), chi.URLParam(r, "placeID"), input)
	if err != nil {
		writeError(w, r, err)
		return
	}
	writeJSON(w, r, http.StatusOK, place)
}

func (rt *Router) deletePlace(w http.ResponseWriter, r *http.Request) {
	var input models.DeleteInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, r, err)
		return
	}
	if err := rt.service.DeletePlace(r.Context(), rt.sessionToken(r), chi.URLParam(r, "placeID"), input.Version); err != nil {
		writeError(w, r, err)
		return
	}
	writeJSON(w, r, http.StatusOK, map[string]any{"status": "deleted"})
}

func (rt *Router) vote(w http.ResponseWriter, r *http.Request) {
	var input models.VoteInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, r, err)
		return
	}
	vote, err := rt.service.UpsertVote(r.Context(), rt.sessionToken(r), chi.URLParam(r, "placeID"), input)
	if err != nil {
		writeError(w, r, err)
		return
	}
	writeJSON(w, r, http.StatusOK, vote)
}

func (rt *Router) deleteVote(w http.ResponseWriter, r *http.Request) {
	var input models.DeleteInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, r, err)
		return
	}
	if input.Version <= 0 {
		writeError(w, r, apperr.Validation("version is required", map[string]any{"field": "version"}))
		return
	}
	result, err := rt.service.DeleteVote(r.Context(), rt.sessionToken(r), chi.URLParam(r, "placeID"), input.Version)
	if err != nil {
		writeError(w, r, err)
		return
	}
	writeJSON(w, r, http.StatusOK, result)
}

func (rt *Router) myVote(w http.ResponseWriter, r *http.Request) {
	vote, err := rt.service.GetMyVote(r.Context(), rt.sessionToken(r), chi.URLParam(r, "placeID"))
	if err != nil {
		writeError(w, r, err)
		return
	}
	writeJSON(w, r, http.StatusOK, vote)
}

func (rt *Router) report(w http.ResponseWriter, r *http.Request) {
	var input models.ReportInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, r, err)
		return
	}
	report, err := rt.service.CreateReport(r.Context(), rt.sessionToken(r), chi.URLParam(r, "placeID"), input)
	if err != nil {
		writeError(w, r, err)
		return
	}
	writeJSON(w, r, http.StatusCreated, report)
}

func (rt *Router) syncOutbox(w http.ResponseWriter, r *http.Request) {
	var input models.SyncOutboxRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, r, err)
		return
	}
	resp, err := rt.service.SyncOutbox(r.Context(), rt.sessionToken(r), input)
	if err != nil {
		writeError(w, r, err)
		return
	}
	writeJSON(w, r, http.StatusOK, resp)
}

func (rt *Router) syncBootstrap(w http.ResponseWriter, r *http.Request) {
	query, err := parseNearbyQuery(r)
	if err != nil {
		writeError(w, r, err)
		return
	}
	resp, err := rt.service.SyncBootstrap(r.Context(), rt.sessionToken(r), query)
	if err != nil {
		writeError(w, r, err)
		return
	}
	writeJSON(w, r, http.StatusOK, resp)
}

func (rt *Router) syncChanges(w http.ResponseWriter, r *http.Request) {
	raw := strings.TrimSpace(r.URL.Query().Get("since"))
	if raw == "" {
		writeError(w, r, apperr.Validation("since is required", nil))
		return
	}
	since, err := time.Parse(time.RFC3339, raw)
	if err != nil {
		writeError(w, r, apperr.Validation("since must be RFC3339 timestamp", nil))
		return
	}
	resp, err := rt.service.SyncChanges(r.Context(), rt.sessionToken(r), since)
	if err != nil {
		writeError(w, r, err)
		return
	}
	writeJSON(w, r, http.StatusOK, resp)
}

func (rt *Router) offlineManifest(w http.ResponseWriter, r *http.Request) {
	query, err := parseNearbyQuery(r)
	if err != nil {
		writeError(w, r, err)
		return
	}
	resp, err := rt.service.OfflineManifest(r.Context(), query)
	if err != nil {
		writeError(w, r, err)
		return
	}
	writeJSON(w, r, http.StatusOK, resp)
}

func (rt *Router) sessionToken(r *http.Request) string {
	cookie, err := r.Cookie(rt.cookieName)
	if err != nil {
		return ""
	}
	return cookie.Value
}

func (rt *Router) setSessionCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     rt.cookieName,
		Path:     "/",
		Value:    token,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   rt.secure,
		MaxAge:   int((30 * 24 * time.Hour).Seconds()),
	})
}

func writeJSON(w http.ResponseWriter, r *http.Request, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Request-ID", middleware.GetReqID(r.Context()))
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, r *http.Request, err error) {
	var apiErr *apperr.Error
	if !errors.As(err, &apiErr) {
		apiErr = apperr.Internal(err)
	}
	writeJSON(w, r, apiErr.Status, map[string]any{
		"error": map[string]any{
			"code":    apiErr.Code,
			"message": apiErr.Message,
			"details": apiErr.Details,
		},
		"request_id": middleware.GetReqID(r.Context()),
	})
}

func decodeJSON(r *http.Request, target any) error {
	defer r.Body.Close()
	if err := json.NewDecoder(r.Body).Decode(target); err != nil {
		return apperr.Validation("invalid JSON body", nil)
	}
	return nil
}

func parseNearbyQuery(r *http.Request) (models.NearbyQuery, error) {
	lat, err := parseFloatQuery(r, "lat")
	if err != nil {
		return models.NearbyQuery{}, err
	}
	lng, err := parseFloatQuery(r, "lng")
	if err != nil {
		return models.NearbyQuery{}, err
	}
	radius, err := parseFloatQuery(r, "radius_km")
	if err != nil {
		return models.NearbyQuery{}, err
	}
	if radius <= 0 {
		radius = 100
	}
	return models.NearbyQuery{Lat: lat, Lng: lng, RadiusKM: radius}, nil
}

func parseFloatQuery(r *http.Request, key string) (float64, error) {
	raw := strings.TrimSpace(r.URL.Query().Get(key))
	if raw == "" {
		return 0, apperr.Validation(key+" is required", nil)
	}
	value, err := strconv.ParseFloat(raw, 64)
	if err != nil {
		return 0, apperr.Validation(key+" must be numeric", nil)
	}
	return value, nil
}

func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(strings.TrimSpace(r.RemoteAddr))
	if err != nil {
		return strings.TrimSpace(r.RemoteAddr)
	}
	return host
}
