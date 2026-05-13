using Dapper;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Pitch;
using SmartSports.DAL.Parameters;
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

    public async Task<PitchDetailRow?> GetDetailAsync(int pitchId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<PitchDetailRow>(
            """
            SELECT p.id,
                   p.owner_id,
                   p.name,
                   s.name  AS sport_type_name,
                   c.name  AS city_name,
                   p.address,
                   p.price_per_hour,
                   p.rating,
                   p.max_booking_duration_minutes
            FROM   pitches     p
            JOIN   sport_types s ON s.id = p.sport_type_id
            JOIN   cities      c ON c.id = p.city_id
            WHERE  p.id          = @PitchId
              AND  p.is_active   = TRUE
              AND  p.is_approved = TRUE
            """,
            new { PitchId = pitchId });
    }

    public async Task<IEnumerable<string>> GetImagesAsync(int pitchId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QueryAsync<string>(
            """
            SELECT image_url
            FROM   pitch_images
            WHERE  pitch_id = @PitchId
            ORDER  BY id
            """,
            new { PitchId = pitchId });
    }

    public async Task<IEnumerable<ScheduleRow>> GetScheduleAsync(int pitchId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QueryAsync<ScheduleRow>(
            """
            SELECT pitch_id,
                   CAST(day_of_week AS INTEGER) AS day_of_week,
                   open_time,
                   close_time,
                   is_active
            FROM   pitch_weekly_schedules
            WHERE  pitch_id = @PitchId
            ORDER  BY day_of_week
            """,
            new { PitchId = pitchId });
    }

    public async Task<(IEnumerable<PitchListRow> Items, long TotalCount)> ListAsync(PitchFilterParams filters)
    {
        using var connection = _connectionFactory.CreateConnection();

        // Build WHERE clause — user values go through Dapper parameters, never interpolated.
        var conditions = new List<string>
        {
            "p.is_active  = TRUE",
            "p.is_approved = TRUE",
        };

        if (!string.IsNullOrWhiteSpace(filters.Search))
            conditions.Add("(LOWER(p.name) LIKE LOWER(@SearchPattern) ESCAPE '\\' OR LOWER(p.address) LIKE LOWER(@SearchPattern) ESCAPE '\\')");

        if (!string.IsNullOrWhiteSpace(filters.Sport))
            conditions.Add("LOWER(s.name) = LOWER(@Sport)");

        if (!string.IsNullOrWhiteSpace(filters.City))
            conditions.Add("LOWER(c.name) = LOWER(@City)");

        if (filters.MaxPrice.HasValue)
            conditions.Add("p.price_per_hour <= @MaxPrice");

        // ORDER BY comes from a closed whitelist — never user input.
        var orderBy = filters.SortBy switch
        {
            "price_asc"   => "p.price_per_hour ASC,  p.id DESC",
            "price_desc"  => "p.price_per_hour DESC, p.id DESC",
            "rating_desc" => "p.rating DESC NULLS LAST, p.created_at DESC, p.id DESC",
            _             => "p.created_at DESC, p.id DESC",
        };

        var sql = $"""
            SELECT  p.id,
                    p.name,
                    p.address,
                    p.price_per_hour,
                    p.rating,
                    p.max_booking_duration_minutes,
                    s.name              AS sport_name,
                    c.name              AS city_name,
                    cover.image_url     AS cover_image_url,
                    COUNT(*) OVER()     AS total_count
            FROM    pitches             p
            JOIN    sport_types         s    ON s.id = p.sport_type_id
            JOIN    cities              c    ON c.id = p.city_id
            LEFT JOIN LATERAL (
                SELECT image_url
                FROM   pitch_images
                WHERE  pitch_id = p.id
                ORDER BY id
                LIMIT  1
            ) cover ON TRUE
            WHERE   {string.Join(" AND ", conditions)}
            ORDER BY {orderBy}
            LIMIT   @PageSize
            OFFSET  @Offset
            """;

        var rows = await connection.QueryAsync<PitchListRowWithCount>(
            sql,
            new
            {
                SearchPattern = $"%{EscapeLike(filters.Search?.Trim())}%",
                Sport         = filters.Sport,
                City          = filters.City,
                MaxPrice      = filters.MaxPrice,
                PageSize      = filters.PageSize,
                Offset        = (filters.Page - 1) * filters.PageSize,
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
            r.CityName,
            r.CoverImageUrl));

        var totalCount = list.FirstOrDefault()?.TotalCount ?? 0L;
        return (items, totalCount);
    }

    private static string EscapeLike(string? value) =>
        (value ?? string.Empty)
            .Replace(@"\", @"\\")
            .Replace("%",  @"\%")
            .Replace("_",  @"\_");

    private record PitchListRowWithCount(
        int      Id,
        string   Name,
        string   Address,
        decimal  PricePerHour,
        decimal? Rating,
        int      MaxBookingDurationMinutes,
        string   SportName,
        string   CityName,
        string?  CoverImageUrl,
        long     TotalCount);
}
