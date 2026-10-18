-- Soft-delete support for user accounts.
-- A NULL deleted_at means the account is active; a non-NULL timestamp means it
-- has been removed (by the user or an admin). The row is retained for foreign-key
-- integrity (bookings, matches, reviews still reference it), but its unique/PII
-- fields are anonymized at delete time (see UserRepository.SoftDeleteAsync) so the
-- original email/username are freed for re-registration.
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
