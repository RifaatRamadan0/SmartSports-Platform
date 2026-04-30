-- ============================================================
-- SmartSports – Universal Booking Duration Constraints
-- Migration: 005_UpdateBookingDurationConstraints.sql
-- ============================================================

-- Min duration: 1 hour — no pitch would ever allow less
ALTER TABLE bookings
    ADD CONSTRAINT chk_booking_min_duration
    CHECK (end_time - start_time >= interval '1 hour');

-- Start times must be on 30-minute boundaries (e.g. 07:00, 07:30, 08:00)
ALTER TABLE bookings
    ADD CONSTRAINT chk_booking_start_on_half_hour
    CHECK (EXTRACT(MINUTE FROM start_time) IN (0, 30) AND
           EXTRACT(SECOND FROM start_time) = 0);

-- Defense-in-depth: DB has no "duration must be a multiple of 30" constraint,
-- so this guards against a service-layer bug producing an end_time like 07:45
ALTER TABLE bookings
    ADD CONSTRAINT chk_booking_end_on_half_hour
    CHECK (EXTRACT(MINUTE FROM end_time) IN (0, 30) AND
           EXTRACT(SECOND FROM end_time) = 0);
