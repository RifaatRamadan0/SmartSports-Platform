using SmartSports.BLL.DTOs.Schedule;

namespace SmartSports.BLL.Interfaces
{
    public interface IPitchScheduleService
    {
        /// <summary>
        /// Returns the full 7-day schedule for a pitch.
        /// Public — no auth required.
        /// Returns an empty list if no schedule has been configured yet.
        /// </summary>
        Task<IEnumerable<PitchScheduleResponse>> GetScheduleAsync(int pitchId);

        /// <summary>
        /// Saves (inserts or updates) the full weekly schedule for a pitch.
        /// Validates that the caller (ownerId) owns the given pitch before saving.
        /// Throws NotFoundException if the pitch doesn't exist.
        /// Throws ForbiddenException if the caller doesn't own the pitch.
        /// </summary>
        Task UpsertScheduleAsync(int ownerId, int pitchId, UpsertScheduleRequest request);
    }
}
