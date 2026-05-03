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
}
