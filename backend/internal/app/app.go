package app

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/url"
	"os"
	"path"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"wifiyka/backend/internal/apperr"
	"wifiyka/backend/internal/auth"
	"wifiyka/backend/internal/config"
	"wifiyka/backend/internal/mail"
	"wifiyka/backend/internal/models"
)

type App struct {
	cfg     config.Config
	logger  *slog.Logger
	db      *pgxpool.Pool
	mailer  mail.Mailer
	limiter *rateLimiter
}

type rateLimiter struct {
	mu      sync.Mutex
	buckets map[string][]time.Time
}

type sessionRecord struct {
	SessionID string
	User      models.User
	ExpiresAt time.Time
}

type userEmailRecord struct {
	UserEmailID string
	UserID      string
	Email       string
	IsPrimary   bool
	IsVerified  bool
	VerifiedAt  *time.Time
	Version     int64
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

func New(cfg config.Config, logger *slog.Logger, db *pgxpool.Pool, mailer mail.Mailer) *App {
	return &App{
		cfg:     cfg,
		logger:  logger,
		db:      db,
		mailer:  mailer,
		limiter: &rateLimiter{buckets: make(map[string][]time.Time)},
	}
}

func (l *rateLimiter) Allow(key string, limit int, window time.Duration) bool {
	now := time.Now()
	l.mu.Lock()
	defer l.mu.Unlock()

	hits := l.buckets[key][:0]
	for _, ts := range l.buckets[key] {
		if now.Sub(ts) < window {
			hits = append(hits, ts)
		}
	}
	if len(hits) >= limit {
		l.buckets[key] = hits
		return false
	}
	l.buckets[key] = append(hits, now)
	return true
}

func (a *App) secureCookies() bool {
	return strings.HasPrefix(strings.ToLower(strings.TrimSpace(a.cfg.BaseURL)), "https://")
}

func (a *App) meResponse(record sessionRecord) models.MeResponse {
	return models.MeResponse{
		User: record.User,
		Session: models.SessionSummary{
			SessionID:  record.SessionID,
			ExpiresAt:  record.ExpiresAt,
			IsSecure:   a.secureCookies(),
			CookieName: a.cfg.SessionCookieName,
		},
	}
}

func hashValue(raw string) *string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	sum := sha256.Sum256([]byte(raw))
	value := hex.EncodeToString(sum[:])
	return &value
}

func (a *App) buildMagicLinkURL(purpose, token string) string {
	base, err := url.Parse(strings.TrimSpace(a.cfg.BaseURL))
	if err != nil {
		return a.cfg.BaseURL
	}
	base.Path = path.Join(base.Path, "/magic-link")
	query := base.Query()
	query.Set("purpose", purpose)
	query.Set("token", token)
	base.RawQuery = query.Encode()
	return base.String()
}

func nullableString(value string) *string {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	trimmed := strings.TrimSpace(value)
	return &trimmed
}

func validatePlaceInput(input models.PlaceInput) error {
	if !contains([]string{"cafe", "library", "coworking", "park", "other"}, input.VenueType) {
		return apperr.Validation("unsupported venue_type", map[string]any{"field": "venue_type"})
	}
	if !contains([]string{"free", "customer_only", "unknown"}, input.AccessType) {
		return apperr.Validation("unsupported access_type", map[string]any{"field": "access_type"})
	}
	if strings.TrimSpace(input.PlaceName) == "" {
		return apperr.Validation("place_name is required", map[string]any{"field": "place_name"})
	}
	if strings.TrimSpace(input.WifiName) == "" {
		return apperr.Validation("wifi_name is required", map[string]any{"field": "wifi_name"})
	}
	if input.Lat < -90 || input.Lat > 90 || input.Lng < -180 || input.Lng > 180 {
		return apperr.Validation("coordinates are invalid", map[string]any{"field": "lat/lng"})
	}
	return nil
}

func validateVote(value string) error {
	if !contains([]string{"works", "not_works"}, value) {
		return apperr.Validation("vote must be works or not_works", map[string]any{"field": "vote"})
	}
	return nil
}

