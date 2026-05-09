-- =============================================
-- Migration 011: Email Verification
-- =============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE email_verification_tokens (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     INT         NOT NULL,
    token       UUID        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    used_at     TIMESTAMPTZ NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_evt_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- Fast cleanup of expired/unused tokens
CREATE INDEX IF NOT EXISTS idx_evt_expires_at
    ON email_verification_tokens(expires_at)
    WHERE used_at IS NULL;
