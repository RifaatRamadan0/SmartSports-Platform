using Dapper;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Match;
using SmartSports.DAL.Parameters;
using SmartSports.Domain.Entities.Projections;
using SmartSports.Domain.Enums;
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
                   b.user_id       AS booking_owner_id,
                   b.status::TEXT  AS booking_status,
                   b.booking_date  AS booking_date,
                   b.start_time    AS start_time
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

    public async Task<bool> IsParticipantAsync(int matchId, int userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        // Only 'accepted' and 'pending' count as "in the match" for invitation purposes.
        // A user with status='rejected' previously declined and can be re-invited; if
        // every status blocked re-invitation, declining would be a one-way door.
        return await connection.ExecuteScalarAsync<bool>(
            """
            SELECT EXISTS (
                SELECT 1 FROM match_participants
                WHERE match_id = @MatchId
                  AND user_id  = @UserId
                  AND status IN ('accepted', 'pending')
            )
            """,
            new { MatchId = matchId, UserId = userId });
    }

    public async Task<bool> IsAcceptedParticipantAsync(int matchId, int userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<bool>(
            """
            SELECT EXISTS (
                SELECT 1 FROM match_participants
                WHERE match_id = @MatchId
                  AND user_id  = @UserId
                  AND status   = 'accepted'
            )
            """,
            new { MatchId = matchId, UserId = userId });
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
            "p.status          = @ApprovedStatus",
        };
        var parameters = new DynamicParameters();
        parameters.Add("ApprovedStatus", (short)PitchStatus.Approved);

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

        // One round-trip: a CTE produces the post-GROUP-BY/HAVING result set, and
        // COUNT(*) OVER() returns the unpaginated total alongside every page row.
        // Mirrors the BookingRepository.GetByUserIdAsync pattern.
        var sql = $"""
            WITH filtered AS (
                SELECT m.id                                              AS MatchId,
                       p.name                                            AS PitchName,
                       c.name                                            AS CityName,
                       s.name                                            AS SportName,
                       b.booking_date                                    AS BookingDate,
                       b.start_time                                      AS StartTime,
                       b.end_time                                        AS EndTime,
                       COUNT(mp.id)::int                                 AS AcceptedCount,
                       m.max_players                                     AS MaxPlayers,
                       u.username                                        AS OrganizerName,
                       u.id                                              AS OrganizerId,
                       b.total_price                                     AS TotalPrice,
                       ROUND(b.total_price / NULLIF(m.max_players, 0), 2) AS PricePerPlayer
                FROM   matches              m
                JOIN   bookings             b  ON b.id  = m.booking_id
                JOIN   users                u  ON u.id  = b.user_id
                JOIN   pitches              p  ON p.id  = b.pitch_id
                JOIN   sport_types          s  ON s.id  = p.sport_type_id
                JOIN   cities               c  ON c.id  = p.city_id
                LEFT JOIN match_participants mp ON mp.match_id = m.id AND mp.status = 'accepted'
                WHERE  {where}
                GROUP  BY m.id, p.name, c.name, s.name,
                          b.booking_date, b.start_time, b.end_time,
                          m.max_players, b.total_price, u.username, u.id
                HAVING COUNT(mp.id) < m.max_players
            )
            SELECT MatchId, PitchName, CityName, SportName,
                   BookingDate, StartTime, EndTime,
                   AcceptedCount, MaxPlayers, OrganizerName,
                   OrganizerId, TotalPrice, PricePerPlayer,
                   COUNT(*) OVER() AS TotalCount
            FROM   filtered
            ORDER  BY BookingDate ASC, StartTime ASC, MatchId ASC
            LIMIT  @PageSize OFFSET @Offset
            """;

        var rows  = (await connection.QueryAsync<OpenMatchRowWithCount>(sql, parameters)).ToList();
        var total = rows.FirstOrDefault()?.TotalCount ?? 0L;

        var items = rows.Select(r => new OpenMatchRow
        {
            MatchId        = r.MatchId,
            PitchName      = r.PitchName,
            CityName       = r.CityName,
            SportName      = r.SportName,
            BookingDate    = r.BookingDate,
            StartTime      = r.StartTime,
            EndTime        = r.EndTime,
            AcceptedCount  = r.AcceptedCount,
            MaxPlayers     = r.MaxPlayers,
            OrganizerName  = r.OrganizerName,
            OrganizerId    = r.OrganizerId,
            TotalPrice     = r.TotalPrice,
            PricePerPlayer = r.PricePerPlayer,
        });

        return (items, total);
    }

    public async Task<(MatchStatsRow Summary, IEnumerable<MatchCountByName> BySport, IEnumerable<MatchCountByName> ByCity)> GetStatsAsync()
    {
        using var connection = _connectionFactory.CreateConnection();

        var parameters = new { ApprovedStatus = (short)PitchStatus.Approved };

        // Open-match subquery reused across all three queries for consistency
        const string openMatchesCte = """
            WITH open_matches AS (
                SELECT m.id,
                       b.total_price,
                       m.max_players,
                       c.id   AS city_id,
                       c.name AS city_name,
                       s.name AS sport_name
                FROM   matches              m
                JOIN   bookings             b  ON b.id = m.booking_id
                JOIN   pitches              p  ON p.id = b.pitch_id
                JOIN   sport_types          s  ON s.id = p.sport_type_id
                JOIN   cities               c  ON c.id = p.city_id
                LEFT JOIN match_participants mp ON mp.match_id = m.id AND mp.status = 'accepted'
                WHERE  m.is_open_to_join = TRUE
                  AND  b.booking_date   >= CURRENT_DATE
                  AND  p.deleted_at      IS NULL
                  AND  p.status          = @ApprovedStatus
                GROUP  BY m.id, b.total_price, m.max_players, c.id, c.name, s.name
                HAVING COUNT(mp.id) < m.max_players
            )
            """;

        const string summarySql = openMatchesCte + """

            SELECT COUNT(*)::bigint           AS OpenGamesCount,
                   COUNT(DISTINCT city_id)::bigint AS CitiesCount
            FROM   open_matches
            """;

        const string bySportSql = openMatchesCte + """

            SELECT sport_name AS Name, COUNT(*)::int AS Count
            FROM   open_matches
            GROUP  BY sport_name
            ORDER  BY Count DESC
            """;

        const string byCitySql = openMatchesCte + """

            SELECT city_name AS Name, COUNT(*)::int AS Count
            FROM   open_matches
            GROUP  BY city_name
            ORDER  BY Count DESC
            """;

        // Single round-trip: Npgsql sends all three statements in one command and returns
        // three result sets. The CTE itself is still re-parsed per statement (PostgreSQL
        // CTE scope is per-statement in a multi-statement batch), but we save 2 network
        // round-trips — which is the dominant cost from the API side.
        const string combinedSql = summarySql + ";\n" + bySportSql + ";\n" + byCitySql + ";";

        using var grid = await connection.QueryMultipleAsync(combinedSql, parameters);
        var summary = await grid.ReadSingleAsync<MatchStatsRow>();
        var bySport = (await grid.ReadAsync<MatchCountByName>()).ToList();
        var byCity  = (await grid.ReadAsync<MatchCountByName>()).ToList();

        return (summary, bySport, byCity);
    }

    // Flat row used by ListOpenAsync to carry both the open-match columns and the
    // unpaginated total returned by COUNT(*) OVER(). Mirrors BookingWithCount.
    private record OpenMatchRowWithCount(
        int      MatchId,
        string   PitchName,
        string   CityName,
        string   SportName,
        DateOnly BookingDate,
        TimeOnly StartTime,
        TimeOnly EndTime,
        int      AcceptedCount,
        int      MaxPlayers,
        string   OrganizerName,
        int      OrganizerId,
        decimal  TotalPrice,
        decimal  PricePerPlayer,
        long     TotalCount);
}