func contains(values []string, target string) bool {
	target = strings.TrimSpace(target)
	for _, candidate := range values {
		if candidate == target {
			return true
		}
	}
	return false
}

func (a *App) loadSession(ctx context.Context, rawToken string, touch bool) (sessionRecord, error) {
	rawToken = strings.TrimSpace(rawToken)
	if rawToken == "" {
		return sessionRecord{}, apperr.Unauthorized("session is required")
	}

	var record sessionRecord
	row := a.db.QueryRow(ctx, `
		SELECT
			s.session_id::text,
			s.expires_at,
			u.user_id::text,
			u.user_type,
			u.display_name,
			u.is_active,
			u.version,
			u.created_at,
			u.updated_at,
			u.last_seen_at
		FROM sessions s
		INNER JOIN users u ON u.user_id = s.user_id
		WHERE s.session_token_hash = $1
		  AND s.revoked_at IS NULL
		  AND s.expires_at > now()
		  AND u.is_active = TRUE
	`, auth.HashToken(rawToken))

	if err := row.Scan(
		&record.SessionID,
		&record.ExpiresAt,
		&record.User.UserID,
		&record.User.UserType,
		&record.User.DisplayName,
		&record.User.IsActive,
		&record.User.Version,
		&record.User.CreatedAt,
		&record.User.UpdatedAt,
		&record.User.LastSeenAt,
	); err != nil {
		if err == pgx.ErrNoRows {
			return sessionRecord{}, apperr.Unauthorized("session is invalid or expired")
		}
		return sessionRecord{}, apperr.Internal(err)
	}

	if touch {
		_, err := a.db.Exec(ctx, `UPDATE users SET last_seen_at = now(), updated_at = now() WHERE user_id = $1`, record.User.UserID)
		if err != nil {
			return sessionRecord{}, apperr.Internal(err)
		}
	}

	return record, nil
}

func (a *App) createSession(ctx context.Context, tx pgx.Tx, userID, userAgent, ip string) (string, string, time.Time, error) {
	raw, hash, err := auth.NewOpaqueToken()
	if err != nil {
		return "", "", time.Time{}, apperr.Internal(err)
	}
	expiresAt := time.Now().Add(a.cfg.SessionTTL)
	sessionID := uuid.NewString()
	_, err = tx.Exec(ctx, `
		INSERT INTO sessions (
			session_id,
			user_id,
			session_token_hash,
			user_agent,
			ip_hash,
			expires_at
		)
		VALUES ($1, $2, $3, $4, $5, $6)
	`,
		sessionID,
		userID,
		hash,
		nullableString(userAgent),
		hashValue(ip),
		expiresAt,
	)
	if err != nil {
		return "", "", time.Time{}, apperr.Internal(err)
	}
	return sessionID, raw, expiresAt, nil
}

func (a *App) writeUserVersion(ctx context.Context, tx pgx.Tx, user models.User, action string, actorID *string) error {
	payload, err := json.Marshal(user)
	if err != nil {
		return apperr.Internal(err)
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO users_versions (
			user_version_id,
			user_id,
			version,
			version_action,
			version_snapshot,
			version_created_by_user_id
		)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, uuid.New(), user.UserID, user.Version, action, payload, actorID)
	if err != nil {
		return apperr.Internal(err)
	}
	return nil
}

func (a *App) writeUserEmailVersion(ctx context.Context, tx pgx.Tx, email userEmailRecord, action string, actorID *string) error {
	payload, err := json.Marshal(email)
	if err != nil {
		return apperr.Internal(err)
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO user_emails_versions (
			user_email_version_id,
			user_email_id,
			version,
			version_action,
			version_snapshot,
			version_created_by_user_id
		)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, uuid.New(), email.UserEmailID, email.Version, action, payload, actorID)
	if err != nil {
		return apperr.Internal(err)
	}
	return nil
}

func (a *App) writePlaceVersion(ctx context.Context, tx pgx.Tx, place models.Place, action string, actorID *string) error {
	payload, err := json.Marshal(place)
	if err != nil {
		return apperr.Internal(err)
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO places_versions (
			place_version_id,
			place_id,
			version,
			version_action,
			version_snapshot,
			version_created_by_user_id
		)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, uuid.New(), place.PlaceID, place.Version, action, payload, actorID)
	if err != nil {
		return apperr.Internal(err)
	}
	return nil
}

