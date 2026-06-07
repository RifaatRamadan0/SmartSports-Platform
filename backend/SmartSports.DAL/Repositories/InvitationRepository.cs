using Dapper;
using Npgsql;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Invitation;
using SmartSports.Domain.Entities.Projections;
using SmartSports.Domain.Exceptions;
using InvitationEntity = SmartSports.Domain.Entities.Invitation;

namespace SmartSports.DAL.Repositories;

public class InvitationRepository : IInvitationRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public InvitationRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<InvitationEntity?> GetActiveByMatchIdAsync(int matchId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<InvitationEntity>(
            """
            SELECT id, match_id, invited_by_id, invited_user_id, expires_at, token, status
            FROM   invitations
            WHERE  match_id        = @MatchId
              AND  invited_user_id IS NULL
              AND  status          = 'pending'
              AND  (expires_at IS NULL OR expires_at > NOW())
            LIMIT  1
            """,
            new { MatchId = matchId });
    }

    public async Task<InvitationEntity?> GetByTokenAsync(string token)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<InvitationEntity>(
            """
            SELECT id, match_id, invited_by_id, invited_user_id, expires_at, token, status
            FROM   invitations
            WHERE  token            = @Token
              AND  invited_user_id IS NULL
            """,
            new { Token = token });
    }

    public async Task<InvitationEntity> CreateAsync(InvitationEntity invitation)
    {
        using var connection = _connectionFactory.CreateConnection();
        try
        {
            return await connection.QuerySingleAsync<InvitationEntity>(
                """
                INSERT INTO invitations
                    (match_id, invited_by_id, invited_user_id, expires_at, token, status)
                VALUES
                    (@MatchId, @InvitedById, @InvitedUserId, @ExpiresAt, @Token, @Status::invitation_status)
                RETURNING id, match_id, invited_by_id, invited_user_id, expires_at, token, status
                """,
                invitation);
        }
        catch (PostgresException ex) when (ex.SqlState == "23505")
        {
            // uq_invitations_pending (migration 023) catches concurrent inserts that
            // slip past ExistsPendingAsync's TOCTOU window. Only fires for username
            // invites (invited_user_id IS NOT NULL); link invitations are not covered
            // by that partial index.
            throw new ConflictException(
                "A pending invitation for this user and match already exists.");
        }
    }

    public async Task<bool> ExistsPendingAsync(int matchId, int invitedUserId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<bool>(
            """
            SELECT EXISTS (
                SELECT 1 FROM invitations
                WHERE match_id        = @MatchId
                  AND invited_user_id = @InvitedUserId
                  AND status          = 'pending'
            )
            """,
            new { MatchId = matchId, InvitedUserId = invitedUserId });
    }

    public async Task<IEnumerable<PendingInvitationRow>> GetPendingByUserIdAsync(int userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        // LATERAL join replaces the correlated scalar subquery — one aggregate pass over
        // match_participants per invitation row instead of one subquery execution per row.
        return await connection.QueryAsync<PendingInvitationRow>(
            """
            SELECT i.id             AS InvitationId,
                   i.match_id       AS MatchId,
                   i.expires_at     AS ExpiresAt,
                   p.name           AS PitchName,
                   st.name          AS SportName,
                   b.booking_date   AS BookingDate,
                   b.start_time     AS StartTime,
                   b.end_time       AS EndTime,
                   u.username       AS InviterDisplayName,
                   m.max_players    AS MaxPlayers,
                   (m.max_players - ac.cnt)::int AS SpotsLeft,
                   ROUND(b.total_price / NULLIF(m.max_players, 0), 2) AS PricePerPlayer
            FROM   invitations   i
            JOIN   matches       m  ON m.id  = i.match_id
            JOIN   bookings      b  ON b.id  = m.booking_id
            JOIN   pitches       p  ON p.id  = b.pitch_id
            JOIN   sport_types   st ON st.id = p.sport_type_id
            JOIN   users         u  ON u.id  = i.invited_by_id
            JOIN LATERAL (
                SELECT COUNT(*)::int AS cnt FROM match_participants
                WHERE  match_id = m.id AND status = 'accepted'
            ) ac ON TRUE
            WHERE  i.invited_user_id = @UserId
              AND  i.status          = 'pending'
              AND  (i.expires_at IS NULL OR i.expires_at > NOW())
            ORDER  BY i.id DESC
            """,
            new { UserId = userId });
    }

    public async Task<InvitationEntity?> GetPendingByIdAsync(int invitationId, int userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<InvitationEntity>(
            """
            SELECT id, match_id, invited_by_id, invited_user_id, expires_at, token, status::TEXT AS status
            FROM   invitations
            WHERE  id              = @InvitationId
              AND  invited_user_id = @UserId
              AND  status          = 'pending'
              AND  (expires_at IS NULL OR expires_at > NOW())
            """,
            new { InvitationId = invitationId, UserId = userId });
    }

    public async Task<int> UpdateStatusAsync(int invitationId, int userId, string newStatus)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteAsync(
            """
            UPDATE invitations
            SET    status = @NewStatus::invitation_status
            WHERE  id              = @InvitationId
              AND  invited_user_id = @UserId
              AND  status          = 'pending'
              AND  (expires_at IS NULL OR expires_at > NOW())
            """,
            new { InvitationId = invitationId, UserId = userId, NewStatus = newStatus });
    }

    public async Task<(InvitePreviewRow? Preview, IEnumerable<AcceptedPlayerRow> Players)> GetPreviewWithPlayersAsync(string token)
    {
        using var connection = _connectionFactory.CreateConnection();
        using var grid = await connection.QueryMultipleAsync(
            """
            SELECT m.id                                                 AS MatchId,
                   s.name                                              AS SportName,
                   b.booking_date                                      AS MatchDate,
                   b.start_time                                        AS StartTime,
                   b.end_time                                          AS EndTime,
                   p.name                                              AS PitchName,
                   c.name                                              AS CityName,
                   u.username                                          AS OrganizerName,
                   m.max_players                                       AS MaxPlayers,
                   COUNT(mp.id)::int                                   AS CurrentPlayers,
                   ROUND(b.total_price / NULLIF(m.max_players, 0), 2) AS PricePerPlayer,
                   (inv.expires_at IS NOT NULL
                    AND inv.expires_at < NOW())                        AS IsExpired,
                   m.is_open_to_join                                   AS IsOpenToJoin
            FROM   invitations        inv
            JOIN   matches            m   ON m.id  = inv.match_id
            JOIN   bookings           b   ON b.id  = m.booking_id
            JOIN   users              u   ON u.id  = b.user_id
            JOIN   pitches            p   ON p.id  = b.pitch_id
            JOIN   sport_types        s   ON s.id  = p.sport_type_id
            JOIN   cities             c   ON c.id  = p.city_id
            LEFT JOIN match_participants mp ON mp.match_id = m.id AND mp.status = 'accepted'
            WHERE  inv.token            = @Token
              AND  inv.invited_user_id IS NULL
            GROUP  BY m.id, s.name, b.booking_date, b.start_time, b.end_time,
                      p.name, c.name, u.username, m.max_players, b.total_price,
                      inv.expires_at, m.is_open_to_join;

            SELECT u.username AS Username
            FROM   invitations        inv
            JOIN   match_participants mp ON mp.match_id = inv.match_id AND mp.status = 'accepted'
            JOIN   users              u  ON u.id = mp.user_id
            WHERE  inv.token            = @Token
              AND  inv.invited_user_id IS NULL
            ORDER  BY u.username ASC
            """,
            new { Token = token });

        var preview = await grid.ReadSingleOrDefaultAsync<InvitePreviewRow>();
        var players = preview is null
            ? Enumerable.Empty<AcceptedPlayerRow>()
            : (await grid.ReadAsync<AcceptedPlayerRow>()).ToList();

        return (preview, players);
    }

    public async Task<bool> TryAcceptParticipantAndInvitationAsync(
        int matchId, int userId, int maxPlayers, int invitationId)
    {
        await using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();
        await using var tx = await connection.BeginTransactionAsync();
        try
        {
            // Insert the user as a pending participant — if they're already one, do nothing.
            await connection.ExecuteAsync(
                """
                INSERT INTO match_participants (match_id, user_id)
                VALUES (@MatchId, @UserId)
                ON CONFLICT (match_id, user_id) DO NOTHING
                """,
                new { MatchId = matchId, UserId = userId }, tx);

            // Capacity-guarded flip: pending → accepted. Returns 0 when full OR already accepted.
            var flipped = await connection.ExecuteAsync(
                """
                UPDATE match_participants
                SET    status = 'accepted'::participant_status
                WHERE  match_id = @MatchId
                  AND  user_id  = @UserId
                  AND  status   = 'pending'::participant_status
                  AND  (SELECT COUNT(*) FROM match_participants
                        WHERE  match_id = @MatchId AND status = 'accepted') < @MaxPlayers
                """,
                new { MatchId = matchId, UserId = userId, MaxPlayers = maxPlayers }, tx);

            if (flipped == 0)
            {
                // Distinguish: already accepted (idempotent — still mark the invitation)
                // vs. match is full (reject).
                var alreadyAccepted = await connection.ExecuteScalarAsync<bool>(
                    """
                    SELECT EXISTS (
                        SELECT 1 FROM match_participants
                        WHERE match_id = @MatchId AND user_id = @UserId AND status = 'accepted'
                    )
                    """,
                    new { MatchId = matchId, UserId = userId }, tx);

                if (!alreadyAccepted)
                {
                    await tx.RollbackAsync();
                    return false;
                }
            }

            await connection.ExecuteAsync(
                """
                UPDATE invitations
                SET    status = 'accepted'::invitation_status
                WHERE  id              = @InvitationId
                  AND  invited_user_id = @UserId
                  AND  status          = 'pending'
                """,
                new { InvitationId = invitationId, UserId = userId }, tx);

            await tx.CommitAsync();
            return true;
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }
}
