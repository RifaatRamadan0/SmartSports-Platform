using System.ComponentModel.DataAnnotations;

namespace SmartSports.BLL.DTOs.RoleRequest;

public class RejectRoleRequestRequest
{
    [StringLength(500)]
    public string? Reason { get; set; }
}
