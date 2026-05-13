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
    /// Lists active and approved pitches, optionally filtered by sport name.
    /// </summary>
    Task<PagedResult<PitchListResponse>> ListAsync(string? sport, int page, int pageSize);

    /// <summary>
    /// Lists every pitch owned by the caller — including inactive and not-yet-approved
    /// listings — but excludes soft-deleted rows.
    /// </summary>
    Task<IEnumerable<PitchListResponse>> ListMineAsync(int ownerId);

    /// <summary>
    /// Returns full pitch detail for an owned pitch, regardless of approval/active
    /// state, so the edit form can pre-fill. Throws KeyNotFoundException if the
    /// pitch does not exist (or is soft-deleted), ForbiddenException if the caller
    /// is not the owner.
    /// </summary>
    Task<PitchResponse> GetOwnedByIdAsync(int ownerId, int pitchId);

    /// <summary>
    /// Creates a new pitch owned by <paramref name="ownerId"/>. The server sets
    /// owner_id, is_active=true, is_approved=false, created_at=NOW(). Approval
    /// flows through the admin workflow.
    /// </summary>
    Task<PitchResponse> CreateAsync(int ownerId, CreatePitchRequest request);

    /// <summary>
    /// Updates an existing pitch. Throws KeyNotFoundException when the pitch
    /// does not exist (or is soft-deleted), and ForbiddenException when the
    /// caller is not the owner. Approval state is preserved.
    /// </summary>
    Task<PitchResponse> UpdateAsync(int ownerId, int pitchId, UpdatePitchRequest request);

    /// <summary>
    /// Soft-deletes a pitch by stamping deleted_at. Same ownership/not-found
    /// semantics as UpdateAsync.
    /// </summary>
    Task SoftDeleteAsync(int ownerId, int pitchId);
}
