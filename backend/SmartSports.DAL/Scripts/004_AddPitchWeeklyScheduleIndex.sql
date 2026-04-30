-- The UNIQUE(pitch_id, day_of_week) constraint already provides a B-tree index
-- that Postgres uses for prefix scans on pitch_id, so a redundant single-column
-- index is omitted. This partial index speeds up booking-availability queries
-- that filter only active days.
CREATE INDEX ix_pitch_weekly_schedules_active
    ON pitch_weekly_schedules (pitch_id)
    WHERE is_active = TRUE;