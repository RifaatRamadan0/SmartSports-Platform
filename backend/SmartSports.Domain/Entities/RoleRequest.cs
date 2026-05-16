using SmartSports.Domain.Enums;

namespace SmartSports.Domain.Entities;

public class RoleRequest
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string RequestedRole { get; set; } = string.Empty;
    public RoleRequestStatus Status { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public int? ProcessedBy { get; set; }

    // Populated via JOIN for admin view
    public string? Username { get; set; }
    public string? Email { get; set; }
}
