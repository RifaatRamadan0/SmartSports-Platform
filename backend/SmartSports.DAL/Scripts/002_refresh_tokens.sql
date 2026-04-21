-- ============================================================
-- SmartSports – Refresh Tokens Table
-- Migration: 002_refresh_tokens.sql
-- ============================================================

CREATE TABLE refresh_tokens (
    id          SERIAL          PRIMARY KEY,
    user_id     INT             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT            NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ     NOT NULL,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    is_revoked  BOOLEAN         NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_refresh_tokens_user    ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token   ON refresh_tokens(token);