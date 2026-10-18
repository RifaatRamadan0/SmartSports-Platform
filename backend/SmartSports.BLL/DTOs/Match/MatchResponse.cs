namespace SmartSports.BLL.DTOs.Match;

public class MatchResponse
{
    public int     Id            { get; set; }
    public int     BookingId     { get; set; }
    public bool    IsOpenToJoin  { get; set; }
    public int     MaxPlayers    { get; set; }

    // Lets clients that land on a match directly (e.g. a stale deep link) tell it's
    // dead — GetByIdAsync always includes it; other MatchResponse call sites where the
    // underlying booking status is already known set it explicitly.
    public string?  BookingStatus { get; set; }
}
