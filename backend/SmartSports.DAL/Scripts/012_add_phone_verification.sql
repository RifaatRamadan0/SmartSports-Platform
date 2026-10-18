-- =============================================
-- Migration 012: Phone Verification
-- =============================================

ALTER TABLE users ADD COLUMN is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE;
