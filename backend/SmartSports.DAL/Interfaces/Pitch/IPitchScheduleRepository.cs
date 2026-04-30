using SmartSports.Domain.Entities;

namespace SmartSports.DAL.Interfaces.Pitch
{
    public interface IPitchScheduleRepository
    {
        /// <summary>
        /// Returns all schedule rows for a given pitch (up to 7 rows, ordered by DayOfWeek).
        /// Returns an empty collection if no schedule has been set yet.
        /// </summary>
        Task<IEnumerable<PitchWeeklySchedule>> GetByPitchIdAsync(int pitchId);

        /// <summary>
        /// Inserts or updates schedule rows for a pitch.
        /// Uses Postgres ON CONFLICT DO UPDATE so calling this is safe regardless of
        /// whether the schedule already exists.
        /// All rows are wrapped in a single transaction.
        /// </summary>
        Task UpsertAsync(int pitchId, IEnumerable<PitchWeeklySchedule> schedules);

        /// <summary>
        /// Returns the owner_id of a pitch, or null if the pitch doesn't exist.
        /// Used to verify ownership before modifying the schedule.
        /// </summary>
        Task<int?> GetPitchOwnerIdAsync(int pitchId);

        /// <summary>
        /// Returns true if a pitch with the given id exists (regardless of active status).
        /// Used to distinguish "pitch not found" from "caller doesn't own this pitch".
        /// </summary>
        Task<bool> PitchExistsAsync(int pitchId);
    }
}
