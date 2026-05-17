using Dapper;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Match;
using MatchEntity = SmartSports.Domain.Entities.Match;

namespace SmartSports.DAL.Repositories;

public class MatchRepository : IMatchRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public MatchRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<MatchEntity?> GetByIdAsync(int matchId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<MatchEntity>(
            """
            SELECT m.id,
                   m.booking_id,
                   m.is_open_to_join,
                   m.max_players,
                   b.user_id AS booking_owner_id
            FROM   matches  m
            JOIN   bookings b ON b.id = m.booking_id
            WHERE  m.id = @MatchId
            """,
            new { MatchId = matchId });
    }

    public async Task<MatchEntity?> GetByBookingIdAsync(int bookingId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<MatchEntity>(
            """
            SELECT m.id,
                   m.booking_id,
                   m.is_open_to_join,
                   m.max_players,
                   b.user_id AS booking_owner_id
            FROM   matches  m
            JOIN   bookings b ON b.id = m.booking_id
            WHERE  m.booking_id = @BookingId
            """,
            new { BookingId = bookingId });
    }

    public async Task<bool> UpdateVisibilityAsync(int matchId, bool isOpenToJoin)
    {
        using var connection = _connectionFactory.CreateConnection();
        var rows = await connection.ExecuteAsync(
            "UPDATE matches SET is_open_to_join = @IsOpen WHERE id = @MatchId",
            new { MatchId = matchId, IsOpen = isOpenToJoin });
        return rows > 0;
    }
}
