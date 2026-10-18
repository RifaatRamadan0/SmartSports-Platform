namespace SmartSports.Domain.Entities.Projections;

public class AdminUserRow
{
    public int      Id         { get; set; }
    public string   Username   { get; set; } = string.Empty;
    public string   Email      { get; set; } = string.Empty;
    public string   PhoneNumber { get; set; } = string.Empty;
    public bool     IsBanned   { get; set; }
    public DateTime CreatedAt  { get; set; }
    public string   RoleNames  { get; set; } = string.Empty;
}
