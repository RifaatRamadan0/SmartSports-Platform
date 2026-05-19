namespace SmartSports.Domain.Entities.Projections;

public record InvitePreviewRow
{
    public int      MatchId        { get; init; }
    public string   SportName      { get; init; } = "";
    public DateOnly MatchDate      { get; init; }
    public TimeOnly StartTime      { get; init; }
    public TimeOnly EndTime        { get; init; }
    public string   PitchName      { get; init; } = "";
    public string   CityName       { get; init; } = "";
    public string   OrganizerName  { get; init; } = "";
    public int      MaxPlayers     { get; init; }
    public int      CurrentPlayers { get; init; }
    public decimal  PricePerPlayer { get; init; }
    public bool     IsExpired      { get; init; }
}
