-- Migration 020: Data integrity constraints
-- Fixes: total_price must be positive, and unbounded TEXT fields are capped.

-- 1. total_price > 0 — bookings with $0 total are not valid.
ALTER TABLE bookings
    DROP CONSTRAINT IF EXISTS chk_booking_price;

ALTER TABLE bookings
    ADD CONSTRAINT chk_booking_price CHECK (total_price > 0);

-- 2. Cap free-text fields to 500 characters to prevent unbounded storage.
ALTER TABLE bookings
    ALTER COLUMN cancellation_reason TYPE VARCHAR(500);

ALTER TABLE pitches
    ALTER COLUMN rejection_reason TYPE VARCHAR(500);

ALTER TABLE role_requests
    ALTER COLUMN rejection_reason TYPE VARCHAR(500);
