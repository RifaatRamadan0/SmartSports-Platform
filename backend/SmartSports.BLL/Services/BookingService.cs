using SmartSports.BLL.DTOs.Booking;
using SmartSports.BLL.DTOs.Match;
using SmartSports.BLL.Interfaces;
using SmartSports.DAL.Interfaces.Booking;
using SmartSports.DAL.Interfaces.Match;
using SmartSports.DAL.Interfaces.Pitch;
using SmartSports.Domain.Entities;
using SmartSports.Domain.Enums;
using SmartSports.Domain.Exceptions;

namespace SmartSports.BLL.Services;

public class BookingService : IBookingService
{
    private readonly IPitchRepository _pitchRepository;
    private readonly IPitchScheduleRepository _pitchScheduleRepository;
    private readonly IBookingRepository _bookingRepository;
    private readonly IMatchRepository _matchRepository;
    private static readonly string[] ValidStatuses = { "pending", "confirmed", "cancelled" };

    public BookingService(
        IPitchRepository pitchRepository,
        IPitchScheduleRepository pitchScheduleRepository,
        IBookingRepository bookingRepository,
        IMatchRepository matchRepository)
    {
        _pitchRepository         = pitchRepository;
        _pitchScheduleRepository = pitchScheduleRepository;
        _bookingRepository       = bookingRepository;
        _matchRepository         = matchRepository;
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

        // TimeOnly.AddMinutes wraps at midnight, so a booking starting at 23:30 for 120 min
        // would yield endTime 01:30, which is earlier than startTime and passes the
        // operating-hours check silently before hitting a DB constraint as a 500.
        if (endTime <= startTime)
            throw new ArgumentException("Booking cannot cross midnight. Choose an earlier start time or shorter duration.");

        // 4. Booking date must not be in the past
        if (bookingDate < DateOnly.FromDateTime(DateTime.Today))
            throw new ArgumentException("Booking date cannot be in the past.");

        // 5. Pitch must exist (404) and be active/approved (400 — exists but in a non-bookable state)
        var pitch = await _pitchRepository.GetByIdAsync(request.PitchId)
            ?? throw new KeyNotFoundException($"Pitch {request.PitchId} was not found.");

        if (!pitch.IsActive || pitch.Status != PitchStatus.Approved)
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

        // 9. Calculate total price
        var totalPrice = pitch.PricePerHour * (decimal)request.DurationInMinutes / 60;

        // 10. Persist booking + match atomically.
        // Conflict check, advisory lock, and insert all happen inside one transaction
        // in the repository — see BookingRepository.CreateWithMatchAsync.
        // max_players for the match comes from pitch.Capacity, not user input, so every
        // booking on the same pitch shares one source of truth (SPDBTCP-245).
        var (bookingId, bookedAt, matchId) = await _bookingRepository.CreateWithMatchAsync(
            userId, request.PitchId, bookingDate,
            startTime, endTime, totalPrice,
            request.IsOpenToJoin, pitch.Capacity);

        // 11. Assemble response — no extra DB round-trip needed
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
            BookedAt    = bookedAt,
            Match       = new MatchResponse
            {
                Id           = matchId,
                BookingId    = bookingId,
                IsOpenToJoin = request.IsOpenToJoin,
                MaxPlayers   = pitch.Capacity,
            },
        };
    }

    // SPDBTCP-168 — Rifaat
    public async Task CancelBookingAsync(int userId, int bookingId, string? cancellationReason)
    {
        var booking = await _bookingRepository.GetCancelInfoByIdAsync(bookingId)
            ?? throw new KeyNotFoundException($"Booking {bookingId} not found.");

        if (booking.UserId != userId)
            throw new ForbiddenException("You are not allowed to cancel this booking.");

        if (booking.Status != "confirmed")
            throw new ArgumentException("Only confirmed bookings can be cancelled.");

        // Booking times are stored as local/wall-clock time with no timezone component.
        // DateTime.Now (not UtcNow) is intentional — the server must run in the same
        // timezone as the pitches (Lebanon, UTC+3). Revisit if multi-timezone support is added.
        var bookingStart = booking.BookingDate.ToDateTime(booking.StartTime);
        if (bookingStart <= DateTime.Now.AddHours(1))
            throw new ArgumentException("Bookings can only be cancelled more than 1 hour before the start time.");

        await _bookingRepository.CancelAsync(bookingId, cancellationReason);
    }



    /// <inheritdoc/>
    public async Task<BookingResponse?> GetBookingByIdAsync(int userId, int bookingId, bool isAdmin = false)
    {
        var booking = await _bookingRepository.GetByIdAsync(bookingId);

        if (booking is null)
            return null;

        // Authorization check:
        // Caller must be the player who made the booking, the pitch owner, or an Admin.
        // Role-level auth is handled in the controller — here we check resource-level ownership.
        // PitchOwnerId is populated by the JOIN in GetByIdAsync — no second DB round-trip needed.
        var isPlayer     = booking.UserId      == userId;
        var isPitchOwner = booking.PitchOwnerId == userId;

        if (!isAdmin && !isPlayer && !isPitchOwner)
            throw new ForbiddenException(
                "You do not have permission to view this booking.");

        var response = MapToResponse(booking);

        // Attach the linked match so the detail page can render the visibility toggle
        // without a second round-trip. Match always exists for any booking inserted via
        // CreateWithMatchAsync, but we tolerate null defensively for any pre-existing rows.
        var match = await _matchRepository.GetByBookingIdAsync(booking.Id);
        if (match is not null)
        {
            response.Match = new MatchResponse
            {
                Id           = match.Id,
                BookingId    = match.BookingId,
                IsOpenToJoin = match.IsOpenToJoin,
                MaxPlayers   = match.MaxPlayers,
            };
        }

        return response;
    }

    /// <inheritdoc/>
    public async Task<PagedResult<BookingResponse>> GetMyBookingsAsync(int userId, BookingQuery query)
    {
        if (query.From.HasValue && query.To.HasValue && query.From > query.To)
            throw new ArgumentException("'from' date must not be later than 'to' date.");

        string? status = null;
        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            status = query.Status.ToLowerInvariant();
            if (!ValidStatuses.Contains(status))
                throw new ArgumentException(
                    "Invalid status. Must be one of: pending, confirmed, cancelled.");
        }

        var (items, totalCount) = await _bookingRepository.GetByUserIdAsync(
            userId,
            status,
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
        if (query.From.HasValue && query.To.HasValue && query.From > query.To)
            throw new ArgumentException("'from' date must not be later than 'to' date.");

        string? status = null;
        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            status = query.Status.ToLowerInvariant();
            if (!ValidStatuses.Contains(status))
                throw new ArgumentException(
                    "Invalid status. Must be one of: pending, confirmed, cancelled.");
        }

        var (items, totalCount) = await _bookingRepository.GetByOwnerIdAsync(
            ownerId,
            status,
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
        BookedAt = booking.BookedAt,
        CancellationReason = booking.CancellationReason
    };
}
