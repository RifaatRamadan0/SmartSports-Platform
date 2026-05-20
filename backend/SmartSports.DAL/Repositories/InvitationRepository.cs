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

    public async Task<InvitePreviewRow?> GetPreviewByTokenAsync(string token)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<InvitePreviewRow>(
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
                    AND inv.expires_at < NOW())                        AS IsExpired
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
                      inv.expires_at
            """,
            new { Token = token });
    }

    public async Task<IEnumerable<AcceptedPlayerRow>> GetAcceptedPlayersAsync(int matchId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QueryAsync<AcceptedPlayerRow>(
            """
            SELECT u.id AS UserId, u.username AS Username
            FROM   match_participants mp
            JOIN   users             u  ON u.id = mp.user_id
            WHERE  mp.match_id = @MatchId
              AND  mp.status   = 'accepted'
            ORDER  BY u.username ASC
            """,
            new { MatchId = matchId });
    }
}
