using SmartSports.Domain.Entities;
using SmartSports.Domain.Entities.Projections;

namespace SmartSports.DAL.Interfaces.Availability
{
    public interface IAvailabilityRepository
    {
        /// <summary>
        /// Returns the weekly schedule entry for a pitch on a specific day.
        /// Returns null if no schedule exists or the pitch is closed that day.
        /// </summary>
        Task<PitchWeeklySchedule?> GetScheduleForDayAsync(int pitchId, DayOfWeek day);

        /// <summary>
        /// Returns the max booking duration in minutes for a pitch.
        /// Returns null if the pitch doesn't exist or is inactive.
        /// </summary>
        Task<int?> GetMaxBookingDurationAsync(int pitchId);

        /// <summary>
        /// Returns start/end times of all non-cancelled bookings for a pitch on a specific date.
        /// Used to detect overlaps during slot generation.
        /// </summary>
        Task<IEnumerable<BookedInterval>> GetBookingsForDateAsync(int pitchId, DateOnly date);
    }
}
