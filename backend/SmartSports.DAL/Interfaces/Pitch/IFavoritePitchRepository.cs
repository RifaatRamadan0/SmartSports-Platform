using SmartSports.Domain.Entities.Projections;

namespace SmartSports.DAL.Interfaces.Pitch;

public interface IFavoritePitchRepository
{
    /// <summary>
    /// Toggles the favorite for (userId, pitchId) in a single atomic statement and
    /// returns the resulting state: true when the pitch is now favorited, false when
    /// it was just un-favorited. The composite PK prevents duplicate rows.
    /// </summary>
    Task<bool> ToggleAsync(int userId, int pitchId);

    /// <summary>
    /// Returns a paged list of the user's favorited pitches, newest favorite first.
    /// Limited to active, approved, non-deleted pitches (hidden pitches keep their
    /// favorite row but are not returned). Every row has IsFavorited = true.
    /// </summary>
    Task<(IEnumerable<PitchListRow> Items, long TotalCount)> ListFavoritesAsync(int userId, int page, int pageSize);
}
