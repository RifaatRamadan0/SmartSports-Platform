-- Migration 031: Drop redundant indexes introduced by 001_initial_schema.sql.
-- Migration 026 added correctly-named replacements for five of the original indexes,
-- leaving both the old and new indexes alive and causing write amplification on every
-- INSERT/UPDATE to bookings, matches, invitations, and notifications.
--
-- idx_bookings_user       (user_id)              → superseded by idx_bookings_user_id
-- idx_matches_booking     (booking_id)            → superseded by matches_booking_id_key unique index
-- idx_matches_booking_id  (booking_id)            → also superseded by matches_booking_id_key unique index
-- idx_invitations_match   (match_id)              → superseded by idx_invitations_match_id
-- idx_notifications_user  (user_id)               → redundant prefix of idx_notifications_user_id (user_id, created_at DESC)

DROP INDEX IF EXISTS idx_bookings_user;
DROP INDEX IF EXISTS idx_matches_booking;
DROP INDEX IF EXISTS idx_matches_booking_id;
DROP INDEX IF EXISTS idx_invitations_match;
DROP INDEX IF EXISTS idx_notifications_user;
