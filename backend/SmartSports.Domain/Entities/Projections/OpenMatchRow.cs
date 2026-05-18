namespace SmartSports.Domain.Entities.Projections;

public record OpenMatchRow
{
    public int      MatchId       { get; init; }
    public string   PitchName     { get; init; } = "";
    public string   CityName      { get; init; } = "";
    public string   SportName     { get; init; } = "";
    public DateOnly BookingDate   { get; init; }
    public TimeOnly StartTime     { get; init; }
    public TimeOnly EndTime       { get; init; }
    public int      AcceptedCount    { get; init; }
    public int      MaxPlayers       { get; init; }
    public string   OrganizerName    { get; init; } = "";
    public int      OrganizerId      { get; init; }
    public decimal  PricePerPlayer   { get; init; }
}
