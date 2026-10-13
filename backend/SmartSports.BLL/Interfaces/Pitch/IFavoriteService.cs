using SmartSports.BLL.DTOs.Booking;
using SmartSports.BLL.DTOs.Common;
using SmartSports.BLL.DTOs.Pitch;

namespace SmartSports.BLL.Interfaces.Pitch;

public interface IFavoriteService
{
    /// <summary>
    /// Favorites the pitch for the player. Idempotent.
    /// Throws KeyNotFoundException when the pitch does not exist or is not publicly visible.
    /// </summary>
    Task AddAsync(int userId, int pitchId);

    /// <summary>Removes the player's favorite. Idempotent; no pitch check.</summary>
    Task RemoveAsync(int userId, int pitchId);

    /// <summary>
    /// Returns a paged list of the player's favorited pitches (active, approved, non-deleted),
    /// newest favorite first, using the standard pitch summary shape.
    /// </summary>
    Task<PagedResult<PitchListResponse>> ListFavoritesAsync(int userId, int page, int pageSize);
}
