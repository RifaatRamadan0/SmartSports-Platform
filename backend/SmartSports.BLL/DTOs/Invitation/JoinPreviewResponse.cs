namespace SmartSports.BLL.DTOs.Invitation;

public class JoinPreviewResponse
{
    public int                         MatchId         { get; init; }
    public string                      SportName       { get; init; } = "";
    public DateOnly                    MatchDate       { get; init; }
    public TimeOnly                    StartTime       { get; init; }
    public TimeOnly                    EndTime         { get; init; }
    public string                      PitchName       { get; init; } = "";
    public string                      CityName        { get; init; } = "";
    public string                      OrganizerName   { get; init; } = "";
    public int                         MaxPlayers      { get; init; }
    public int                         CurrentPlayers  { get; init; }
    public int                         SpotsLeft       { get; init; }
    public decimal                     PricePerPlayer  { get; init; }
    public bool                        IsExpired       { get; init; }
    public bool                        IsOpenToJoin    { get; init; }
    public IEnumerable<AcceptedPlayer> AcceptedPlayers { get; init; } = [];
}

public record AcceptedPlayer(string Username);
