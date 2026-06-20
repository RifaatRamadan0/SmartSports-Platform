-- Migration 029: Player favorite pitches.
-- Join table letting a player save pitches for quick rebooking. The composite
-- PRIMARY KEY (user_id, pitch_id) doubles as the UNIQUE guard against duplicate
-- favorites and backs the EXISTS lookups used to populate the isFavorited flag.
-- Both FKs cascade so deleting a user or hard-deleting a pitch removes its rows.

CREATE TABLE IF NOT EXISTS user_favorite_pitches (
    user_id    INTEGER     NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    pitch_id   INTEGER     NOT NULL REFERENCES pitches(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, pitch_id)
);

-- Supports listing a user's favorites newest-first.
CREATE INDEX IF NOT EXISTS ix_user_favorite_pitches_user_created
    ON user_favorite_pitches (user_id, created_at DESC);
