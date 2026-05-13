using SmartSports.BLL.DTOs.Pitch;
using SmartSports.BLL.Interfaces;
using SmartSports.DAL.Interfaces.Review;

namespace SmartSports.BLL.Services;

public class ReviewService : IReviewService
{
    private readonly IReviewRepository _reviewRepository;

    public ReviewService(IReviewRepository reviewRepository)
    {
        _reviewRepository = reviewRepository;
    }

    public async Task<IEnumerable<ReviewSummary>> GetRecentByPitchAsync(int pitchId, int count)
    {
        var rows = await _reviewRepository.GetRecentByPitchAsync(pitchId, count);
        return rows.Select(r => new ReviewSummary
        {
            Id           = r.Id,
            ReviewerName = r.ReviewerName,
            Rating       = r.Rating,
            Comment      = r.Comment,
            CreatedAt    = r.CreatedAt,
        });
    }
}
