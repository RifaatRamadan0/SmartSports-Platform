using SmartSports.Domain.Entities.Projections;

namespace SmartSports.DAL.Interfaces.Pitch;

public interface IFavoritePitchRepository
{
    /// <summary>Favorites the pitch. No-op if it is already favorited.</summary>
    Task AddAsync(int userId, int pitchId);

    /// <summary>Removes the favorite. No-op if it does not exist.</summary>
    Task RemoveAsync(int userId, int pitchId);

    /// <summary>
    /// Returns a paged list of the user's favorited pitches, newest favorite first.
    /// Limited to active, approved, non-deleted pitches (hidden pitches keep their
    /// favorite row but are not returned). Every row has IsFavorited = true.
    /// </summary>
    Task<(IEnumerable<PitchListRow> Items, long TotalCount)> ListFavoritesAsync(int userId, int page, int pageSize);
}
