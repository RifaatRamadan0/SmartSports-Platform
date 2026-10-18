-- ============================================================
-- SmartSports – Replace is_approved with a status enum column
-- Migration: 016_AddPitchStatus.sql
--
-- PitchStatus values (mirrors SmartSports.Domain.Enums.PitchStatus):
--   0 = PendingApproval
--   1 = Approved
--   2 = Rejected
-- ============================================================

ALTER TABLE pitches
    ADD COLUMN status SMALLINT NOT NULL DEFAULT 0;

-- Backfill: previously-approved pitches become Approved (1); everything else stays PendingApproval (0).
UPDATE pitches
SET status = CASE WHEN is_approved = TRUE THEN 1 ELSE 0 END;

ALTER TABLE pitches
    DROP COLUMN is_approved;

-- Partial index for the public listing hot path (active + approved + not deleted).
CREATE INDEX idx_pitches_active_approved
    ON pitches (created_at DESC, id DESC)
    WHERE status = 1 AND is_active = TRUE AND deleted_at IS NULL;

-- Partial index for the admin pending-approval queue.
CREATE INDEX idx_pitches_pending
    ON pitches (created_at DESC)
    WHERE status = 0 AND deleted_at IS NULL;
