namespace SmartSports.Domain.Entities.Projections;

// Carries the same display columns as OpenMatchRow plus the caller's relation
// to the match (organizer vs. participant + their join status). Returned by
// MatchRepository.ListMyAsync.
public record MyMatchRow
{
    public int      MatchId        { get; init; }
    public string   PitchName      { get; init; } = "";
    public string   CityName       { get; init; } = "";
    public string   SportName      { get; init; } = "";
    public DateOnly BookingDate    { get; init; }
    public TimeOnly StartTime      { get; init; }
    public TimeOnly EndTime        { get; init; }
    public int      AcceptedCount  { get; init; }
    public int      MaxPlayers     { get; init; }
    public string   OrganizerName  { get; init; } = "";
    public int      OrganizerId    { get; init; }
    public decimal  TotalPrice     { get; init; }
    public decimal  PricePerPlayer { get; init; }
    public string   MyRole         { get; init; } = ""; // "organizer" | "participant"
    public string?  MyStatus       { get; init; }       // "accepted" | "pending" | null
}
