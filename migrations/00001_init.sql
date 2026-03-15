-- +goose Up
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE users (
    user_id UUID PRIMARY KEY,
    user_type TEXT NOT NULL CHECK (user_type IN ('anonymous', 'email_linked', 'moderator', 'admin')),
    display_name TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NULL
);

CREATE TABLE users_versions (
    user_version_id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id),
    version BIGINT NOT NULL,
    version_action TEXT NOT NULL CHECK (version_action IN ('insert', 'update', 'delete')),
    version_snapshot JSONB NOT NULL,
    version_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version_created_by_user_id UUID NULL REFERENCES users(user_id)
);

CREATE TABLE user_emails (
    user_email_id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id),
    email TEXT NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMPTZ NULL,
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX user_emails_email_lower_uidx ON user_emails (lower(email));

CREATE TABLE user_emails_versions (
    user_email_version_id UUID PRIMARY KEY,
    user_email_id UUID NOT NULL REFERENCES user_emails(user_email_id),
    version BIGINT NOT NULL,
    version_action TEXT NOT NULL CHECK (version_action IN ('insert', 'update', 'delete')),
    version_snapshot JSONB NOT NULL,
    version_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version_created_by_user_id UUID NULL REFERENCES users(user_id)
);

CREATE TABLE sessions (
    session_id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id),
    session_token_hash TEXT NOT NULL UNIQUE,
    user_agent TEXT NULL,
    ip_hash TEXT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

CREATE TABLE email_magic_links (
    email_magic_link_id UUID PRIMARY KEY,
    user_id UUID NULL REFERENCES users(user_id),
    email TEXT NOT NULL,
    purpose TEXT NOT NULL CHECK (purpose IN ('bind_email', 'login')),
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE places (
    place_id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id),
    venue_type TEXT NOT NULL CHECK (venue_type IN ('cafe', 'library', 'coworking', 'park', 'other')),
    place_name TEXT NOT NULL,
    wifi_name TEXT NOT NULL,
    description TEXT NULL,
    promo_text TEXT NULL,
    access_type TEXT NOT NULL CHECK (access_type IN ('free', 'customer_only', 'unknown')),
    status TEXT NOT NULL CHECK (status IN ('active', 'hidden', 'deleted', 'needs_review')),
    geom GEOGRAPHY(POINT, 4326) NOT NULL,
    works_count INTEGER NOT NULL DEFAULT 0,
    not_works_count INTEGER NOT NULL DEFAULT 0,
    last_verified_at TIMESTAMPTZ NULL,
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX places_user_id_idx ON places (user_id);
CREATE INDEX places_updated_at_idx ON places (updated_at);
CREATE INDEX places_status_idx ON places (status);
CREATE INDEX places_geom_gix ON places USING GIST (geom);

CREATE TABLE places_versions (
    place_version_id UUID PRIMARY KEY,
    place_id UUID NOT NULL REFERENCES places(place_id),
    version BIGINT NOT NULL,
    version_action TEXT NOT NULL CHECK (version_action IN ('insert', 'update', 'delete')),
    version_snapshot JSONB NOT NULL,
    version_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version_created_by_user_id UUID NULL REFERENCES users(user_id)
);

CREATE TABLE place_votes (
    place_vote_id UUID PRIMARY KEY,
    place_id UUID NOT NULL REFERENCES places(place_id),
    user_id UUID NOT NULL REFERENCES users(user_id),
    vote TEXT NOT NULL CHECK (vote IN ('works', 'not_works')),
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (place_id, user_id)
);

CREATE INDEX place_votes_user_id_idx ON place_votes (user_id);
CREATE INDEX place_votes_updated_at_idx ON place_votes (updated_at);

CREATE TABLE place_votes_versions (
    place_vote_version_id UUID PRIMARY KEY,
    place_vote_id UUID NOT NULL REFERENCES place_votes(place_vote_id),
    version BIGINT NOT NULL,
    version_action TEXT NOT NULL CHECK (version_action IN ('insert', 'update', 'delete')),
    version_snapshot JSONB NOT NULL,
    version_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version_created_by_user_id UUID NULL REFERENCES users(user_id)
);

CREATE TABLE place_reports (
    place_report_id UUID PRIMARY KEY,
    place_id UUID NOT NULL REFERENCES places(place_id),
    user_id UUID NOT NULL REFERENCES users(user_id),
    reason TEXT NOT NULL,
    comment TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sync_operations (
    sync_operation_id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id),
    client_operation_id UUID NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NULL,
    operation_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL,
    error_message TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, client_operation_id)
);

CREATE INDEX sync_operations_created_at_idx ON sync_operations (created_at);

-- +goose Down
DROP TABLE IF EXISTS sync_operations;
DROP TABLE IF EXISTS place_reports;
DROP TABLE IF EXISTS place_votes_versions;
DROP TABLE IF EXISTS place_votes;
DROP TABLE IF EXISTS places_versions;
DROP TABLE IF EXISTS places;
DROP TABLE IF EXISTS email_magic_links;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS user_emails_versions;
DROP TABLE IF EXISTS user_emails;
DROP TABLE IF EXISTS users_versions;
DROP TABLE IF EXISTS users;
