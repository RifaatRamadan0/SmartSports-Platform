using Dapper;
using Npgsql;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Review;
using SmartSports.Domain.Entities.Projections;
using SmartSports.Domain.Exceptions;
using ReviewEntity = SmartSports.Domain.Entities.Review;

namespace SmartSports.DAL.Repositories.Review;

public class ReviewRepository : IReviewRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public ReviewRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<int> CreateAsync(ReviewEntity review)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        try
        {
            // Serialize concurrent reviewers of the same pitch on the pitch row
            // before recomputing the rating roll-up below. Without this lock, two
            // reviews inserted concurrently can each recompute AVG/COUNT from a
            // snapshot that excludes the other's uncommitted insert, so the last
            // UPDATE to commit silently undercounts (READ COMMITTED lost update).
            await connection.ExecuteAsync(
                "SELECT 1 FROM pitches WHERE id = @PitchId FOR UPDATE",
                new { review.PitchId }, transaction);

            var reviewId = await connection.ExecuteScalarAsync<int>(
                """
                INSERT INTO reviews (user_id, pitch_id, booking_id, rating, comment)
                VALUES (@UserId, @PitchId, @BookingId, @Rating, @Comment)
                RETURNING id
                """,
                review, transaction);

            await connection.ExecuteAsync(
                """
                UPDATE pitches SET
                    rating       = (SELECT AVG(rating)::numeric(3,2) FROM reviews WHERE pitch_id = @PitchId),
                    rating_count = (SELECT COUNT(*) FROM reviews WHERE pitch_id = @PitchId)
                WHERE id = @PitchId
                """,
                new { review.PitchId }, transaction);

            await transaction.CommitAsync();
            return reviewId;
        }
        catch (PostgresException ex) when (ex.SqlState == "23505")
        {
            await transaction.RollbackAsync();
            throw new ConflictException("You have already reviewed this booking.");
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
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
