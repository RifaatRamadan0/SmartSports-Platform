using SmartSports.BLL.DTOs.Admin;
using SmartSports.BLL.DTOs.Booking;
using SmartSports.BLL.DTOs.Common;

namespace SmartSports.BLL.Interfaces.Admin;

public interface IAdminPitchService
{
    /// <summary>
    /// Returns a paginated list of pitches awaiting admin review (status = PendingApproval).
    /// </summary>
    Task<PagedResult<AdminPitchSummaryResponse>> GetPendingPitchesAsync(int page, int pageSize);

    /// <summary>
    /// Approves a pitch, making it visible in public search results.
    /// Throws KeyNotFoundException if the pitch does not exist or is soft-deleted.
    /// </summary>
    Task ApproveAsync(int pitchId);

    /// <summary>
    /// Rejects a pitch. The optional <paramref name="reason"/> is returned to the
    /// pitch owner so they know what to fix. Throws KeyNotFoundException if the
    /// pitch does not exist or is soft-deleted.
    /// </summary>
    Task RejectAsync(int pitchId, string? reason);
}
