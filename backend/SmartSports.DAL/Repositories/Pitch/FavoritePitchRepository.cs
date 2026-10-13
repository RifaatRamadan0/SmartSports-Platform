using Dapper;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Pitch;
using SmartSports.Domain.Entities.Projections;
using SmartSports.Domain.Enums;

namespace SmartSports.DAL.Repositories.Pitch;

public class FavoritePitchRepository : IFavoritePitchRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public FavoritePitchRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task AddAsync(int userId, int pitchId)
    {
        using var connection = _connectionFactory.CreateConnection();

        await connection.ExecuteAsync(
            """
            INSERT INTO user_favorite_pitches (user_id, pitch_id)
            VALUES (@UserId, @PitchId)
            ON CONFLICT (user_id, pitch_id) DO NOTHING
            """,
            new { UserId = userId, PitchId = pitchId });
    }

    public async Task RemoveAsync(int userId, int pitchId)
    {
        using var connection = _connectionFactory.CreateConnection();

        await connection.ExecuteAsync(
            "DELETE FROM user_favorite_pitches WHERE user_id = @UserId AND pitch_id = @PitchId",
            new { UserId = userId, PitchId = pitchId });
    }

    public async Task<(IEnumerable<PitchListRow> Items, long TotalCount)> ListFavoritesAsync(int userId, int page, int pageSize)
    {
        using var connection = _connectionFactory.CreateConnection();

        var parameters = new
        {
            UserId         = userId,
            PageSize       = pageSize,
            Offset         = (page - 1) * pageSize,
            ApprovedStatus = (int)PitchStatus.Approved,
        };

        const string countSql = """
            SELECT COUNT(*)
            FROM   user_favorite_pitches f
            JOIN   pitches p ON p.id = f.pitch_id
            WHERE  f.user_id   = @UserId
              AND  p.is_active = TRUE
              AND  p.status    = @ApprovedStatus
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
                    p.status,
                    TRUE                AS is_favorited
            FROM    user_favorite_pitches f
            JOIN    pitches             p    ON p.id = f.pitch_id
            JOIN    sport_types         s    ON s.id = p.sport_type_id
            JOIN    cities              c    ON c.id = p.city_id
            LEFT JOIN LATERAL (
                SELECT image_url
                FROM   pitch_images
                WHERE  pitch_id = p.id
                ORDER BY is_cover DESC, display_order, id
                LIMIT  1
            ) cover ON TRUE
            WHERE   f.user_id   = @UserId
              AND   p.is_active = TRUE
              AND   p.status    = @ApprovedStatus
              AND   p.deleted_at IS NULL
            ORDER BY f.created_at DESC
            LIMIT   @PageSize
            OFFSET  @Offset
            """;

        var totalCount = await connection.ExecuteScalarAsync<long>(countSql, parameters);
        var items      = await connection.QueryAsync<PitchListRow>(dataSql, parameters);

        return (items, totalCount);
    }
}
