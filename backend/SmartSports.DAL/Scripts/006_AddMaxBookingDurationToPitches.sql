-- ============================================================
-- SmartSports – Per-Pitch Max Booking Duration
-- Migration: 006_AddMaxBookingDurationToPitches.sql
-- ============================================================

-- Replaces the removed global chk_booking_max_duration constraint.
-- Each pitch can configure its own maximum booking window.
-- Default 120 min (2 hours) — existing pitches get this automatically with no data migration.
-- CHECK 60–480 prevents absurd values (min 1h, max 8h).
ALTER TABLE pitches
    ADD COLUMN max_booking_duration_minutes INT NOT NULL DEFAULT 120,
    ADD CONSTRAINT chk_pitch_max_duration
        CHECK (max_booking_duration_minutes BETWEEN 60 AND 480);
