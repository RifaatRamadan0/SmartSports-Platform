using SmartSports.Domain.Entities.Projections;

namespace SmartSports.DAL.Interfaces.Booking;
using SmartSports.Domain.Entities;

public interface IBookingRepository
{
    /// <summary>
    /// Atomically inserts a confirmed booking and a linked match record in a single transaction.
    /// Returns the generated booking id and booked_at timestamp.
    /// Throws ConflictException if a unique constraint violation occurs (race condition).
    /// </summary>
    Task<(int Id, DateTime BookedAt, int MatchId)> CreateWithMatchAsync(
        int userId, int pitchId, DateOnly bookingDate,
        TimeOnly startTime, TimeOnly endTime, decimal totalPrice,
        bool isOpenToJoin, int maxPlayers);

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

    /// <summary>
    /// Fetches the minimal booking fields required to validate and execute a cancellation.
    /// Returns null if no booking with the given id exists.
    /// </summary>
    Task<BookingCancelInfo?> GetCancelInfoByIdAsync(int bookingId);

    /// <summary>
    /// Sets the booking status to 'cancelled' and records an optional cancellation reason.
    /// If the booking has a linked match, also expires its still-pending invitations and
    /// returns the match id plus the user ids of every pending/accepted participant, so the
    /// caller can notify them. Returns a result with a null MatchId if the booking was not
    /// in 'confirmed' status (no-op) or had no linked match.
    /// </summary>
    Task<BookingCancelResult> CancelWithParticipantsAsync(int bookingId, string? cancellationReason);
}
