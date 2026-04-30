using SmartSports.BLL.DTOs.Booking;
using SmartSports.BLL.Interfaces;
using SmartSports.DAL.Interfaces.Booking;
using SmartSports.DAL.Interfaces.Pitch;

namespace SmartSports.BLL.Services;

public class BookingService : IBookingService
{
    private readonly IPitchRepository _pitchRepository;
    private readonly IPitchScheduleRepository _pitchScheduleRepository;
    private readonly IBookingRepository _bookingRepository;

    public BookingService(
        IPitchRepository pitchRepository,
        IPitchScheduleRepository pitchScheduleRepository,
        IBookingRepository bookingRepository)
    {
        _pitchRepository         = pitchRepository;
        _pitchScheduleRepository = pitchScheduleRepository;
        _bookingRepository       = bookingRepository;
    }

    // SPDBTCP-166 — Rifaat
    public async Task<BookingResponse> CreateBookingAsync(int userId, CreateBookingRequest request)
    {
        // 1. Duration must be positive
        if (request.DurationInMinutes <= 0)
            throw new ArgumentException("Duration must be greater than zero.");

        // 2. Derive end time
        var endTime = request.StartTime.AddMinutes(request.DurationInMinutes);

        // 3. Booking date must not be in the past
        if (request.BookingDate < DateOnly.FromDateTime(DateTime.UtcNow))
            throw new ArgumentException("Booking date cannot be in the past.");

        // 4. Pitch must exist and be active/approved
        var pitch = await _pitchRepository.GetByIdAsync(request.PitchId)
            ?? throw new KeyNotFoundException($"Pitch {request.PitchId} was not found.");

        if (!pitch.IsActive || !pitch.IsApproved)
            throw new KeyNotFoundException($"Pitch {request.PitchId} is not available for booking.");

        // 5. Pitch must have an active schedule for the requested day
        var schedule = await _pitchScheduleRepository.GetForDayAsync(request.PitchId, request.BookingDate.DayOfWeek)
            ?? throw new ArgumentException(
                $"This pitch is not open on {request.BookingDate.DayOfWeek}.");

        // 6. Requested window must fall within the pitch's operating hours
        if (request.StartTime < schedule.OpenTime || endTime > schedule.CloseTime)
            throw new ArgumentException(
                $"Requested time is outside the pitch's operating hours " +
                $"({schedule.OpenTime:HH\\:mm}–{schedule.CloseTime:HH\\:mm}).");

        // 7. Phase-1 conflict check (interval overlap)
        var hasConflict = await _bookingRepository.HasConflictAsync(
            request.PitchId, request.BookingDate, request.StartTime, endTime);

        if (hasConflict)
            throw new InvalidOperationException(
                "This time slot conflicts with an existing booking.");

        // 8. Calculate total price
        var totalPrice = pitch.PricePerHour * (decimal)request.DurationInMinutes / 60;

        // 9. Persist booking + match atomically (Phase-2 race protection inside repository)
        var (bookingId, bookedAt) = await _bookingRepository.CreateWithMatchAsync(
            userId, request.PitchId, request.BookingDate,
            request.StartTime, endTime, totalPrice);

        // 10. Assemble response — no extra DB round-trip needed
        return new BookingResponse
        {
            Id          = bookingId,
            UserId      = userId,
            PitchId     = request.PitchId,
            PitchName   = pitch.Name,
            BookingDate = request.BookingDate,
            StartTime   = request.StartTime,
            EndTime     = endTime,
            TotalPrice  = totalPrice,
            Status      = "confirmed",
            BookedAt    = bookedAt
        };
    }

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
