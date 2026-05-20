using Dapper;
using Npgsql;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Invitation;
using SmartSports.Domain.Entities;
using SmartSports.Domain.Entities.Projections;
using SmartSports.Domain.Exceptions;

namespace SmartSports.DAL.Repositories;

public class InvitationRepository : IInvitationRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public InvitationRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<int> CreateAsync(Invitation invitation)
    {
        using var connection = _connectionFactory.CreateConnection();
        try
        {
            return await connection.ExecuteScalarAsync<int>(
                """
                INSERT INTO invitations
                    (match_id, invited_by_id, invited_user_id, expires_at, token, status)
                VALUES
                    (@MatchId, @InvitedById, @InvitedUserId, @ExpiresAt, @Token, @Status::invitation_status)
                RETURNING id
                """,
                invitation);
        }
        catch (PostgresException ex) when (ex.SqlState == "23505")
        {
            // Partial unique index uq_invitations_pending (migration 022) caught a
            // concurrent insert that slipped past ExistsPendingAsync's TOCTOU window.
            // Translate to ConflictException so the controller returns 409 — same
            // shape the application-level check produces on the non-racy path.
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
                WHERE match_id = @MatchId
                  AND invited_user_id = @InvitedUserId
                  AND status = 'pending'
            )
            """,
            new { MatchId = matchId, InvitedUserId = invitedUserId });
    }

    public async Task<IEnumerable<PendingInvitationRow>> GetPendingByUserIdAsync(int userId)
    {
        using var connection = _connectionFactory.CreateConnection();
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
                   (m.max_players - (
                       SELECT COUNT(*) FROM match_participants mp
                       WHERE  mp.match_id = m.id AND mp.status = 'accepted'
                   ))::int          AS SpotsLeft,
                   ROUND(b.total_price / NULLIF(m.max_players, 0), 2) AS PricePerPlayer
            FROM   invitations   i
            JOIN   matches       m  ON m.id  = i.match_id
            JOIN   bookings      b  ON b.id  = m.booking_id
            JOIN   pitches       p  ON p.id  = b.pitch_id
            JOIN   sport_types   st ON st.id = p.sport_type_id
            JOIN   users         u  ON u.id  = i.invited_by_id
            WHERE  i.invited_user_id = @UserId
              AND  i.status          = 'pending'
              AND  (i.expires_at IS NULL OR i.expires_at > NOW())
            ORDER  BY i.id DESC
            """,
            new { UserId = userId });
    }

    public async Task<Invitation?> GetPendingByIdAsync(int invitationId, int userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<Invitation>(
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
            """,
            new { InvitationId = invitationId, UserId = userId, NewStatus = newStatus });
    }
}
