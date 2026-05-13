-- ============================================================
-- SmartSports – Soft-delete for pitches
-- Migration: 014_AddSoftDeleteToPitches.sql
-- ============================================================

-- Add a dedicated soft-delete column. is_active stays free for owners
-- to toggle visibility without deleting the listing.
ALTER TABLE pitches
    ADD COLUMN deleted_at TIMESTAMPTZ NULL;

-- Partial index to keep lookups against live pitches fast.
CREATE INDEX idx_pitches_not_deleted
    ON pitches (id)
    WHERE deleted_at IS NULL;
