-- Add max booking duration to pitches table.
-- Pitch owners can configure the maximum booking duration for their pitch.
-- Must be between 1 hour (60 min) and 8 hours (480 min) and a multiple of 30.
ALTER TABLE pitches
    ADD COLUMN max_booking_duration_minutes INT NOT NULL DEFAULT 120,
    ADD CONSTRAINT chk_pitch_max_duration
        CHECK (max_booking_duration_minutes BETWEEN 60 AND 480),
    ADD CONSTRAINT chk_pitch_max_duration_half_hour
        CHECK (max_booking_duration_minutes % 30 = 0);


-- Min duration: 1 hour (user can't book less than 1h)
ALTER TABLE bookings
    ADD CONSTRAINT chk_booking_min_duration
    CHECK (end_time - start_time >= interval '1 hour');

-- Start and end times must be on 30-minute boundaries (e.g. 07:00, 07:30, 08:00)
ALTER TABLE bookings
    ADD CONSTRAINT chk_booking_start_on_half_hour
    CHECK (EXTRACT(MINUTE FROM start_time) IN (0, 30) AND
           EXTRACT(SECOND FROM start_time) = 0);

ALTER TABLE bookings
    ADD CONSTRAINT chk_booking_end_on_half_hour
    CHECK (EXTRACT(MINUTE FROM end_time) IN (0, 30) AND
           EXTRACT(SECOND FROM end_time) = 0);