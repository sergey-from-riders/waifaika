package app

import (
	"context"
	"fmt"
	stdmail "net/mail"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"wifiyka/backend/internal/apperr"
	"wifiyka/backend/internal/auth"
	"wifiyka/backend/internal/mail"
	"wifiyka/backend/internal/models"
)

func (a *App) BootstrapSession(ctx context.Context, sessionToken, userAgent, ip string) (models.MeResponse, string, error) {
	if strings.TrimSpace(sessionToken) != "" {
		record, err := a.loadSession(ctx, sessionToken, true)
		if err == nil {
			return a.meResponse(record), sessionToken, nil
		}
	}

	tx, err := a.db.Begin(ctx)
	if err != nil {
		return models.MeResponse{}, "", apperr.Internal(err)
	}
	defer tx.Rollback(ctx)

	user := models.User{
		UserID:    uuid.NewString(),
		UserType:  "anonymous",
		IsActive:  true,
		Version:   1,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	err = tx.QueryRow(ctx, `
		INSERT INTO users (
			user_id,
			user_type,
			is_active,
			version,
			created_at,
			updated_at,
			last_seen_at
		)
		VALUES ($1, $2, TRUE, 1, now(), now(), now())
		RETURNING created_at, updated_at, last_seen_at
	`, user.UserID, user.UserType).Scan(&user.CreatedAt, &user.UpdatedAt, &user.LastSeenAt)
	if err != nil {
		return models.MeResponse{}, "", apperr.Internal(err)
	}
	if err := a.writeUserVersion(ctx, tx, user, "insert", nil); err != nil {
		return models.MeResponse{}, "", err
	}
	sessionID, rawToken, expiresAt, err := a.createSession(ctx, tx, user.UserID, userAgent, ip)
	if err != nil {
		return models.MeResponse{}, "", err
	}
	if err := tx.Commit(ctx); err != nil {
		return models.MeResponse{}, "", apperr.Internal(err)
	}
	return a.meResponse(sessionRecord{
		SessionID: sessionID,
		User:      user,
		ExpiresAt: expiresAt,
	}), rawToken, nil
}

func (a *App) GetMe(ctx context.Context, sessionToken string) (models.MeResponse, error) {
	record, err := a.loadSession(ctx, sessionToken, true)
	if err != nil {
		return models.MeResponse{}, err
	}
	return a.meResponse(record), nil
}

func (a *App) StartBindEmail(ctx context.Context, sessionToken string, input models.EmailStartRequest) error {
	record, err := a.loadSession(ctx, sessionToken, true)
	if err != nil {
		return err
	}
	if !input.ConsentAccepted {
		return apperr.Validation("consent_accepted must be true", map[string]any{"field": "consent_accepted"})
	}
	email, err := normalizeEmail(input.Email)
	if err != nil {
		return err
	}
	if !a.limiter.Allow("bind:"+record.User.UserID, 5, 15*time.Minute) {
		return apperr.RateLimited("too many bind email requests")
	}
	return a.createMagicLink(ctx, &record.User.UserID, email, "bind_email")
}

func (a *App) ConfirmBindEmail(ctx context.Context, sessionToken, token, userAgent, ip string) (models.MeResponse, string, error) {
	record, err := a.loadSession(ctx, sessionToken, true)
	if err != nil {
		return models.MeResponse{}, "", err
	}
	token = strings.TrimSpace(token)
	if token == "" {
		return models.MeResponse{}, "", apperr.Validation("token is required", nil)
	}

	tx, err := a.db.Begin(ctx)
	if err != nil {
		return models.MeResponse{}, "", apperr.Internal(err)
	}
	defer tx.Rollback(ctx)

	var (
		linkID      string
		linkUserID  pgtype.Text
		email       string
		purpose     string
		expiresAt   time.Time
		usedAt      *time.Time
	)
	if err := tx.QueryRow(ctx, `
		SELECT email_magic_link_id::text, user_id::text, email, purpose, expires_at, used_at
		FROM email_magic_links
		WHERE token_hash = $1
		FOR UPDATE
	`, hashToken(token)).Scan(&linkID, &linkUserID, &email, &purpose, &expiresAt, &usedAt); err != nil {
		if err == pgx.ErrNoRows {
			return models.MeResponse{}, "", apperr.Conflict("invalid_or_expired_token", "magic link is invalid or expired")
		}
		return models.MeResponse{}, "", apperr.Internal(err)
	}
	if purpose != "bind_email" || !linkUserID.Valid || linkUserID.String != record.User.UserID || usedAt != nil || time.Now().After(expiresAt) {
		return models.MeResponse{}, "", apperr.Conflict("invalid_or_expired_token", "magic link is invalid or expired")
	}

	var existing userEmailRecord
	err = tx.QueryRow(ctx, `
		SELECT
			user_email_id::text,
			user_id::text,
			email,
			is_primary,
			is_verified,
			verified_at,
			version,
			created_at,
			updated_at
		FROM user_emails
		WHERE lower(email) = lower($1)
		FOR UPDATE
	`, email).Scan(
		&existing.UserEmailID,
		&existing.UserID,
		&existing.Email,
		&existing.IsPrimary,
		&existing.IsVerified,
		&existing.VerifiedAt,
		&existing.Version,
		&existing.CreatedAt,
		&existing.UpdatedAt,
	)
	switch {
	case err == pgx.ErrNoRows:
		existing = userEmailRecord{
			UserEmailID: uuid.NewString(),
			UserID:      record.User.UserID,
			Email:       email,
			IsPrimary:   true,
			IsVerified:  true,
			Version:     1,
		}
		err = tx.QueryRow(ctx, `
			INSERT INTO user_emails (
				user_email_id,
				user_id,
				email,
				is_primary,
				is_verified,
				verified_at,
				version,
				created_at,
				updated_at
			)
			VALUES ($1, $2, $3, TRUE, TRUE, now(), 1, now(), now())
			RETURNING verified_at, created_at, updated_at
		`, existing.UserEmailID, existing.UserID, existing.Email).Scan(&existing.VerifiedAt, &existing.CreatedAt, &existing.UpdatedAt)
		if err != nil {
			return models.MeResponse{}, "", apperr.Internal(err)
		}
		if err := a.writeUserEmailVersion(ctx, tx, existing, "insert", &record.User.UserID); err != nil {
			return models.MeResponse{}, "", err
		}
	case err != nil:
		return models.MeResponse{}, "", apperr.Internal(err)
	default:
		if existing.UserID != record.User.UserID {
			return models.MeResponse{}, "", apperr.Conflict("email_already_bound", "email already belongs to another account")
		}
		err = tx.QueryRow(ctx, `
			UPDATE user_emails
			SET is_primary = TRUE,
				is_verified = TRUE,
				verified_at = now(),
				version = version + 1,
				updated_at = now()
			WHERE user_email_id = $1
			RETURNING verified_at, version, created_at, updated_at
		`, existing.UserEmailID).Scan(&existing.VerifiedAt, &existing.Version, &existing.CreatedAt, &existing.UpdatedAt)
		if err != nil {
			return models.MeResponse{}, "", apperr.Internal(err)
		}
		existing.IsPrimary = true
		existing.IsVerified = true
		if err := a.writeUserEmailVersion(ctx, tx, existing, "update", &record.User.UserID); err != nil {
			return models.MeResponse{}, "", err
		}
	}

	displayName := record.User.DisplayName
	if displayName == nil {
		displayName = nullableString(strings.Split(email, "@")[0])
	}
	err = tx.QueryRow(ctx, `
		UPDATE users
		SET user_type = 'email_linked',
			display_name = COALESCE($2, display_name),
			version = version + 1,
			updated_at = now()
		WHERE user_id = $1
		RETURNING user_id::text, user_type, display_name, is_active, version, created_at, updated_at, last_seen_at
	`, record.User.UserID, displayName).Scan(
		&record.User.UserID,
		&record.User.UserType,
		&record.User.DisplayName,
		&record.User.IsActive,
		&record.User.Version,
		&record.User.CreatedAt,
		&record.User.UpdatedAt,
		&record.User.LastSeenAt,
	)
	if err != nil {
		return models.MeResponse{}, "", apperr.Internal(err)
	}
	if err := a.writeUserVersion(ctx, tx, record.User, "update", &record.User.UserID); err != nil {
		return models.MeResponse{}, "", err
	}

	if _, err := tx.Exec(ctx, `UPDATE email_magic_links SET used_at = now() WHERE email_magic_link_id = $1`, linkID); err != nil {
		return models.MeResponse{}, "", apperr.Internal(err)
	}
	if _, err := tx.Exec(ctx, `UPDATE sessions SET revoked_at = now() WHERE session_token_hash = $1 AND revoked_at IS NULL`, hashToken(sessionToken)); err != nil {
		return models.MeResponse{}, "", apperr.Internal(err)
	}

	sessionID, rawToken, expiresAt, err := a.createSession(ctx, tx, record.User.UserID, userAgent, ip)
	if err != nil {
		return models.MeResponse{}, "", err
	}
	if err := tx.Commit(ctx); err != nil {
		return models.MeResponse{}, "", apperr.Internal(err)
	}
	return a.meResponse(sessionRecord{
		SessionID: sessionID,
		User:      record.User,
		ExpiresAt: expiresAt,
	}), rawToken, nil
}

func (a *App) StartLogin(ctx context.Context, input models.LoginStartRequest) error {
	email, err := normalizeEmail(input.Email)
	if err != nil {
		return err
	}
	if !a.limiter.Allow("login:"+email, 5, 15*time.Minute) {
		return apperr.RateLimited("too many login requests")
	}

	var userID string
	err = a.db.QueryRow(ctx, `
		SELECT user_id::text
		FROM user_emails
		WHERE lower(email) = lower($1) AND is_verified = TRUE
		LIMIT 1
	`, email).Scan(&userID)
	if err == pgx.ErrNoRows {
		return nil
	}
	if err != nil {
		return apperr.Internal(err)
	}

	return a.createMagicLink(ctx, &userID, email, "login")
}

func (a *App) ConfirmLogin(ctx context.Context, token, userAgent, ip string) (models.MeResponse, string, error) {
	token = strings.TrimSpace(token)
	if token == "" {
		return models.MeResponse{}, "", apperr.Validation("token is required", nil)
	}

	tx, err := a.db.Begin(ctx)
	if err != nil {
		return models.MeResponse{}, "", apperr.Internal(err)
	}
	defer tx.Rollback(ctx)

	var (
		linkID     string
		userID     pgtype.Text
		purpose    string
		expiresAt  time.Time
		usedAt     *time.Time
		record     sessionRecord
	)
	if err := tx.QueryRow(ctx, `
		SELECT email_magic_link_id::text, user_id::text, purpose, expires_at, used_at
		FROM email_magic_links
		WHERE token_hash = $1
		FOR UPDATE
	`, hashToken(token)).Scan(&linkID, &userID, &purpose, &expiresAt, &usedAt); err != nil {
		if err == pgx.ErrNoRows {
			return models.MeResponse{}, "", apperr.Conflict("invalid_or_expired_token", "magic link is invalid or expired")
		}
		return models.MeResponse{}, "", apperr.Internal(err)
	}
	if purpose != "login" || !userID.Valid || usedAt != nil || time.Now().After(expiresAt) {
		return models.MeResponse{}, "", apperr.Conflict("invalid_or_expired_token", "magic link is invalid or expired")
	}
	if err := tx.QueryRow(ctx, `
		SELECT user_id::text, user_type, display_name, is_active, version, created_at, updated_at, last_seen_at
		FROM users
		WHERE user_id = $1 AND is_active = TRUE
	`, userID.String).Scan(
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
			return models.MeResponse{}, "", apperr.Unauthorized("user not found")
		}
		return models.MeResponse{}, "", apperr.Internal(err)
	}

	sessionID, rawToken, sessionExpiresAt, err := a.createSession(ctx, tx, userID.String, userAgent, ip)
	if err != nil {
		return models.MeResponse{}, "", err
	}
	if _, err := tx.Exec(ctx, `UPDATE email_magic_links SET used_at = now() WHERE email_magic_link_id = $1`, linkID); err != nil {
		return models.MeResponse{}, "", apperr.Internal(err)
	}
	if err := tx.Commit(ctx); err != nil {
		return models.MeResponse{}, "", apperr.Internal(err)
	}
	record.ExpiresAt = sessionExpiresAt
	record.SessionID = sessionID
	return a.meResponse(record), rawToken, nil
}

