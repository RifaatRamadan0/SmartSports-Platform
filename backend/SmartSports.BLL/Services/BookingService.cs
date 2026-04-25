using SmartSports.BLL.DTOs.Booking;
using SmartSports.BLL.Interfaces;

namespace SmartSports.BLL.Services;

public class BookingService : IBookingService
{
    // SPDBTCP-166 — Rifaat
    public Task<BookingResponse> CreateBookingAsync(int userId, CreateBookingRequest request)
        => throw new NotImplementedException();

    // SPDBTCP-168 — Rifaat
    public Task CancelBookingAsync(int userId, int bookingId)
        => throw new NotImplementedException();

    // SPDBTCP-223 — Rifaat
    public Task<BookingResponse?> GetBookingByIdAsync(int userId, int bookingId)
        => throw new NotImplementedException();

    // SPDBTCP-170 — Saad
    public Task<IEnumerable<BookingResponse>> GetMyBookingsAsync(int userId, BookingQuery query)
        => throw new NotImplementedException();

    // SPDBTCP-170 — Saad
    public Task<IEnumerable<BookingResponse>> GetOwnerBookingsAsync(int ownerId, BookingQuery query)
        => throw new NotImplementedException();
}
