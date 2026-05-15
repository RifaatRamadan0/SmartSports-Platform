using SmartSports.Domain.Enums;

namespace SmartSports.BLL.DTOs.RoleRequest;

public class RoleRequestResponse
{
    public int               Id              { get; set; }
    public string            RequestedRole   { get; set; } = string.Empty;
    public RoleRequestStatus Status          { get; set; }
    public string?           RejectionReason { get; set; }
    public DateTime          CreatedAt       { get; set; }
}
