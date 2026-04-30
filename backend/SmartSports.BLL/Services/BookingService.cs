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
        // 1. Duration must be a positive multiple of 30 (half-hour slot system)
        if (request.DurationInMinutes % 30 != 0 || request.DurationInMinutes <= 0)
            throw new ArgumentException("Duration must be a multiple of 30 minutes (e.g. 60, 90, 120).");

        // 2. Minimum booking duration is 1 hour
        if (request.DurationInMinutes < 60)
            throw new ArgumentException("Minimum booking duration is 1 hour.");

        // 3. Start time must be on a half-hour boundary (e.g. 07:00, 07:30)
        if (request.StartTime.Minute % 30 != 0 || request.StartTime.Second != 0)
            throw new ArgumentException("Start time must be on the hour or half hour (e.g. 07:00, 07:30).");

        // 4. Derive end time — guaranteed to be on a half-hour boundary given rules 1 & 3
        var endTime = request.StartTime.AddMinutes(request.DurationInMinutes);

        // 5. Booking date must not be in the past
        if (request.BookingDate < DateOnly.FromDateTime(DateTime.UtcNow))
            throw new ArgumentException("Booking date cannot be in the past.");

        // 6. Pitch must exist and be active/approved
        var pitch = await _pitchRepository.GetByIdAsync(request.PitchId)
            ?? throw new KeyNotFoundException($"Pitch {request.PitchId} was not found.");

        if (!pitch.IsActive || !pitch.IsApproved)
            throw new KeyNotFoundException($"Pitch {request.PitchId} is not available for booking.");

        // 7. Duration must not exceed this pitch's configured maximum
        if (request.DurationInMinutes > pitch.MaxBookingDurationMinutes)
        {
            var maxHours = pitch.MaxBookingDurationMinutes / 60;
            var maxMins  = pitch.MaxBookingDurationMinutes % 60;
            var maxLabel = maxMins == 0 ? $"{maxHours}h" : $"{maxHours}h {maxMins}min";
            throw new ArgumentException($"This pitch allows a maximum booking of {maxLabel}.");
        }

        // 9. Pitch must have an active schedule for the requested day
        var schedule = await _pitchScheduleRepository.GetForDayAsync(request.PitchId, request.BookingDate.DayOfWeek)
            ?? throw new ArgumentException(
                $"This pitch is not open on {request.BookingDate.DayOfWeek}.");

        // 10. Requested window must fall within the pitch's operating hours
        if (request.StartTime < schedule.OpenTime || endTime > schedule.CloseTime)
            throw new ArgumentException(
                $"Requested time is outside the pitch's operating hours " +
                $"({schedule.OpenTime:HH\\:mm}–{schedule.CloseTime:HH\\:mm}).");

        // 11. Phase-1 conflict check (interval overlap)
        var hasConflict = await _bookingRepository.HasConflictAsync(
            request.PitchId, request.BookingDate, request.StartTime, endTime);

        if (hasConflict)
            throw new InvalidOperationException(
                "This time slot conflicts with an existing booking.");

        // 12. Calculate total price
        var totalPrice = pitch.PricePerHour * (decimal)request.DurationInMinutes / 60;

        // 13. Persist booking + match atomically (Phase-2 race protection inside repository)
        var (bookingId, bookedAt) = await _bookingRepository.CreateWithMatchAsync(
            userId, request.PitchId, request.BookingDate,
            request.StartTime, endTime, totalPrice);

        // 14. Assemble response — no extra DB round-trip needed
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
