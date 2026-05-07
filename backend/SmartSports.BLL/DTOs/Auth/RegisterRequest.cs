using System.ComponentModel.DataAnnotations;

namespace SmartSports.BLL.DTOs.Auth;

public class RegisterRequest
{
    [Required]
    [MinLength(3), MaxLength(50)]
    public string Username { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    public string Password { get; set; } = string.Empty;

    [Required]
    public string Role { get; set; } = string.Empty; // "Player" or "PitchOwner"

    public int? SkillLevel { get; set; }
    public string? PreferredPosition { get; set; }
    public string? PhoneNumber { get; set; }
}
