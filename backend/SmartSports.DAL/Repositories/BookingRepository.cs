using Dapper;
using Npgsql;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Booking;
using SmartSports.Domain.Exceptions;

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
                  AND status      != 'cancelled'
                  AND start_time  < @EndTime
                  AND end_time    > @StartTime
            )
            """,
            new
            {
                PitchId     = pitchId,
                BookingDate = bookingDate,
                StartTime   = startTime,
                EndTime     = endTime
            });
    }

    public async Task<(int Id, DateTime BookedAt)> CreateWithMatchAsync(
        int userId, int pitchId, DateOnly bookingDate,
        TimeOnly startTime, TimeOnly endTime, decimal totalPrice)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();
        using var transaction = await connection.BeginTransactionAsync();
        try
        {
            // Acquire a session-level advisory lock keyed on (pitchId, date) before the
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
                      AND status      != 'cancelled'
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
        catch (ConflictException)
        {
            await transaction.RollbackAsync();
            throw;
        }
        catch (PostgresException ex) when (ex.SqlState == "23505")
        {
            await transaction.RollbackAsync();
            throw new ConflictException("This time slot is already booked. Please choose a different time.");
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    private record BookingInsertResult(int Id, DateTime BookedAt);
}
