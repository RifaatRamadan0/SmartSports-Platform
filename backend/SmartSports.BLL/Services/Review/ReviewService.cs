using SmartSports.BLL.DTOs.Pitch;
using SmartSports.BLL.DTOs.Review;
using SmartSports.BLL.Interfaces.Notification;
using SmartSports.BLL.Interfaces.Review;
using SmartSports.DAL.Interfaces.Booking;
using SmartSports.DAL.Interfaces.Review;
using SmartSports.Domain.Common;
using SmartSports.Domain.Exceptions;
using ReviewEntity = SmartSports.Domain.Entities.Review;

namespace SmartSports.BLL.Services.Review;

public class ReviewService : IReviewService
{
    private readonly IReviewRepository    _reviewRepository;
    private readonly IBookingRepository   _bookingRepository;
    private readonly INotificationService _notificationService;

    public ReviewService(
        IReviewRepository    reviewRepository,
        IBookingRepository   bookingRepository,
        INotificationService notificationService)
    {
        _reviewRepository    = reviewRepository;
        _bookingRepository   = bookingRepository;
        _notificationService = notificationService;
    }

    public async Task CreateReviewAsync(int callerUserId, int bookingId, CreateReviewRequest request)
    {
        var booking = await _bookingRepository.GetByIdAsync(bookingId)
            ?? throw new KeyNotFoundException($"Booking {bookingId} was not found.");

        if (booking.UserId != callerUserId)
            throw new ForbiddenException("You can only review your own bookings.");

        if (booking.Status != "confirmed")
            throw new ArgumentException("Only completed bookings can be reviewed.");

        if (booking.BookingDate.ToDateTime(booking.EndTime) >= DateTime.Now)
            throw new ArgumentException("You can review this booking after it has taken place.");

        await _reviewRepository.CreateAsync(new ReviewEntity
        {
            UserId    = callerUserId,
            PitchId   = booking.PitchId,
            BookingId = bookingId,
            Rating    = request.Rating,
            Comment   = string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment.Trim(),
        });

        if (booking.PitchOwnerId is int ownerId)
            await _notificationService.CreateAsync(
                ownerId,
                NotificationTypes.ReviewReceived,
                bookingId,
                $"You received a new review for {booking.PitchName}.");
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
