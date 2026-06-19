namespace SmartSports.Domain.Entities;

/// <summary>
/// Join row marking a pitch a player has saved as a favorite.
/// Natural key is (UserId, PitchId) — see migration 029.
/// </summary>
public class UserFavoritePitch
{
    public int      UserId    { get; set; }
    public int      PitchId   { get; set; }
    public DateTime CreatedAt { get; set; }
}
