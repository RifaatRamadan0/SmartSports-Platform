-- ============================================================
-- SmartSports – Universal Booking Duration Constraints
-- Migration: 005_UpdateBookingDurationConstraints.sql
-- ============================================================

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