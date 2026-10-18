using Dapper;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Pitch;
using SmartSports.DAL.Parameters;
using SmartSports.Domain.Entities.Projections;
using SmartSports.Domain.Enums;
using PitchEntity = SmartSports.Domain.Entities.Pitch;

namespace SmartSports.DAL.Repositories.Pitch;
// Imported inside the namespace so entity types resolve before the sibling
// SmartSports.DAL.Repositories.* namespaces that share their names.
using SmartSports.Domain.Entities;

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
                   is_active, status, rejection_reason,
                   max_booking_duration_minutes, capacity, created_at, deleted_at
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
                   p.rating_count,
                   p.max_booking_duration_minutes,
                   p.capacity
            FROM   pitches     p
            JOIN   sport_types s ON s.id = p.sport_type_id
            JOIN   cities      c ON c.id = p.city_id
            WHERE  p.id         = @PitchId
              AND  p.is_active  = TRUE
              AND  p.status     = @Status
              AND  p.deleted_at IS NULL
            """,
            new { PitchId = pitchId, Status = (int)PitchStatus.Approved });
    }

    public async Task<bool> ExistsVisibleAsync(int pitchId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<bool>(
            """
            SELECT EXISTS (
                SELECT 1
                FROM   pitches
                WHERE  id         = @PitchId
                  AND  is_active  = TRUE
                  AND  status     = @Status
                  AND  deleted_at IS NULL
            )
            """,
            new { PitchId = pitchId, Status = (int)PitchStatus.Approved });
    }

    public async Task<IEnumerable<string>> GetImagesAsync(int pitchId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QueryAsync<string>(
            """
            SELECT image_url
            FROM   pitch_images
            WHERE  pitch_id = @PitchId
            ORDER  BY is_cover DESC, display_order, id
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

    public async Task<(PitchDetailRow? Detail, IEnumerable<string> Images, IEnumerable<ScheduleRow> Schedule, IEnumerable<ReviewRow> Reviews)>
        GetDetailWithDataAsync(int pitchId, int? currentUserId = null, int reviewCount = 5)
    {
        using var connection = _connectionFactory.CreateConnection();
        using var multi = await connection.QueryMultipleAsync(
            """
            SELECT p.id,
                   p.owner_id,
                   p.name,
                   s.name  AS sport_type_name,
                   c.name  AS city_name,
                   p.address,
                   p.price_per_hour,
                   p.rating,
                   p.rating_count,
                   p.max_booking_duration_minutes,
                   p.capacity,
                   EXISTS (
                       SELECT 1 FROM user_favorite_pitches f
                       WHERE  f.pitch_id = p.id AND f.user_id = @CurrentUserId
                   )       AS is_favorited
            FROM   pitches     p
            JOIN   sport_types s ON s.id = p.sport_type_id
            JOIN   cities      c ON c.id = p.city_id
            WHERE  p.id         = @PitchId
              AND  p.is_active  = TRUE
              AND  p.status     = @Status
              AND  p.deleted_at IS NULL;

            SELECT image_url
            FROM   pitch_images
            WHERE  pitch_id = @PitchId
            ORDER  BY is_cover DESC, display_order, id;

            SELECT pitch_id,
                   CAST(day_of_week AS INTEGER) AS day_of_week,
                   open_time,
                   close_time,
                   is_active
            FROM   pitch_weekly_schedules
            WHERE  pitch_id = @PitchId
            ORDER  BY day_of_week;

            SELECT r.id,
                   u.username  AS reviewer_name,
                   r.rating,
                   r.comment,
                   r.created_at
            FROM   reviews r
            JOIN   users   u ON u.id = r.user_id
            WHERE  r.pitch_id = @PitchId
            ORDER  BY r.created_at DESC
            LIMIT  @ReviewCount
            """,
            new { PitchId = pitchId, Status = (int)PitchStatus.Approved, ReviewCount = reviewCount, CurrentUserId = currentUserId });

        var detail   = await multi.ReadSingleOrDefaultAsync<PitchDetailRow>();
        var images   = (await multi.ReadAsync<string>()).ToList();
        var schedule = (await multi.ReadAsync<ScheduleRow>()).ToList();
        var reviews  = (await multi.ReadAsync<ReviewRow>()).ToList();

        return (detail, images, schedule, reviews);
    }

    public async Task<(IEnumerable<PitchListRow> Items, long TotalCount)> ListAsync(PitchFilterParams filters, int? currentUserId = null)
    {
        using var connection = _connectionFactory.CreateConnection();

        // Build WHERE clause — user values go through Dapper parameters, never interpolated.
        var conditions = new List<string>
        {
            "p.is_active  = TRUE",
            "p.status     = @ApprovedStatus",
            "p.deleted_at IS NULL",
        };

        if (!string.IsNullOrWhiteSpace(filters.Search))
            conditions.Add("(LOWER(p.name) LIKE LOWER(@SearchPattern) ESCAPE '\\' OR LOWER(p.address) LIKE LOWER(@SearchPattern) ESCAPE '\\')");

        if (!string.IsNullOrWhiteSpace(filters.Sport))
            conditions.Add("LOWER(s.name) = LOWER(@Sport)");

        if (!string.IsNullOrWhiteSpace(filters.City))
            conditions.Add("LOWER(c.name) = LOWER(@City)");

        if (filters.MaxPrice.HasValue)
            conditions.Add("p.price_per_hour <= @MaxPrice");

        // Date filter: keep only pitches open on the selected date's weekday.
        // pitch_weekly_schedules.day_of_week is 0=Sunday..6=Saturday, matching EXTRACT(DOW).
        if (filters.Date.HasValue)
            conditions.Add("""
                EXISTS (
                    SELECT 1 FROM pitch_weekly_schedules ws
                    WHERE ws.pitch_id    = p.id
                      AND ws.is_active   = TRUE
                      AND ws.day_of_week = CAST(EXTRACT(DOW FROM @FilterDate::date) AS INTEGER)
                )
                """);

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
            SearchPattern  = $"%{EscapeLike(filters.Search?.Trim())}%",
            Sport          = filters.Sport,
            City           = filters.City,
            MaxPrice       = filters.MaxPrice,
            FilterDate     = filters.Date,
            PageSize       = filters.PageSize,
            Offset         = (filters.Page - 1) * filters.PageSize,
            ApprovedStatus = (int)PitchStatus.Approved,
            CurrentUserId  = currentUserId,
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
                    p.rating_count,
                    p.max_booking_duration_minutes,
                    p.capacity,
                    s.name              AS sport_name,
                    c.name              AS city_name,
                    cover.image_url     AS cover_image_url,
                    (SELECT COUNT(*) FROM pitch_images WHERE pitch_id = p.id) AS image_count,
                    p.is_active,
                    p.status,
                    EXISTS (
                        SELECT 1 FROM user_favorite_pitches f
                        WHERE  f.pitch_id = p.id AND f.user_id = @CurrentUserId
                    )                   AS is_favorited
            FROM    pitches             p
            JOIN    sport_types         s    ON s.id = p.sport_type_id
            JOIN    cities              c    ON c.id = p.city_id
            LEFT JOIN LATERAL (
                SELECT image_url
                FROM   pitch_images
                WHERE  pitch_id = p.id
                ORDER BY is_cover DESC, display_order, id
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

    public async Task<(IEnumerable<PitchListRow> Items, long TotalCount)> ListByOwnerAsync(int ownerId, int page, int pageSize)
    {
        using var connection = _connectionFactory.CreateConnection();

        const string countSql = """
            SELECT COUNT(*)
            FROM   pitches p
            WHERE  p.owner_id   = @OwnerId
              AND  p.deleted_at IS NULL
            """;

        const string dataSql = """
            SELECT  p.id,
                    p.name,
                    p.address,
                    p.price_per_hour,
                    p.rating,
                    p.rating_count,
                    s.name              AS sport_name,
                    p.max_booking_duration_minutes,
                    p.capacity,
                    c.name              AS city_name,
                    cover.image_url     AS cover_image_url,
                    (SELECT COUNT(*) FROM pitch_images WHERE pitch_id = p.id) AS image_count,
                    p.is_active,
                    p.status
            FROM    pitches             p
            JOIN    sport_types         s    ON s.id = p.sport_type_id
            JOIN    cities              c    ON c.id = p.city_id
            LEFT JOIN LATERAL (
                SELECT image_url
                FROM   pitch_images
                WHERE  pitch_id = p.id
                ORDER BY is_cover DESC, display_order, id
                LIMIT  1
            ) cover ON TRUE
            WHERE   p.owner_id   = @OwnerId
              AND   p.deleted_at IS NULL
            ORDER BY p.created_at DESC
            LIMIT   @PageSize
            OFFSET  @Offset
            """;

        var parameters = new { OwnerId = ownerId, PageSize = pageSize, Offset = (page - 1) * pageSize };
        var totalCount = await connection.ExecuteScalarAsync<long>(countSql, parameters);
        var items      = await connection.QueryAsync<PitchListRow>(dataSql, parameters);

        return (items, totalCount);
    }

    public async Task<int> InsertAsync(PitchEntity pitch)
    {
        using var connection = _connectionFactory.CreateConnection();

        return await connection.ExecuteScalarAsync<int>(
            """
            INSERT INTO pitches (
                owner_id, city_id, sport_type_id, name, address,
                price_per_hour, latitude, longitude,
                is_active, status, max_booking_duration_minutes, capacity
            )
            VALUES (
                @OwnerId, @CityId, @SportTypeId, @Name, @Address,
                @PricePerHour, @Latitude, @Longitude,
                @IsActive, @Status, @MaxBookingDurationMinutes, @Capacity
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
                   capacity                     = @Capacity,
                   is_active                    = @IsActive,
                   status                       = @Status,
                   rejection_reason             = @RejectionReason
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

    public async Task<(IEnumerable<AdminPitchRow> Items, long TotalCount)> ListPendingAsync(int page, int pageSize)
    {
        using var connection = _connectionFactory.CreateConnection();

        var parameters = new { PageSize = pageSize, Offset = (page - 1) * pageSize, PendingStatus = (int)PitchStatus.PendingApproval };

        const string countSql = """
            SELECT COUNT(*)
            FROM   pitches p
            WHERE  p.status    = @PendingStatus
              AND  p.deleted_at IS NULL
            """;

        const string dataSql = """
            SELECT  p.id,
                    p.name,
                    p.address,
                    p.price_per_hour,
                    s.name          AS sport_name,
                    c.name          AS city_name,
                    u.username      AS owner_name,
                    p.owner_id,
                    p.status,
                    p.created_at,
                    cover.image_url AS cover_image_url,
                    COALESCE(
                        (SELECT array_agg(image_url ORDER BY is_cover DESC, display_order, id)
                         FROM   pitch_images
                         WHERE  pitch_id = p.id),
                        ARRAY[]::text[]
                    )               AS images
            FROM    pitches         p
            JOIN    sport_types     s    ON s.id = p.sport_type_id
            JOIN    cities          c    ON c.id = p.city_id
            JOIN    users           u    ON u.id = p.owner_id
            LEFT JOIN LATERAL (
                SELECT image_url
                FROM   pitch_images
                WHERE  pitch_id = p.id
                ORDER BY is_cover DESC, display_order, id
                LIMIT  1
            ) cover ON TRUE
            WHERE   p.status    = @PendingStatus
              AND   p.deleted_at IS NULL
            ORDER BY p.created_at DESC
            LIMIT  @PageSize
            OFFSET @Offset
            """;

        var totalCount = await connection.ExecuteScalarAsync<long>(countSql, parameters);
        var items      = await connection.QueryAsync<AdminPitchRow>(dataSql, parameters);

        return (items, totalCount);
    }

    public async Task<bool> UpdateStatusAsync(int pitchId, PitchStatus status, string? rejectionReason = null)
    {
        using var connection = _connectionFactory.CreateConnection();

        var rows = await connection.ExecuteAsync(
            """
            UPDATE pitches
            SET    status           = @Status,
                   rejection_reason = @RejectionReason
            WHERE  id         = @PitchId
              AND  deleted_at IS NULL
            """,
            new { PitchId = pitchId, Status = (short)status, RejectionReason = rejectionReason });

        return rows > 0;
    }

    private static string EscapeLike(string? value) =>
        (value ?? string.Empty)
            .Replace(@"\", @"\\")
            .Replace("%",  @"\%")
            .Replace("_",  @"\_");

    public async Task<IEnumerable<PitchImage>> GetPitchImagesAsync(int pitchId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QueryAsync<PitchImage>(
            """
            SELECT id, pitch_id, image_url, is_cover, display_order, created_at
            FROM   pitch_images
            WHERE  pitch_id = @PitchId
            ORDER  BY is_cover DESC, display_order, id
            """,
            new { PitchId = pitchId });
    }

    public async Task<PitchImage?> GetPitchImageAsync(int pitchId, int imageId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<PitchImage>(
            """
            SELECT id, pitch_id, image_url, is_cover, display_order, created_at
            FROM   pitch_images
            WHERE  pitch_id = @PitchId
              AND  id       = @ImageId
            """,
            new { PitchId = pitchId, ImageId = imageId });
    }

    public async Task<PitchImage?> AddPitchImageAsync(int pitchId, string imageUrl, bool isCover, int maxImages)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();
        await using var tx = await connection.BeginTransactionAsync();

        if (isCover)
        {
            await connection.ExecuteAsync(
                "UPDATE pitch_images SET is_cover = FALSE WHERE pitch_id = @PitchId AND is_cover = TRUE",
                new { PitchId = pitchId },
                tx);
        }

        // Cap check + insert are a single statement so concurrent requests cannot
        // both pass the guard and exceed the limit.
        var row = await connection.QuerySingleOrDefaultAsync<PitchImage>(
            """
            INSERT INTO pitch_images (pitch_id, image_url, is_cover, display_order)
            SELECT @PitchId,
                   @ImageUrl,
                   @IsCover,
                   COALESCE((SELECT MAX(display_order) FROM pitch_images WHERE pitch_id = @PitchId), -1) + 1
            WHERE  (SELECT COUNT(*) FROM pitch_images WHERE pitch_id = @PitchId) < @MaxImages
            RETURNING id, pitch_id, image_url, is_cover, display_order, created_at
            """,
            new { PitchId = pitchId, ImageUrl = imageUrl, IsCover = isCover, MaxImages = maxImages },
            tx);

        await tx.CommitAsync();
        return row;
    }

    public async Task<PitchImage?> SetPitchImageCoverAsync(int pitchId, int imageId)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();
        await using var tx = await connection.BeginTransactionAsync();

        await connection.ExecuteAsync(
            "UPDATE pitch_images SET is_cover = FALSE WHERE pitch_id = @PitchId AND is_cover = TRUE",
            new { PitchId = pitchId },
            tx);

        var row = await connection.QuerySingleOrDefaultAsync<PitchImage>(
            """
            UPDATE pitch_images
            SET    is_cover = TRUE
            WHERE  pitch_id = @PitchId
              AND  id       = @ImageId
            RETURNING id, pitch_id, image_url, is_cover, display_order, created_at
            """,
            new { PitchId = pitchId, ImageId = imageId },
            tx);

        await tx.CommitAsync();
        return row;
    }

    public async Task<bool> DeletePitchImageAsync(int pitchId, int imageId)
    {
        using var connection = _connectionFactory.CreateConnection();
        var rows = await connection.ExecuteAsync(
            """
            DELETE FROM pitch_images
            WHERE  pitch_id = @PitchId
              AND  id       = @ImageId
            """,
            new { PitchId = pitchId, ImageId = imageId });
        return rows > 0;
    }
}
