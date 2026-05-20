namespace SmartSports.BLL.DTOs.Invitations;

public class PendingInvitationDto
{
    public int      Id                   { get; set; }
    public int      MatchId              { get; set; }
    public string   PitchName            { get; set; } = string.Empty;
    public string   SportName            { get; set; } = string.Empty;
    public DateOnly BookingDate          { get; set; }
    public TimeOnly StartTime            { get; set; }
    public TimeOnly EndTime              { get; set; }
    public string   InviterDisplayName   { get; set; } = string.Empty;
    public DateTime? ExpiresAt           { get; set; }
    public int      MaxPlayers           { get; set; }
    public int      SpotsLeft            { get; set; }
    public decimal  PricePerPlayer       { get; set; }
}
