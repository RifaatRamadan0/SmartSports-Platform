namespace SmartSports.Domain.Entities;

public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? ProfilePicture { get; set; }
    public short? SkillLevel { get; set; }
    public string? PreferredPosition { get; set; }
    public DateTime CreatedAt { get; set; }
}
