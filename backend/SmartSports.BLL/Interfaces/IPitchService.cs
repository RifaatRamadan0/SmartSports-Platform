using SmartSports.BLL.DTOs.Pitch;

namespace SmartSports.BLL.Interfaces;

public interface IPitchService
{
    /// <summary>
    /// Returns a pitch by id.
    /// Throws KeyNotFoundException when the pitch does not exist or is inactive/unapproved.
    /// </summary>
    Task<PitchResponse> GetByIdAsync(int pitchId);
}
