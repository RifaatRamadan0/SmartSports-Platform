-- Migration 022 (SPDBTCP-76): Prevent duplicate pending invitations
-- Closes a TOCTOU race in InvitationService.InviteByUsernameAsync:
-- two concurrent POSTs could each pass the application-level
-- ExistsPendingAsync check and both insert a pending row for the
-- same (match_id, invited_user_id). The application check stays for
-- the friendly error message; this index is the safety net.
--
-- The index is PARTIAL — only pending rows participate. Accepted,
-- declined, and expired rows can coexist for the same pair (e.g. a
-- user was invited, declined, then re-invited later).

CREATE UNIQUE INDEX IF NOT EXISTS uq_invitations_pending
    ON invitations (match_id, invited_user_id)
    WHERE status = 'pending';
