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
            SELECT id, owner_id, city_id, sport_type_id, name, address,
                   price_per_hour, rating, latitude, longitude,
                   is_active, is_approved, max_booking_duration_minutes,
                   created_at, deleted_at
            FROM pitches
            WHERE id = @PitchId
            """,
            new { PitchId = pitchId });
    }

    public async Task<(IEnumerable<PitchListRow> Items, long TotalCount)> ListAsync(PitchFilterParams filters)
    {
        using var connection = _connectionFactory.CreateConnection();

        // Build WHERE clause — user values go through Dapper parameters, never interpolated.
        var conditions = new List<string>
        {
            "p.is_active   = TRUE",
            "p.is_approved = TRUE",
            "p.deleted_at  IS NULL",
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

        var whereClause = string.Join(" AND ", conditions);
        var parameters  = new
        {
            SearchPattern = $"%{EscapeLike(filters.Search?.Trim())}%",
            Sport         = filters.Sport,
            City          = filters.City,
            MaxPrice      = filters.MaxPrice,
            PageSize      = filters.PageSize,
            Offset        = (filters.Page - 1) * filters.PageSize,
        };

        var countSql = $"""
            SELECT COUNT(*)
            FROM   pitches     p
            JOIN   sport_types s ON s.id = p.sport_type_id
            JOIN   cities      c ON c.id = p.city_id
            WHERE  {whereClause}
            """;

        var dataSql = $"""
            SELECT  p.id,
                    p.name,
                    p.address,
                    p.price_per_hour,
                    p.rating,
                    p.max_booking_duration_minutes,
                    s.name              AS sport_name,
                    c.name              AS city_name,
                    cover.image_url     AS cover_image_url,
                    p.is_active,
                    p.is_approved
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
            WHERE   {whereClause}
            ORDER BY {orderBy}
            LIMIT   @PageSize
            OFFSET  @Offset
            """;

        var totalCount = await connection.ExecuteScalarAsync<long>(countSql, parameters);
        var items      = await connection.QueryAsync<PitchListRow>(dataSql, parameters);

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
                    s.name              AS sport_name,
                    p.max_booking_duration_minutes,
                    c.name              AS city_name,
                    cover.image_url     AS cover_image_url,
                    p.is_active,
                    p.is_approved
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

    private static string EscapeLike(string? value) =>
        (value ?? string.Empty)
            .Replace(@"\", @"\\")
            .Replace("%",  @"\%")
            .Replace("_",  @"\_");


}
