using Dapper;
using Npgsql;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Booking;
using SmartSports.Domain.Entities.Projections;
using SmartSports.Domain.Exceptions;

namespace SmartSports.DAL.Repositories.Booking;
// Imported inside the namespace so entity types resolve before the sibling
// SmartSports.DAL.Repositories.* namespaces that share their names.
using SmartSports.Domain.Entities;

public class BookingRepository : IBookingRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public BookingRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<(int Id, DateTime BookedAt, int MatchId)> CreateWithMatchAsync(
        int userId, int pitchId, DateOnly bookingDate,
        TimeOnly startTime, TimeOnly endTime, decimal totalPrice,
        bool isOpenToJoin, int maxPlayers)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        try
        {
            // Acquire a transaction-scoped advisory lock keyed on (pitchId, date) before the
            // conflict check. Any concurrent request for the same pitch+date blocks here
            // until the first transaction commits or rolls back, eliminating the TOCTOU
            // gap between a read-then-insert pattern.
            await connection.ExecuteAsync(
                "SELECT pg_advisory_xact_lock(@PitchId, @DateDay)",
                new { PitchId = pitchId, DateDay = bookingDate.DayNumber },
                transaction);

            var conflict = await connection.ExecuteScalarAsync<bool>(
                """
                SELECT EXISTS (
                    SELECT 1 FROM bookings
                    WHERE pitch_id     = @PitchId
                      AND booking_date = @BookingDate
                      AND status      != 'cancelled'::booking_status
                      AND start_time  < @EndTime
                      AND end_time    > @StartTime
                )
                """,
                new { PitchId = pitchId, BookingDate = bookingDate, StartTime = startTime, EndTime = endTime },
                transaction);

            if (conflict)
                throw new ConflictException("This time slot conflicts with an existing booking.");

            var row = await connection.QuerySingleAsync<BookingInsertResult>(
                """
                INSERT INTO bookings (user_id, pitch_id, booking_date, start_time, end_time, total_price, status)
                VALUES (@UserId, @PitchId, @BookingDate, @StartTime, @EndTime, @TotalPrice, 'confirmed')
                RETURNING id, booked_at
                """,
                new
                {
                    UserId      = userId,
                    PitchId     = pitchId,
                    BookingDate = bookingDate,
                    StartTime   = startTime,
                    EndTime     = endTime,
                    TotalPrice  = totalPrice
                },
                transaction);

            var matchId = await connection.ExecuteScalarAsync<int>(
                """
                INSERT INTO matches (booking_id, is_open_to_join, max_players)
                VALUES (@BookingId, @IsOpenToJoin, @MaxPlayers)
                RETURNING id
                """,
                new
                {
                    BookingId    = row.Id,
                    IsOpenToJoin = isOpenToJoin,
                    MaxPlayers   = maxPlayers,
                },
                transaction);

            await transaction.CommitAsync();
            return (row.Id, row.BookedAt, matchId);
        }
        catch (ConflictException)
        {
            await transaction.RollbackAsync();
            throw;
        }
        catch (PostgresException ex) when (ex.SqlState == "23505")
        {
            await transaction.RollbackAsync();
            throw new ConflictException("This time slot conflicts with an existing booking.");
        }
        catch (PostgresException ex) when (ex.SqlState == "23514")
        {
            // CHECK constraint violation — e.g. end_time > start_time, duration bounds
            await transaction.RollbackAsync();
            throw new ArgumentException("Booking values are out of the allowed range.");
        }
        catch (PostgresException ex) when (ex.SqlState == "23502")
        {
            // NOT NULL violation — a required field was missing
            await transaction.RollbackAsync();
            throw new ArgumentException("A required booking field is missing.");
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<Booking?> GetByIdAsync(int bookingId)
    {
        using var connection = _connectionFactory.CreateConnection();

        return await connection.QuerySingleOrDefaultAsync<Booking>(
            """
            SELECT  b.id,
                    b.user_id,
                    b.pitch_id,
                    b.booking_date,
                    b.start_time,
                    b.end_time,
                    b.total_price,
                    b.status::TEXT      AS status,
                    b.booked_at,
                    b.cancellation_reason,
                    p.name              AS pitch_name,
                    p.owner_id          AS pitch_owner_id,
                    EXISTS (
                        SELECT 1 FROM reviews r
                        WHERE  r.booking_id = b.id AND r.user_id = b.user_id
                    )                   AS has_reviewed
            FROM    bookings b
            JOIN    pitches  p ON p.id = b.pitch_id
            WHERE   b.id = @BookingId
            """,
            new { BookingId = bookingId });
    }

    /// <inheritdoc/>
    public async Task<(IEnumerable<Booking> Items, int TotalCount)> GetByUserIdAsync(
        int userId,
        string? status,
        DateOnly? from,
        DateOnly? to,
        int page,
        int pageSize)
    {
        using var connection = _connectionFactory.CreateConnection();

        // Dynamic WHERE clause — only add filters that were actually provided
        var where = new List<string> { "b.user_id = @UserId" };

        if (!string.IsNullOrWhiteSpace(status))
            where.Add("b.status = @Status::booking_status");

        if (from.HasValue)
            where.Add("b.booking_date >= @From");

        if (to.HasValue)
            where.Add("b.booking_date <= @To");

        var whereClause = string.Join(" AND ", where);

        var sql = $"""
            SELECT  b.id,
                    b.user_id,
                    b.pitch_id,
                    b.booking_date,
                    b.start_time,
                    b.end_time,
                    b.total_price,
                    b.status::TEXT  AS status,
                    b.booked_at,
                    p.name          AS pitch_name,
                    COUNT(*) OVER() AS total_count
            FROM    bookings b
            JOIN    pitches  p ON p.id = b.pitch_id
            WHERE   {whereClause}
            ORDER BY b.booking_date DESC, b.start_time DESC
            LIMIT   @PageSize
            OFFSET  @Offset
            """;

        var rows = await connection.QueryAsync<BookingWithCount>(
            sql,
            new
            {
                UserId = userId,
                Status = status,
                From = from,
                To = to,
                PageSize = pageSize,
                Offset = (page - 1) * pageSize
            });

        var list = rows.ToList();

        var items = list.Select(r => new Booking
        {
            Id = r.Id,
            UserId = r.UserId,
            PitchId = r.PitchId,
            BookingDate = r.BookingDate,
            StartTime = r.StartTime,
            EndTime = r.EndTime,
            TotalPrice = r.TotalPrice,
            Status = r.Status,
            BookedAt = r.BookedAt,
            PitchName = r.PitchName
        });

        var totalCount = (int)(list.FirstOrDefault()?.TotalCount ?? 0);

        return (items, totalCount);
    }

    /// <inheritdoc/>
    public async Task<(IEnumerable<Booking> Items, int TotalCount)> GetByOwnerIdAsync(
        int ownerId,
        string? status,
        DateOnly? from,
        DateOnly? to,
        int page,
        int pageSize)
    {
        using var connection = _connectionFactory.CreateConnection();

        // Filter by owner through the pitches JOIN
        var where = new List<string> { "p.owner_id = @OwnerId" };

        if (!string.IsNullOrWhiteSpace(status))
            where.Add("b.status = @Status::booking_status");

        if (from.HasValue)
            where.Add("b.booking_date >= @From");

        if (to.HasValue)
            where.Add("b.booking_date <= @To");

        var whereClause = string.Join(" AND ", where);

        var sql = $"""
            SELECT  b.id,
                    b.user_id,
                    b.pitch_id,
                    b.booking_date,
                    b.start_time,
                    b.end_time,
                    b.total_price,
                    b.status::TEXT  AS status,
                    b.booked_at,
                    p.name          AS pitch_name,
                    COUNT(*) OVER() AS total_count
            FROM    bookings b
            JOIN    pitches  p ON p.id = b.pitch_id
            WHERE   {whereClause}
            ORDER BY b.booking_date DESC, b.start_time DESC
            LIMIT   @PageSize
            OFFSET  @Offset
            """;

        var rows = await connection.QueryAsync<BookingWithCount>(
            sql,
            new
            {
                OwnerId = ownerId,
                Status = status,
                From = from,
                To = to,
                PageSize = pageSize,
                Offset = (page - 1) * pageSize
            });

        var list = rows.ToList();

        var items = list.Select(r => new Booking
        {
            Id = r.Id,
            UserId = r.UserId,
            PitchId = r.PitchId,
            BookingDate = r.BookingDate,
            StartTime = r.StartTime,
            EndTime = r.EndTime,
            TotalPrice = r.TotalPrice,
            Status = r.Status,
            BookedAt = r.BookedAt,
            PitchName = r.PitchName
        });

        var totalCount = (int)(list.FirstOrDefault()?.TotalCount ?? 0);

        return (items, totalCount);
    }

    public async Task<BookingCancelInfo?> GetCancelInfoByIdAsync(int bookingId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<BookingCancelInfo>(
            """
            SELECT id, user_id, status, booking_date, start_time
            FROM bookings
            WHERE id = @Id
            """,
            new { Id = bookingId });
    }

    public async Task<BookingCancelResult> CancelWithParticipantsAsync(int bookingId, string? cancellationReason)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        try
        {
            var updated = await connection.ExecuteAsync(
                "UPDATE bookings SET status = 'cancelled', cancellation_reason = @Reason WHERE id = @Id AND status = 'confirmed'",
                new { Id = bookingId, Reason = cancellationReason },
                transaction);

            // Nothing to cascade if the booking wasn't actually cancelled (already
            // cancelled/pending, or a race with another cancel request).
            if (updated == 0)
            {
                await transaction.RollbackAsync();
                return new BookingCancelResult(null, Array.Empty<int>());
            }

            var matchId = await connection.ExecuteScalarAsync<int?>(
                "SELECT id FROM matches WHERE booking_id = @BookingId",
                new { BookingId = bookingId },
                transaction);

            if (matchId is null)
            {
                await transaction.CommitAsync();
                return new BookingCancelResult(null, Array.Empty<int>());
            }

            // Both 'accepted' and 'pending' players consider themselves "in" the match —
            // both should be told it's off.
            var participantIds = (await connection.QueryAsync<int>(
                "SELECT user_id FROM match_participants WHERE match_id = @MatchId AND status IN ('accepted', 'pending')",
                new { MatchId = matchId },
                transaction)).ToList();

            // A pending invitation to a now-dead match can never be accepted (guarded at the
            // service layer), so mark it expired rather than leaving it stuck in the invitee's
            // pending list forever.
            await connection.ExecuteAsync(
                "UPDATE invitations SET status = 'expired' WHERE match_id = @MatchId AND status = 'pending'",
                new { MatchId = matchId },
                transaction);

            await transaction.CommitAsync();
            return new BookingCancelResult(matchId, participantIds);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    //  Private records

    private record BookingInsertResult(int Id, DateTime BookedAt);

    // Extends Booking with a TotalCount column from the window function
    private record BookingWithCount(
        int Id, int UserId, int PitchId,
        DateOnly BookingDate, TimeOnly StartTime, TimeOnly EndTime,
        decimal TotalPrice, string Status, DateTime BookedAt,
        string PitchName, long TotalCount);
}
