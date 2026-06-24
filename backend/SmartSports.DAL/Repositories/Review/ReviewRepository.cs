using Dapper;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Review;
using SmartSports.Domain.Entities.Projections;

namespace SmartSports.DAL.Repositories.Review;

public class ReviewRepository : IReviewRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public ReviewRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IEnumerable<ReviewRow>> GetRecentByPitchAsync(int pitchId, int count)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QueryAsync<ReviewRow>(
            """
            SELECT r.id,
                   u.username  AS reviewer_name,
                   r.rating,
                   r.comment,
                   r.created_at
            FROM   reviews r
            JOIN   users   u ON u.id = r.user_id
            WHERE  r.pitch_id = @PitchId
            ORDER  BY r.created_at DESC
            LIMIT  @Count
            """,
            new { PitchId = pitchId, Count = count });
    }
}
