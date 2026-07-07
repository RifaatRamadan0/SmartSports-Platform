using SmartSports.Domain.Entities.Projections;
using ReviewEntity = SmartSports.Domain.Entities.Review;

namespace SmartSports.DAL.Interfaces.Review;

public interface IReviewRepository
{
    Task<IEnumerable<ReviewRow>> GetRecentByPitchAsync(int pitchId, int count);

    Task<int> CreateAsync(ReviewEntity review);
}