func (a *App) writeVoteVersion(ctx context.Context, tx pgx.Tx, vote models.PlaceVote, action string, actorID *string) error {
	payload, err := json.Marshal(vote)
	if err != nil {
		return apperr.Internal(err)
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO place_votes_versions (
			place_vote_version_id,
			place_vote_id,
			version,
			version_action,
			version_snapshot,
			version_created_by_user_id
		)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, uuid.New(), vote.PlaceVoteID, vote.Version, action, payload, actorID)
	if err != nil {
		return apperr.Internal(err)
	}
	return nil
}

func (a *App) scanPlace(scanner interface{ Scan(dest ...any) error }) (models.Place, error) {
	var place models.Place
	if err := scanner.Scan(
		&place.PlaceID,
		&place.UserID,
		&place.VenueType,
		&place.PlaceName,
		&place.WifiName,
		&place.Description,
		&place.PromoText,
		&place.AccessType,
		&place.Status,
		&place.Lat,
		&place.Lng,
		&place.WorksCount,
		&place.NotWorksCount,
		&place.LastVerifiedAt,
		&place.Version,
		&place.CreatedAt,
		&place.UpdatedAt,
	); err != nil {
		return models.Place{}, err
	}
	return place, nil
}

func (a *App) scanVote(scanner interface{ Scan(dest ...any) error }) (models.PlaceVote, error) {
	var vote models.PlaceVote
	if err := scanner.Scan(
		&vote.PlaceVoteID,
		&vote.PlaceID,
		&vote.UserID,
		&vote.Vote,
		&vote.Version,
		&vote.CreatedAt,
		&vote.UpdatedAt,
	); err != nil {
		return models.PlaceVote{}, err
	}
	return vote, nil
}

func (a *App) listMyVotes(ctx context.Context, userID string) ([]models.PlaceVote, error) {
	rows, err := a.db.Query(ctx, `
		SELECT
			place_vote_id::text,
			place_id::text,
			user_id::text,
			vote,
			version,
			created_at,
			updated_at
		FROM place_votes
		WHERE user_id = $1
		ORDER BY updated_at DESC
	`, userID)
	if err != nil {
		return nil, apperr.Internal(err)
	}
	defer rows.Close()

	votes := make([]models.PlaceVote, 0)
	for rows.Next() {
		vote, err := a.scanVote(rows)
		if err != nil {
			return nil, apperr.Internal(err)
		}
		votes = append(votes, vote)
	}
	return votes, nil
}

func (a *App) listMyPlaces(ctx context.Context, userID string) ([]models.Place, error) {
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
		WHERE user_id = $1 AND status <> 'deleted'
		ORDER BY updated_at DESC
	`, userID)
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

func (a *App) ensureOfflinePacksDir() error {
	if strings.TrimSpace(a.cfg.OfflinePacksDir) == "" {
		return nil
	}
	return os.MkdirAll(a.cfg.OfflinePacksDir, 0o755)
}

func conflictIfNoRows(err error, message string) error {
	if err == pgx.ErrNoRows {
		return apperr.Conflict("version_conflict", message)
	}
	return err
}

func wrapSQL(err error) error {
	if err == nil {
		return nil
	}
	var apiErr *apperr.Error
	if strings.Contains(strings.ToLower(err.Error()), "duplicate key") {
		return apperr.Conflict("duplicate", err.Error())
	}
	if strings.Contains(strings.ToLower(err.Error()), "violates foreign key") {
		return apperr.Validation("referenced object does not exist", nil)
	}
	if strings.Contains(strings.ToLower(err.Error()), "version_conflict") {
		return apperr.Conflict("version_conflict", err.Error())
	}
	if ok := As(err, &apiErr); ok {
		return apiErr
	}
	return apperr.Internal(err)
}

func As(err error, target any) bool {
	return errorsAs(err, target)
}

func errorsAs(err error, target any) bool {
	return fmt.Sprintf("%T", err) != "" && errors.As(err, target)
}
