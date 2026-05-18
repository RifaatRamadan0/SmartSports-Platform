namespace SmartSports.Domain.Entities;

public class Invitation
{
    public int Id { get; set; }
    public int MatchId { get; set; }
    public int InvitedById { get; set; }
    public int? InvitedUserId { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public string Token { get; set; } = string.Empty;
    public string Status { get; set; } = "pending";
}
