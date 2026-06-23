using SmartSports.BLL.DTOs.Pitch;

namespace SmartSports.BLL.Interfaces.Review;

public interface IReviewService
{
    Task<IEnumerable<ReviewSummary>> GetRecentByPitchAsync(int pitchId, int count);
}
