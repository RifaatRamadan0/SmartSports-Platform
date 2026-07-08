using SmartSports.BLL.DTOs.Pitch;
using SmartSports.BLL.DTOs.Review;

namespace SmartSports.BLL.Interfaces.Review;

public interface IReviewService
{
    Task<IEnumerable<ReviewSummary>> GetRecentByPitchAsync(int pitchId, int count);

    Task CreateReviewAsync(int callerUserId, int bookingId, CreateReviewRequest request);
}
