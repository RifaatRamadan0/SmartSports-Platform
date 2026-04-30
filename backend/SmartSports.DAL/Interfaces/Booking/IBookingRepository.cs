namespace SmartSports.DAL.Interfaces.Booking;

public interface IBookingRepository
{
    /// <summary>
    /// Returns true if any non-cancelled booking for the given pitch on the given date
    /// overlaps with the requested [startTime, endTime) interval.
    /// </summary>
    Task<bool> HasConflictAsync(int pitchId, DateOnly bookingDate, TimeOnly startTime, TimeOnly endTime);

    /// <summary>
    /// Atomically inserts a confirmed booking and a linked match record in a single transaction.
    /// Returns the generated booking id and booked_at timestamp.
    /// Throws InvalidOperationException if a unique constraint violation occurs (race condition).
    /// </summary>
    Task<(int Id, DateTime BookedAt)> CreateWithMatchAsync(
        int userId, int pitchId, DateOnly bookingDate,
        TimeOnly startTime, TimeOnly endTime, decimal totalPrice);
}
