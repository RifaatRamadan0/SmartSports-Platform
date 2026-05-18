using Dapper;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Match;

namespace SmartSports.DAL.Repositories;

public class MatchRepository : IMatchRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public MatchRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<Domain.Entities.Match?> GetByIdAsync(int matchId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<Domain.Entities.Match>(
            """
            SELECT id, booking_id, is_open_to_join, max_players
            FROM matches
            WHERE id = @MatchId
            """,
            new { MatchId = matchId });
    }

    public async Task<int?> GetOwnerUserIdAsync(int matchId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<int?>(
            """
            SELECT b.user_id
            FROM matches m
            JOIN bookings b ON b.id = m.booking_id
            WHERE m.id = @MatchId
            """,
            new { MatchId = matchId });
    }

    public async Task<bool> IsParticipantAsync(int matchId, int userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<bool>(
            """
            SELECT EXISTS (
                SELECT 1 FROM match_participants
                WHERE match_id = @MatchId AND user_id = @UserId
            )
            """,
            new { MatchId = matchId, UserId = userId });
    }
}
