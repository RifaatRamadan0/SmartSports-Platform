namespace SmartSports.Domain.Entities.Projections;

public record PendingInvitationRow
{
    public int       InvitationId         { get; init; }
    public int       MatchId              { get; init; }
    public string    PitchName            { get; init; } = "";
    public string    SportName            { get; init; } = "";
    public DateOnly  BookingDate          { get; init; }
    public TimeOnly  StartTime            { get; init; }
    public TimeOnly  EndTime              { get; init; }
    public string    InviterDisplayName   { get; init; } = "";
    public DateTime? ExpiresAt            { get; init; }
    public int       MaxPlayers           { get; init; }
    public int       SpotsLeft            { get; init; }
    public decimal   PricePerPlayer       { get; init; }
}
