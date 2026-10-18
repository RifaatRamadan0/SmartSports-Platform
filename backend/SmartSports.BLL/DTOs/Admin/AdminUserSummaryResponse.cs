namespace SmartSports.BLL.DTOs.Admin;

public class AdminUserSummaryResponse
{
    public int                  Id          { get; set; }
    public string               Username    { get; set; } = string.Empty;
    public string               Email       { get; set; } = string.Empty;
    public string               PhoneNumber { get; set; } = string.Empty;
    public bool                 IsBanned    { get; set; }
    public DateTime             CreatedAt   { get; set; }
    public IEnumerable<string>  Roles       { get; set; } = Array.Empty<string>();
}
