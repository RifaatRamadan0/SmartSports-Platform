using SmartSports.BLL.DTOs.Booking;
using SmartSports.BLL.Interfaces;
using SmartSports.DAL.Interfaces.Booking;
using SmartSports.DAL.Interfaces.Pitch;
using SmartSports.Domain.Entities;

namespace SmartSports.BLL.Services;

public class BookingService : IBookingService
{
    private readonly IPitchRepository _pitchRepository;
    private readonly IPitchScheduleRepository _pitchScheduleRepository;
    private readonly IBookingRepository _bookingRepository;
    private static readonly string[] ValidStatuses = { "pending", "confirmed", "cancelled" };

    public BookingService(
        IPitchRepository pitchRepository,
        IPitchScheduleRepository pitchScheduleRepository,
        IBookingRepository bookingRepository)
    {
        _pitchRepository = pitchRepository;
        _pitchScheduleRepository = pitchScheduleRepository;
        _bookingRepository = bookingRepository;
    }

    public async Task<BookingResponse> CreateBookingAsync(int userId, CreateBookingRequest request)
    {
        var bookingDate = request.BookingDate!.Value;
        var startTime = request.StartTime!.Value;

        if (request.DurationInMinutes % 30 != 0)
            throw new ArgumentException("Duration must be a multiple of 30 minutes (e.g. 60, 90, 120).");

        if (startTime.Minute % 30 != 0 || startTime.Second != 0)
            throw new ArgumentException("Start time must be on the hour or half hour (e.g. 07:00, 07:30).");

        var endTime = startTime.AddMinutes(request.DurationInMinutes);

        if (bookingDate < DateOnly.FromDateTime(DateTime.UtcNow))
            throw new ArgumentException("Booking date cannot be in the past.");

        var pitch = await _pitchRepository.GetByIdAsync(request.PitchId)
            ?? throw new KeyNotFoundException($"Pitch {request.PitchId} was not found.");

        if (!pitch.IsActive || !pitch.IsApproved)
            throw new ArgumentException($"Pitch {request.PitchId} is not currently accepting bookings.");

        if (request.DurationInMinutes > pitch.MaxBookingDurationMinutes)
        {
            var maxHours = pitch.MaxBookingDurationMinutes / 60;
            var maxMins = pitch.MaxBookingDurationMinutes % 60;
            var maxLabel = maxMins == 0 ? $"{maxHours}h" : $"{maxHours}h {maxMins}min";
            throw new ArgumentException($"This pitch allows a maximum booking of {maxLabel}.");
        }

        var schedule = await _pitchScheduleRepository.GetForDayAsync(request.PitchId, bookingDate.DayOfWeek)
            ?? throw new ArgumentException($"This pitch is not open on {bookingDate.DayOfWeek}.");

        if (startTime < schedule.OpenTime || endTime > schedule.CloseTime)
            throw new ArgumentException(
                $"Requested time is outside the pitch's operating hours " +
                $"({schedule.OpenTime:HH\\:mm}–{schedule.CloseTime:HH\\:mm}).");

        var hasConflict = await _bookingRepository.HasConflictAsync(
            request.PitchId, bookingDate, startTime, endTime);

        if (hasConflict)
            throw new InvalidOperationException("This time slot conflicts with an existing booking.");

        var totalPrice = pitch.PricePerHour * (decimal)request.DurationInMinutes / 60;

        var (bookingId, bookedAt) = await _bookingRepository.CreateWithMatchAsync(
            userId, request.PitchId, bookingDate,
            startTime, endTime, totalPrice);

        return new BookingResponse
        {
            Id = bookingId,
            UserId = userId,
            PitchId = request.PitchId,
            PitchName = pitch.Name,
            BookingDate = bookingDate,
            StartTime = startTime,
            EndTime = endTime,
            TotalPrice = totalPrice,
            Status = "confirmed",
            BookedAt = bookedAt
        };
    }

    public Task CancelBookingAsync(int userId, int bookingId)
        => throw new NotImplementedException();



    /// <inheritdoc/>
    public async Task<BookingResponse?> GetBookingByIdAsync(int userId, int bookingId, bool isAdmin = false)
    {
        var booking = await _bookingRepository.GetByIdAsync(bookingId);

        if (booking is null)
            return null;

        // Authorization check:
        // Caller must be the player who made the booking, the pitch owner, or an Admin.
        // Role-level auth is handled in the controller — here we check resource-level ownership.
        var pitch = await _pitchRepository.GetByIdAsync(booking.PitchId);

        var isPlayer = booking.UserId == userId;
        var isPitchOwner = pitch?.OwnerId == userId;

        if (!isAdmin && !isPlayer && !isPitchOwner)
            throw new UnauthorizedAccessException(
                "You do not have permission to view this booking.");

        return MapToResponse(booking);
    }

    /// <inheritdoc/>
    public async Task<PagedResult<BookingResponse>> GetMyBookingsAsync(int userId, BookingQuery query)
    {

        if (!string.IsNullOrWhiteSpace(query.Status) &&
            !ValidStatuses.Contains(query.Status.ToLower()))
        {
            throw new ArgumentException(
                "Invalid status. Must be one of: pending, confirmed, cancelled.");
        }

        var (items, totalCount) = await _bookingRepository.GetByUserIdAsync(
            userId,
            query.Status,
            query.From,
            query.To,
            query.Page,
            query.PageSize);

        return new PagedResult<BookingResponse>
        {
            Items = items.Select(MapToResponse),
            TotalCount = totalCount,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    /// <inheritdoc/>
    public async Task<PagedResult<BookingResponse>> GetOwnerBookingsAsync(int ownerId, BookingQuery query)
    {
        if (!string.IsNullOrWhiteSpace(query.Status) &&
            !ValidStatuses.Contains(query.Status.ToLower()))
        {
            throw new ArgumentException(
                "Invalid status. Must be one of: pending, confirmed, cancelled.");
        }

        var (items, totalCount) = await _bookingRepository.GetByOwnerIdAsync(
            ownerId,
            query.Status,
            query.From,
            query.To,
            query.Page,
            query.PageSize);

        return new PagedResult<BookingResponse>
        {
            Items = items.Select(MapToResponse),
            TotalCount = totalCount,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    // Private helpers 

    /// <summary>Maps a Booking domain entity to a BookingResponse DTO.</summary>
    private static BookingResponse MapToResponse(Booking booking) => new()
    {
        Id = booking.Id,
        UserId = booking.UserId,
        PitchId = booking.PitchId,
        PitchName = booking.PitchName,
        BookingDate = booking.BookingDate,
        StartTime = booking.StartTime,
        EndTime = booking.EndTime,
        TotalPrice = booking.TotalPrice,
        Status = booking.Status,
        BookedAt = booking.BookedAt
    };
}