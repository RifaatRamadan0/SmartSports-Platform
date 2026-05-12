using SmartSports.BLL.DTOs.Booking;
using SmartSports.BLL.DTOs.Pitch;

namespace SmartSports.BLL.Interfaces;

public interface IPitchService
{
    /// <summary>
    /// Returns a pitch by id.
    /// Throws KeyNotFoundException when the pitch does not exist or is inactive/unapproved.
    /// </summary>
    Task<PitchResponse> GetByIdAsync(int pitchId);

    /// <summary>
    /// Returns a filtered, sorted, paginated list of active and approved pitches.
    /// </summary>
    Task<PagedResult<PitchListResponse>> ListAsync(PitchSearchQuery query);
}
