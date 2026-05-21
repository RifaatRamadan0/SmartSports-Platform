using SmartSports.BLL.DTOs.Booking;

namespace SmartSports.BLL.Interfaces;

public interface IBookingService
{
    // SPDBTCP-166 — Rifaat
    Task<BookingResponse> CreateBookingAsync(int userId, CreateBookingRequest request);

    // SPDBTCP-168 — Rifaat
    Task CancelBookingAsync(int userId, int bookingId, string? cancellationReason);

    /// <summary>
    /// Cancels a booking on behalf of the pitch owner.
    /// Caller must be the owner of the pitch the booking is for.
    /// </summary>
    Task CancelBookingByOwnerAsync(int ownerId, int bookingId, string? cancellationReason);

    // SPDBTCP-223 — Rifaat
    /// <summary>
    /// Returns a booking by ID.
    /// Caller must be the player, the pitch owner, or an Admin.
    /// Returns null if not found.
    /// </summary>
    Task<BookingResponse?> GetBookingByIdAsync(int userId, int bookingId, bool isAdmin = false);

    // SPDBTCP-170 — Saad
    /// <summary>
    /// Returns a paginated list of bookings for the calling player.
    /// </summary>
    Task<PagedResult<BookingResponse>> GetMyBookingsAsync(int userId, BookingQuery query);

    // SPDBTCP-170 — Saad
    Task<PagedResult<BookingResponse>> GetOwnerBookingsAsync(int ownerId, BookingQuery query);
}
