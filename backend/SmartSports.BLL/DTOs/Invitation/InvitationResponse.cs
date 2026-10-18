namespace SmartSports.BLL.DTOs.Invitation;

public class InvitationResponse
{
    public int Id { get; set; }
    public int MatchId { get; set; }
    public string InvitedUsername { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}
