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
        // PitchId, DurationInMinutes range, and BookingDate/StartTime non-null
        // are already enforced by attribute validation on CreateBookingRequest (returns 400 before
        // reaching this method). Safe to dereference .Value here.
        var bookingDate = request.BookingDate!.Value;
        var startTime   = request.StartTime!.Value;

        // 1. Duration must be a multiple of 30 (half-hour slot system)
        if (request.DurationInMinutes % 30 != 0)
            throw new ArgumentException("Duration must be a multiple of 30 minutes (e.g. 60, 90, 120).");

        // 2. Start time must be on a half-hour boundary (e.g. 07:00, 07:30)
        if (startTime.Minute % 30 != 0 || startTime.Second != 0)
            throw new ArgumentException("Start time must be on the hour or half hour (e.g. 07:00, 07:30).");

        // 3. Derive end time — guaranteed to be on a half-hour boundary given rules 1 & 2
        var endTime = startTime.AddMinutes(request.DurationInMinutes);

        // 4. Booking date must not be in the past
        if (bookingDate < DateOnly.FromDateTime(DateTime.Today))
            throw new ArgumentException("Booking date cannot be in the past.");

        // 5. Pitch must exist (404) and be active/approved (400 — exists but in a non-bookable state)
        var pitch = await _pitchRepository.GetByIdAsync(request.PitchId)
            ?? throw new KeyNotFoundException($"Pitch {request.PitchId} was not found.");

        if (!pitch.IsActive || !pitch.IsApproved)
            throw new ArgumentException($"Pitch {request.PitchId} is not currently accepting bookings.");

        // 6. Duration must not exceed this pitch's configured maximum
        if (request.DurationInMinutes > pitch.MaxBookingDurationMinutes)
        {
            var maxHours = pitch.MaxBookingDurationMinutes / 60;
            var maxMins  = pitch.MaxBookingDurationMinutes % 60;
            var maxLabel = maxMins == 0 ? $"{maxHours}h" : $"{maxHours}h {maxMins}min";
            throw new ArgumentException($"This pitch allows a maximum booking of {maxLabel}.");
        }

        // 7. Pitch must have an active schedule for the requested day
        var schedule = await _pitchScheduleRepository.GetForDayAsync(request.PitchId, bookingDate.DayOfWeek)
            ?? throw new ArgumentException(
                $"This pitch is not open on {bookingDate.DayOfWeek}.");

        // 8. Requested window must fall within the pitch's operating hours
        if (startTime < schedule.OpenTime || endTime > schedule.CloseTime)
            throw new ArgumentException(
                $"Requested time is outside the pitch's operating hours " +
                $"({schedule.OpenTime:HH\\:mm}–{schedule.CloseTime:HH\\:mm}).");

        // 9. Phase-1 conflict check (interval overlap)
        var hasConflict = await _bookingRepository.HasConflictAsync(
            request.PitchId, bookingDate, startTime, endTime);

        if (hasConflict)
            throw new InvalidOperationException(
                "This time slot conflicts with an existing booking.");

        // 10. Calculate total price
        var totalPrice = pitch.PricePerHour * (decimal)request.DurationInMinutes / 60;

        // 11. Persist booking + match atomically (Phase-2 race protection inside repository)
        var (bookingId, bookedAt) = await _bookingRepository.CreateWithMatchAsync(
            userId, request.PitchId, bookingDate,
            startTime, endTime, totalPrice);

        // 12. Assemble response — no extra DB round-trip needed
        return new BookingResponse
        {
            Id          = bookingId,
            UserId      = userId,
            PitchId     = request.PitchId,
            PitchName   = pitch.Name,
            BookingDate = bookingDate,
            StartTime   = startTime,
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
