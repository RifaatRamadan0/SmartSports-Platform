-- Performance indexes for the most common query patterns.
-- Bookings are queried by pitch+date for slot conflict checks and by user for history.
-- Matches are looked up by booking_id. Invitations are filtered by match_id.
-- Schedules are already indexed by pitch_id+day_of_week (004_AddPitchWeeklyScheduleIndex.sql).

CREATE INDEX IF NOT EXISTS idx_bookings_pitch_date
    ON bookings (pitch_id, booking_date);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id
    ON bookings (user_id);

CREATE INDEX IF NOT EXISTS idx_matches_booking_id
    ON matches (booking_id);

CREATE INDEX IF NOT EXISTS idx_invitations_match_id
    ON invitations (match_id);

CREATE INDEX IF NOT EXISTS idx_reviews_pitch_id
    ON reviews (pitch_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id
    ON notifications (user_id, created_at DESC);
