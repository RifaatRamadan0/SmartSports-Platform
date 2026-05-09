using Dapper;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Pitch;
using SmartSports.Domain.Entities.Projections;
using PitchEntity = SmartSports.Domain.Entities.Pitch;

namespace SmartSports.DAL.Repositories;

public class PitchRepository : IPitchRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public PitchRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<PitchEntity?> GetByIdAsync(int pitchId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<PitchEntity>(
            """
            SELECT id, owner_id, name, price_per_hour, is_active, is_approved, max_booking_duration_minutes
            FROM pitches
            WHERE id = @PitchId
            """,
            new { PitchId = pitchId });
    }

    public async Task<(IEnumerable<PitchListRow> Items, long TotalCount)> ListAsync(
        string? sport, int page, int pageSize)
    {
        using var connection = _connectionFactory.CreateConnection();

        var where = new List<string> { "p.is_active = TRUE", "p.is_approved = TRUE" };
        if (!string.IsNullOrWhiteSpace(sport))
            where.Add("LOWER(s.name) = LOWER(@Sport)");

        var whereClause = string.Join(" AND ", where);

        var sql = $"""
            SELECT  p.id,
                    p.name,
                    p.address,
                    p.price_per_hour,
                    p.rating,
                    p.max_booking_duration_minutes,
                    s.name                        AS sport_name,
                    COUNT(*) OVER()               AS total_count
            FROM    pitches     p
            JOIN    sport_types s ON s.id = p.sport_type_id
            WHERE   {whereClause}
            ORDER BY p.created_at DESC
            LIMIT   @PageSize
            OFFSET  @Offset
            """;

        var rows = await connection.QueryAsync<PitchListRowWithCount>(
            sql,
            new
            {
                Sport    = sport,
                PageSize = pageSize,
                Offset   = (page - 1) * pageSize,
            });

        var list = rows.ToList();

        var items = list.Select(r => new PitchListRow(
            r.Id,
            r.Name,
            r.Address,
            r.PricePerHour,
            r.Rating,
            r.SportName,
            r.MaxBookingDurationMinutes));

        var totalCount = list.FirstOrDefault()?.TotalCount ?? 0L;
        return (items, totalCount);
    }

    private record PitchListRowWithCount(
        int Id, string Name, string Address, decimal PricePerHour,
        decimal? Rating, int MaxBookingDurationMinutes, string SportName, long TotalCount);
}
