namespace SmartSports.Domain.Entities.Projections;

public record PendingJoinRequestRow
{
    public int      ParticipantId      { get; init; }
    public int      MatchId            { get; init; }
    public int      RequesterUserId    { get; init; }
    public string   RequesterName      { get; init; } = "";
    public string   PitchName          { get; init; } = "";
    public string   SportName          { get; init; } = "";
    public DateOnly BookingDate        { get; init; }
    public TimeOnly StartTime          { get; init; }
    public TimeOnly EndTime            { get; init; }
    public int      MaxPlayers         { get; init; }
    public int      SpotsLeft          { get; init; }
    public decimal  PricePerPlayer     { get; init; }
}
