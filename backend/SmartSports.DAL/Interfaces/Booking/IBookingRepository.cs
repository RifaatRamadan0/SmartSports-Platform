namespace SmartSports.DAL.Interfaces.Booking;
using SmartSports.Domain.Entities;

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
    /// Throws ConflictException if a unique constraint violation occurs (race condition).
    /// </summary>
    Task<(int Id, DateTime BookedAt)> CreateWithMatchAsync(
        int userId, int pitchId, DateOnly bookingDate,
        TimeOnly startTime, TimeOnly endTime, decimal totalPrice);

    /// <summary>
    /// Returns a single booking by ID with pitch name joined.
    /// Returns null if not found.
    /// </summary>
    Task<Booking?> GetByIdAsync(int bookingId);

    /// <summary>
    /// Returns a paginated list of bookings for a specific player.
    /// Supports filtering by status and date range.
    /// </summary>
    Task<(IEnumerable<Booking> Items, int TotalCount)> GetByUserIdAsync(
        int userId, string? status, DateOnly? from,
        DateOnly? to, int page, int pageSize);

    /// <summary>
    /// Returns a paginated list of bookings across all pitches owned by a specific owner.
    /// Supports filtering by status and date range.
    /// </summary>
    Task<(IEnumerable<Booking> Items, int TotalCount)> GetByOwnerIdAsync(
        int ownerId, string? status, DateOnly? from,
        DateOnly? to, int page, int pageSize);
}
