using Dapper;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Availability;
using SmartSports.Domain.Entities;
using SmartSports.Domain.Entities.Projections;

namespace SmartSports.DAL.Repositories
{
    public class AvailabilityRepository : IAvailabilityRepository
    {
        private readonly IDbConnectionFactory _connectionFactory;

        public AvailabilityRepository(IDbConnectionFactory connectionFactory)
        {
            _connectionFactory = connectionFactory;
        }

        /// <inheritdoc/>
        public async Task<PitchWeeklySchedule?> GetScheduleForDayAsync(int pitchId, DayOfWeek day)
        {
            using var connection = _connectionFactory.CreateConnection();

            return await connection.QuerySingleOrDefaultAsync<PitchWeeklySchedule>(
                """
                SELECT  id,
                        pitch_id,
                        day_of_week,
                        open_time,
                        close_time,
                        is_active
                FROM    pitch_weekly_schedules
                WHERE   pitch_id    = @PitchId
                AND     day_of_week = @DayOfWeek
                AND     is_active   = TRUE
                """,
                new { PitchId = pitchId, DayOfWeek = (int)day });
        }


        /// <inheritdoc/>
        public async Task<int?> GetMaxBookingDurationAsync(int pitchId)
        {
            using var connection = _connectionFactory.CreateConnection();

            return await connection.QuerySingleOrDefaultAsync<int?>(
                """
                SELECT  max_booking_duration_minutes
                FROM    pitches
                WHERE   id          = @PitchId
                AND     is_active   = TRUE
                AND     is_approved = TRUE
                """,
                new { PitchId = pitchId });
        }

        /// <inheritdoc/>
        public async Task<IEnumerable<BookedInterval>> GetBookingsForDateAsync(int pitchId, DateOnly date)
        {
            using var connection = _connectionFactory.CreateConnection();

            return await connection.QueryAsync<BookedInterval>(
                """
                SELECT  start_time,
                        end_time
                FROM    bookings
                WHERE   pitch_id     = @PitchId
                AND     booking_date = @Date
                AND     status      != 'cancelled'::booking_status
                """,
                new { PitchId = pitchId, Date = date });
        }
    }
}
