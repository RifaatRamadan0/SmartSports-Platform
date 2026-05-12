-- =============================================
-- Migration 010: Password Reset Tokens
-- =============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         INT             NOT NULL,
    token           UUID            NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    expires_at      TIMESTAMPTZ     NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
    used_at         TIMESTAMPTZ     NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_prt_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- Fast cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_prt_expires_at
    ON password_reset_tokens(expires_at)
    WHERE used_at IS NULL;