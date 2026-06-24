-- Migration 030: Replace full unique constraint on bookings slot with a partial index.
-- The original UNIQUE (pitch_id, booking_date, start_time) from 001_initial_schema.sql
-- was not filtered by status, so cancelling a booking permanently locked that time slot —
-- any subsequent INSERT hit the constraint even though the advisory-lock + overlap query
-- already excluded cancelled rows from the conflict check.
-- The partial index only enforces uniqueness among active (non-cancelled) bookings,
-- which is the correct invariant.

ALTER TABLE bookings
    DROP CONSTRAINT bookings_pitch_id_booking_date_start_time_key;

CREATE UNIQUE INDEX uq_bookings_active_slot
    ON bookings (pitch_id, booking_date, start_time)
    WHERE status <> 'cancelled';
