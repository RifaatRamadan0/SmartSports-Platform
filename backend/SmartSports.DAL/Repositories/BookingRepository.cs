using Dapper;
using Npgsql;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Booking;
using SmartSports.Domain.Entities;

namespace SmartSports.DAL.Repositories;

public class BookingRepository : IBookingRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public BookingRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<bool> HasConflictAsync(
        int pitchId, DateOnly bookingDate, TimeOnly startTime, TimeOnly endTime)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<bool>(
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
            new
            {
                PitchId = pitchId,
                BookingDate = bookingDate,
                StartTime = startTime,
                EndTime = endTime
            });
    }

    public async Task<(int Id, DateTime BookedAt)> CreateWithMatchAsync(
        int userId, int pitchId, DateOnly bookingDate,
        TimeOnly startTime, TimeOnly endTime, decimal totalPrice)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        try
        {
            // Re-check for conflicts inside the transaction with FOR UPDATE to close the
            // TOCTOU window between the pre-flight HasConflictAsync call and the INSERT.
            var conflictId = await connection.ExecuteScalarAsync<int?>(
                """
                SELECT id FROM bookings
                WHERE pitch_id     = @PitchId
                  AND booking_date = @BookingDate
                  AND status      != 'cancelled'::booking_status
                  AND start_time  < @EndTime
                  AND end_time    > @StartTime
                LIMIT 1
                FOR UPDATE
                """,
                new { PitchId = pitchId, BookingDate = bookingDate, StartTime = startTime, EndTime = endTime },
                transaction);

            if (conflictId is not null)
                throw new InvalidOperationException(
                    "This time slot is already booked. Please choose a different time.");

            var row = await connection.QuerySingleAsync<BookingInsertResult>(
                """
                INSERT INTO bookings (user_id, pitch_id, booking_date, start_time, end_time, total_price, status)
                VALUES (@UserId, @PitchId, @BookingDate, @StartTime, @EndTime, @TotalPrice, 'confirmed')
                RETURNING id, booked_at
                """,
                new
                {
                    UserId = userId,
                    PitchId = pitchId,
                    BookingDate = bookingDate,
                    StartTime = startTime,
                    EndTime = endTime,
                    TotalPrice = totalPrice
                },
                transaction);

            await connection.ExecuteAsync(
                """
                INSERT INTO matches (booking_id, is_open_to_join, max_players)
                VALUES (@BookingId, TRUE, 10)
                """,
                new { BookingId = row.Id },
                transaction);

            await transaction.CommitAsync();
            return (row.Id, row.BookedAt);
        }
        catch (PostgresException ex) when (ex.SqlState == "23505")
        {
            await transaction.RollbackAsync();
            throw new InvalidOperationException(
                "This time slot is already booked. Please choose a different time.");
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
                    b.status::TEXT  AS status,
                    b.booked_at,
                    p.name          AS pitch_name
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

        var totalCount = list.FirstOrDefault()?.TotalCount ?? 0;

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

        var totalCount = list.FirstOrDefault()?.TotalCount ?? 0;

        return (items, totalCount);
    }

    //  Private records 

    private record BookingInsertResult(int Id, DateTime BookedAt);

    // Extends Booking with a TotalCount column from the window function
    private record BookingWithCount(
        int Id, int UserId, int PitchId,
        DateOnly BookingDate, TimeOnly StartTime, TimeOnly EndTime,
        decimal TotalPrice, string Status, DateTime BookedAt,
        string PitchName, int TotalCount);
}