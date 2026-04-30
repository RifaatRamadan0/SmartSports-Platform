using Dapper;
using Npgsql;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Booking;

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
        connection.Open();
        using var transaction = connection.BeginTransaction();
        try
        {
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

            transaction.Commit();
            return (row.Id, row.BookedAt);
        }
        catch (PostgresException ex) when (ex.SqlState == "23505")
        {
            transaction.Rollback();
            throw new InvalidOperationException(
                "This time slot is already booked. Please choose a different time.");
        }
    }

    private record BookingInsertResult(int Id, DateTime BookedAt);
}
