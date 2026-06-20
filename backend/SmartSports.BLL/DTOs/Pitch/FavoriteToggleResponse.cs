namespace SmartSports.BLL.DTOs.Pitch;

/// <summary>Result of toggling a pitch favorite: the player's new favorite state.</summary>
public class FavoriteToggleResponse
{
    public bool IsFavorited { get; init; }
}
