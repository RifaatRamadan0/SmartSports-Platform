-- ============================================================
-- SmartSports – Per-Pitch Max Booking Duration
-- Migration: 006_AddMaxBookingDurationToPitches.sql
-- ============================================================

-- Add max booking duration to pitches table.
-- Pitch owners can configure the maximum booking duration for their pitch.
-- Must be between 1 hour (60 min) and 8 hours (480 min) and a multiple of 30.
ALTER TABLE pitches
    ADD COLUMN max_booking_duration_minutes INT NOT NULL DEFAULT 120,
    ADD CONSTRAINT chk_pitch_max_duration
        CHECK (max_booking_duration_minutes BETWEEN 60 AND 480),
    ADD CONSTRAINT chk_pitch_max_duration_half_hour
        CHECK (max_booking_duration_minutes % 30 = 0);