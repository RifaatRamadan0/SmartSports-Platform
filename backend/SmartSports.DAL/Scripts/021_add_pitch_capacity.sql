-- Migration 021 (SPDBTCP-245): Pitch capacity
-- Adds `capacity` to pitches so the matches.max_players value can be derived
-- from the venue rather than chosen per-booking by the player. Existing rows
-- default to 10; new pitches must supply a positive value.

ALTER TABLE pitches
    ADD COLUMN IF NOT EXISTS capacity INT NOT NULL DEFAULT 10;

ALTER TABLE pitches
    DROP CONSTRAINT IF EXISTS chk_pitch_capacity;

ALTER TABLE pitches
    ADD CONSTRAINT chk_pitch_capacity CHECK (capacity >= 2 AND capacity <= 30);
