using SmartSports.Domain.Entities.Projections;

namespace SmartSports.DAL.Interfaces.Booking;

public interface IBookingRepository
{
    /// <summary>
    /// Atomically inserts a confirmed booking and a linked match record in a single transaction.
    /// Returns the generated booking id and booked_at timestamp.
    /// Throws ConflictException if a unique constraint violation occurs (race condition).
    /// </summary>
    Task<(int Id, DateTime BookedAt)> CreateWithMatchAsync(
        int userId, int pitchId, DateOnly bookingDate,
        TimeOnly startTime, TimeOnly endTime, decimal totalPrice);

    /// <summary>
    /// Fetches the minimal booking fields required to validate and execute a cancellation.
    /// Returns null if no booking with the given id exists.
    /// </summary>
    Task<BookingCancelInfo?> GetCancelInfoByIdAsync(int bookingId);

    /// <summary>
    /// Sets the booking status to 'cancelled' and records an optional cancellation reason.
    /// </summary>
    Task CancelAsync(int bookingId, string? cancellationReason);
}
