using SmartSports.DAL.Parameters;
using SmartSports.Domain.Entities;
using SmartSports.Domain.Entities.Projections;
using SmartSports.Domain.Enums;
using PitchEntity = SmartSports.Domain.Entities.Pitch;

namespace SmartSports.DAL.Interfaces.Pitch;

public interface IPitchRepository
{
    /// <summary>
    /// Returns a pitch row by id, including soft-deleted rows so callers may
    /// inspect DeletedAt if needed. Currently all callers treat missing and
    /// soft-deleted rows the same way (404 Not Found).
    /// </summary>
    Task<PitchEntity?> GetByIdAsync(int pitchId);

    /// <summary>
    /// Returns full public detail for an active, approved pitch joined with sport type and city.
    /// Returns null if the pitch does not exist, is inactive, or is not yet approved.
    /// </summary>
    Task<PitchDetailRow?> GetDetailAsync(int pitchId);

    /// <summary>
    /// Returns pitch detail, images, schedule, and recent reviews in a single DB round-trip
    /// using QueryMultiple. Returns (null, empty, empty, empty) when the pitch is not found/active/approved.
    /// </summary>
    Task<(PitchDetailRow? Detail, IEnumerable<string> Images, IEnumerable<ScheduleRow> Schedule, IEnumerable<ReviewRow> Reviews)>
        GetDetailWithDataAsync(int pitchId, int reviewCount = 5);

    Task<IEnumerable<string>>      GetImagesAsync(int pitchId);
    Task<IEnumerable<ScheduleRow>> GetScheduleAsync(int pitchId);

    /// <summary>
    /// Returns a paged, filtered, sorted list of active and approved pitches.
    /// All filter fields in <paramref name="filters"/> are optional.
    /// </summary>
    Task<(IEnumerable<PitchListRow> Items, long TotalCount)> ListAsync(PitchFilterParams filters);

    /// <summary>
    /// Returns a paged list of non-deleted pitches owned by the given user (includes
    /// inactive and unapproved listings — owners need to see everything they own).
    /// </summary>
    Task<(IEnumerable<PitchListRow> Items, long TotalCount)> ListByOwnerAsync(int ownerId, int page, int pageSize);

    /// <summary>
    /// Inserts a new pitch. Server controls owner_id / is_active / status /
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

    /// <summary>
    /// Soft-deletes every non-deleted pitch owned by the given user (stamps
    /// deleted_at = NOW()). Used when an owner's account is deleted so their
    /// listings come down with them. Returns the number of pitches affected.
    /// </summary>
    Task<int> SoftDeleteByOwnerAsync(int ownerId);

    /// Returns all images for a pitch ordered cover-first, then by display_order, then id.
    /// </summary>
    Task<IEnumerable<PitchImage>> GetPitchImagesAsync(int pitchId);

    /// <summary>
    /// Returns one image row scoped to the given pitch, or null if it does not
    /// belong to that pitch (or does not exist).
    /// </summary>
    Task<PitchImage?> GetPitchImageAsync(int pitchId, int imageId);

    /// <summary>
    /// Inserts a new image, enforcing the per-pitch cap atomically inside the transaction.
    /// When <paramref name="isCover"/> is true, any existing cover is unset in the same
    /// transaction. display_order is assigned as MAX(display_order) + 1 within the pitch.
    /// Returns null when the cap has been reached (caller should throw 400).
    /// </summary>
    Task<PitchImage?> AddPitchImageAsync(int pitchId, string imageUrl, bool isCover, int maxImages);

    /// <summary>
    /// Sets <paramref name="imageId"/> as the cover for <paramref name="pitchId"/>,
    /// clearing any prior cover in the same transaction. Returns the updated image row,
    /// or null when the image does not belong to the pitch.
    /// </summary>
    Task<PitchImage?> SetPitchImageCoverAsync(int pitchId, int imageId);

    /// <summary>
    /// Deletes a single image scoped to its pitch. Returns false when no row matched.
    /// </summary>
    Task<bool> DeletePitchImageAsync(int pitchId, int imageId);

    /// <summary>
    /// Returns a paged list of non-deleted pitches with status = PendingApproval,
    /// joined with owner, city, and sport type — for the admin review queue.
    /// </summary>
    Task<(IEnumerable<AdminPitchRow> Items, long TotalCount)> ListPendingAsync(int page, int pageSize);

    /// <summary>
    /// Sets the status of a non-deleted pitch. Returns true when a row was updated.
    /// Used exclusively by the admin approval workflow.
    /// </summary>
    Task<bool> UpdateStatusAsync(int pitchId, PitchStatus status, string? rejectionReason = null);
}
