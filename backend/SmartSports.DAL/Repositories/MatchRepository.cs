using Dapper;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Match;
using SmartSports.DAL.Parameters;
using SmartSports.Domain.Entities.Projections;
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

    public async Task<(IEnumerable<OpenMatchRow> Items, long TotalCount)> ListOpenAsync(
        MatchFilterParams filters)
    {
        using var connection = _connectionFactory.CreateConnection();

        // Base conditions that always apply
        var conditions = new List<string>
        {
            "m.is_open_to_join = TRUE",
            "b.booking_date    >= CURRENT_DATE",
            "p.deleted_at      IS NULL",
            "p.status          = 1",    // PitchStatus.Approved
        };
        var parameters = new DynamicParameters();

        // Optional filters — user input goes through Dapper params, never string-interpolated
        if (!string.IsNullOrWhiteSpace(filters.Sport))
        {
            conditions.Add("LOWER(s.name) = LOWER(@Sport)");
            parameters.Add("Sport", filters.Sport);
        }
        if (!string.IsNullOrWhiteSpace(filters.City))
        {
            conditions.Add("LOWER(c.name) = LOWER(@City)");
            parameters.Add("City", filters.City);
        }

        var where = string.Join(" AND ", conditions);
        parameters.Add("PageSize", filters.PageSize);
        parameters.Add("Offset",   (filters.Page - 1) * filters.PageSize);

        // COUNT wraps the GROUP BY + HAVING in a subquery so COUNT(*) sees one row per match
        var countSql = $"""
            SELECT COUNT(*) FROM (
                SELECT m.id
                FROM   matches              m
                JOIN   bookings             b  ON b.id = m.booking_id
                JOIN   pitches              p  ON p.id = b.pitch_id
                JOIN   sport_types          s  ON s.id = p.sport_type_id
                JOIN   cities               c  ON c.id = p.city_id
                LEFT JOIN match_participants mp ON mp.match_id = m.id AND mp.status = 'accepted'
                WHERE  {where}
                GROUP  BY m.id, m.max_players
                HAVING COUNT(mp.id) < m.max_players
            ) sub
            """;

        // Data query: LEFT JOIN filters in the ON clause so matches with 0 participants are included.
        // HAVING removes full matches. ::int cast avoids bigint→int mapping mismatch in Dapper.
        var dataSql = $"""
            SELECT m.id                AS MatchId,
                   p.name              AS PitchName,
                   c.name              AS CityName,
                   s.name              AS SportName,
                   b.booking_date      AS BookingDate,
                   b.start_time        AS StartTime,
                   b.end_time          AS EndTime,
                   COUNT(mp.id)::int   AS AcceptedCount,
                   m.max_players       AS MaxPlayers
            FROM   matches              m
            JOIN   bookings             b  ON b.id = m.booking_id
            JOIN   pitches              p  ON p.id = b.pitch_id
            JOIN   sport_types          s  ON s.id = p.sport_type_id
            JOIN   cities               c  ON c.id = p.city_id
            LEFT JOIN match_participants mp ON mp.match_id = m.id AND mp.status = 'accepted'
            WHERE  {where}
            GROUP  BY m.id, p.name, c.name, s.name,
                      b.booking_date, b.start_time, b.end_time, m.max_players
            HAVING COUNT(mp.id) < m.max_players
            ORDER  BY b.booking_date ASC, b.start_time ASC, m.id ASC
            LIMIT  @PageSize OFFSET @Offset
            """;

        var total = await connection.ExecuteScalarAsync<long>(countSql, parameters);
        var items = await connection.QueryAsync<OpenMatchRow>(dataSql, parameters);
        return (items, total);
    }
}
