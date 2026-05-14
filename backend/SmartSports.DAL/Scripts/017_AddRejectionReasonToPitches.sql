-- ============================================================
-- SmartSports – Store rejection reason on pitches
-- Migration: 017_AddRejectionReasonToPitches.sql
-- ============================================================

ALTER TABLE pitches
    ADD COLUMN rejection_reason TEXT NULL;
