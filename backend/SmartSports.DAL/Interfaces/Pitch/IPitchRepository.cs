using SmartSports.Domain.Entities.Projections;
using PitchEntity = SmartSports.Domain.Entities.Pitch;

namespace SmartSports.DAL.Interfaces.Pitch;

public interface IPitchRepository
{
    /// <summary>
    /// Returns a pitch row by id, including soft-deleted rows so callers can
    /// distinguish 404 (truly missing) from 410/404 (soft-deleted).
    /// </summary>
    Task<PitchEntity?> GetByIdAsync(int pitchId);

    /// <summary>
    /// Lists active and approved (non soft-deleted) pitches with their sport name.
    /// Optional filter by sport name (case-insensitive). Returns paged rows + total.
    /// </summary>
    Task<(IEnumerable<PitchListRow> Items, long TotalCount)> ListAsync(
        string? sport, int page, int pageSize);

    /// <summary>
    /// Returns all non-deleted pitches owned by the given user (includes
    /// inactive and unapproved listings — owners need to see everything they own).
    /// </summary>
    Task<IEnumerable<PitchListRow>> ListByOwnerAsync(int ownerId);

    /// <summary>
    /// Inserts a new pitch. Server controls owner_id / is_active / is_approved /
    /// created_at — callers must populate those on the entity before calling.
    /// Returns the new pitch id.
    /// </summary>
    Task<int> InsertAsync(PitchEntity pitch);

    /// <summary>
    /// Updates the editable columns of a pitch (city, sport, name, address, price,
    /// lat/lon, max-duration, is_active). Approval state, owner, rating, and
    /// created_at are never modified here. Returns true when a row was updated.
    /// </summary>
    Task<bool> UpdateAsync(PitchEntity pitch);

    /// <summary>
    /// Soft-deletes a pitch by stamping deleted_at = NOW(). Returns true when a
    /// row was updated (already-deleted rows return false).
    /// </summary>
    Task<bool> SoftDeleteAsync(int pitchId);
}
