using System.ComponentModel.DataAnnotations;

namespace SmartSports.BLL.DTOs.RoleRequest;

public class RequestRoleRequest
{
    [Required]
    [StringLength(50)]
    public string RequestedRole { get; set; } = string.Empty;
}
