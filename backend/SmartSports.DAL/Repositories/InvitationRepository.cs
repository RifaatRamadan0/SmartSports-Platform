using Dapper;
using Npgsql;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Invitation;
using SmartSports.Domain.Entities;
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
}
