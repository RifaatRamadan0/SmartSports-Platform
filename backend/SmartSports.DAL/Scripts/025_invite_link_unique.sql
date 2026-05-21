-- Prevents concurrent POST /api/matches/{id}/invite-link requests from creating
-- more than one active link invitation per match. Username invitations
-- (invited_user_id IS NOT NULL) are already covered by uq_invitations_pending (023).
CREATE UNIQUE INDEX IF NOT EXISTS uq_invitations_link_pending
    ON invitations (match_id)
    WHERE invited_user_id IS NULL
      AND status = 'pending';
