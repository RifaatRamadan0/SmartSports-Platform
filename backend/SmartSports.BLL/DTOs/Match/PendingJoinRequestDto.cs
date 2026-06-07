namespace SmartSports.BLL.DTOs.Match;

public class PendingJoinRequestDto
{
    public int      ParticipantId      { get; set; }
    public int      MatchId            { get; set; }
    public int      RequesterUserId    { get; set; }
    public string   RequesterName      { get; set; } = string.Empty;
    public string   PitchName          { get; set; } = string.Empty;
    public string   SportName          { get; set; } = string.Empty;
    public DateOnly BookingDate        { get; set; }
    public TimeOnly StartTime          { get; set; }
    public TimeOnly EndTime            { get; set; }
    public int      MaxPlayers         { get; set; }
    public int      SpotsLeft          { get; set; }
    public decimal  PricePerPlayer     { get; set; }
}
