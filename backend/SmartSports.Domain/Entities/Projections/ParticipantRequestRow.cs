namespace SmartSports.Domain.Entities.Projections;

public record ParticipantRequestRow
{
    public int    Id       { get; init; }
    public int    MatchId  { get; init; }
    public int    UserId   { get; init; }
    public string Username { get; init; } = "";
    public string Status   { get; init; } = "";
}
