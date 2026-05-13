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
            SELECT id, owner_id, city_id, sport_type_id, name, address,
                   price_per_hour, rating, latitude, longitude,
                   is_active, is_approved, max_booking_duration_minutes,
                   created_at, deleted_at
            FROM pitches
            WHERE id = @PitchId
            """,
            new { PitchId = pitchId });
    }

    public async Task<(IEnumerable<PitchListRow> Items, long TotalCount)> ListAsync(
        string? sport, int page, int pageSize)
    {
        using var connection = _connectionFactory.CreateConnection();

        var where = new List<string>
        {
            "p.is_active = TRUE",
            "p.is_approved = TRUE",
            "p.deleted_at IS NULL",
        };
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
                    p.is_active,
                    p.is_approved,
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
            r.MaxBookingDurationMinutes,
            r.IsActive,
            r.IsApproved));

        var totalCount = list.FirstOrDefault()?.TotalCount ?? 0L;
        return (items, totalCount);
    }

    public async Task<IEnumerable<PitchListRow>> ListByOwnerAsync(int ownerId)
    {
        using var connection = _connectionFactory.CreateConnection();

        var rows = await connection.QueryAsync<PitchListRow>(
            """
            SELECT  p.id,
                    p.name,
                    p.address,
                    p.price_per_hour,
                    p.rating,
                    s.name AS sport_name,
                    p.max_booking_duration_minutes,
                    p.is_active,
                    p.is_approved
            FROM    pitches     p
            JOIN    sport_types s ON s.id = p.sport_type_id
            WHERE   p.owner_id   = @OwnerId
              AND   p.deleted_at IS NULL
            ORDER BY p.created_at DESC
            """,
            new { OwnerId = ownerId });

        return rows;
    }

    public async Task<int> InsertAsync(PitchEntity pitch)
    {
        using var connection = _connectionFactory.CreateConnection();

        return await connection.ExecuteScalarAsync<int>(
            """
            INSERT INTO pitches (
                owner_id, city_id, sport_type_id, name, address,
                price_per_hour, latitude, longitude,
                is_active, is_approved, max_booking_duration_minutes
            )
            VALUES (
                @OwnerId, @CityId, @SportTypeId, @Name, @Address,
                @PricePerHour, @Latitude, @Longitude,
                @IsActive, @IsApproved, @MaxBookingDurationMinutes
            )
            RETURNING id
            """,
            pitch);
    }

    public async Task<bool> UpdateAsync(PitchEntity pitch)
    {
        using var connection = _connectionFactory.CreateConnection();

        var rows = await connection.ExecuteAsync(
            """
            UPDATE pitches
            SET    city_id                      = @CityId,
                   sport_type_id                = @SportTypeId,
                   name                         = @Name,
                   address                      = @Address,
                   price_per_hour               = @PricePerHour,
                   latitude                     = @Latitude,
                   longitude                    = @Longitude,
                   max_booking_duration_minutes = @MaxBookingDurationMinutes,
                   is_active                    = @IsActive
            WHERE  id         = @Id
              AND  deleted_at IS NULL
            """,
            pitch);

        return rows > 0;
    }

    public async Task<bool> SoftDeleteAsync(int pitchId)
    {
        using var connection = _connectionFactory.CreateConnection();

        var rows = await connection.ExecuteAsync(
            """
            UPDATE pitches
            SET    deleted_at = NOW()
            WHERE  id         = @PitchId
              AND  deleted_at IS NULL
            """,
            new { PitchId = pitchId });

        return rows > 0;
    }

    private record PitchListRowWithCount(
        int Id, string Name, string Address, decimal PricePerHour,
        decimal? Rating, int MaxBookingDurationMinutes,
        bool IsActive, bool IsApproved, string SportName, long TotalCount);
}
