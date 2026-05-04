using SmartSports.BLL.DTOs.Booking;

namespace SmartSports.BLL.Interfaces;

public interface IBookingService
{
    // SPDBTCP-166 — Rifaat
    Task<BookingResponse> CreateBookingAsync(int userId, CreateBookingRequest request);

    // SPDBTCP-168 — Rifaat
    Task CancelBookingAsync(int userId, int bookingId, string? cancellationReason);

    // SPDBTCP-223 — Rifaat
    Task<BookingResponse?> GetBookingByIdAsync(int userId, int bookingId);

    // SPDBTCP-170 — Saad
    Task<IEnumerable<BookingResponse>> GetMyBookingsAsync(int userId, BookingQuery query);

    // SPDBTCP-170 — Saad
    Task<IEnumerable<BookingResponse>> GetOwnerBookingsAsync(int ownerId, BookingQuery query);
}
