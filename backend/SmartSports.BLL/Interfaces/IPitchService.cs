using SmartSports.BLL.DTOs.Booking;
using SmartSports.BLL.DTOs.Pitch;

namespace SmartSports.BLL.Interfaces;

public interface IPitchService
{
    /// <summary>
    /// Returns full public detail for an active, approved pitch including images, schedule, and recent reviews.
    /// Throws KeyNotFoundException when the pitch does not exist or is inactive/unapproved.
    /// </summary>
    Task<PitchDetailResponse> GetDetailAsync(int pitchId);

    /// <summary>
    /// Returns a filtered, sorted, paginated list of active and approved pitches.
    /// </summary>
    Task<PagedResult<PitchListResponse>> ListAsync(PitchSearchQuery query);
}