func (a *App) Logout(ctx context.Context, sessionToken string) error {
	sessionToken = strings.TrimSpace(sessionToken)
	if sessionToken == "" {
		return nil
	}
	_, err := a.db.Exec(ctx, `UPDATE sessions SET revoked_at = now() WHERE session_token_hash = $1 AND revoked_at IS NULL`, hashToken(sessionToken))
	if err != nil {
		return apperr.Internal(err)
	}
	return nil
}

func normalizeEmail(value string) (string, error) {
	address, err := stdmail.ParseAddress(strings.TrimSpace(value))
	if err != nil {
		return "", apperr.Validation("email is invalid", map[string]any{"field": "email"})
	}
	return strings.ToLower(address.Address), nil
}

func (a *App) createMagicLink(ctx context.Context, userID *string, email, purpose string) error {
	rawToken, tokenHash, err := auth.NewOpaqueToken()
	if err != nil {
		return apperr.Internal(err)
	}
	_, err = a.db.Exec(ctx, `
		INSERT INTO email_magic_links (
			email_magic_link_id,
			user_id,
			email,
			purpose,
			token_hash,
			expires_at,
			created_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, now())
	`, uuid.New(), userID, email, purpose, tokenHash, time.Now().Add(a.cfg.MagicLinkTTL))
	if err != nil {
		return apperr.Internal(err)
	}

	link := a.buildMagicLinkURL(purpose, rawToken)
	subject := "Вайфайка: вход по magic link"
	if purpose == "bind_email" {
		subject = "Вайфайка: подтверждение email"
	}
	body := fmt.Sprintf(`
		<p>Ссылка для подтверждения: <a href="%s">%s</a></p>
		<p>Ссылка действует %s.</p>
	`, link, link, a.cfg.MagicLinkTTL.String())
	return a.mailer.Send(ctx, mail.Message{
		To:      email,
		Subject: subject,
		HTML:    body,
		Text:    fmt.Sprintf("Ссылка для подтверждения: %s", link),
	})
}

func hashToken(token string) string {
	return auth.HashToken(strings.TrimSpace(token))
}
