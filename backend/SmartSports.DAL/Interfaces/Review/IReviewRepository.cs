using SmartSports.Domain.Entities.Projections;

namespace SmartSports.DAL.Interfaces.Review;

public interface IReviewRepository
{
    Task<IEnumerable<ReviewRow>> GetRecentByPitchAsync(int pitchId, int count);
}
