using SmartSports.BLL.DTOs.Booking;
using SmartSports.BLL.DTOs.Pitch;

namespace SmartSports.BLL.Interfaces;

public interface IFavoriteService
{
    /// <summary>
    /// Toggles the favorite for the given player and pitch, returning the resulting state.
    /// Throws KeyNotFoundException when the pitch does not exist or is not publicly visible
    /// (inactive, unapproved, or soft-deleted).
    /// </summary>
    Task<bool> ToggleAsync(int userId, int pitchId);

    /// <summary>
    /// Returns a paged list of the player's favorited pitches (active, approved, non-deleted),
    /// newest favorite first, using the standard pitch summary shape.
    /// </summary>
    Task<PagedResult<PitchListResponse>> ListFavoritesAsync(int userId, int page, int pageSize);
}
