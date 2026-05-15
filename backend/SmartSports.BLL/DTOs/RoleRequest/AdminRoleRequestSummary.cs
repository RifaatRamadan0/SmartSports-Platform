namespace SmartSports.BLL.DTOs.RoleRequest;

public class AdminRoleRequestSummary
{
    public int      Id            { get; set; }
    public int      UserId        { get; set; }
    public string   Username      { get; set; } = string.Empty;
    public string   Email         { get; set; } = string.Empty;
    public string   RequestedRole { get; set; } = string.Empty;
    public DateTime CreatedAt     { get; set; }
}
