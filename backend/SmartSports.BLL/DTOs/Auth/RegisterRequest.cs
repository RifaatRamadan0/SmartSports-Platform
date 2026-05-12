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

    [Required]
    [RegularExpression(@"^((\+?961\s?|0)3|(\+?961\s?)?(70|71|76|78|79|81|82))\s?\d{3}\s?\d{3}$",
        ErrorMessage = "Enter a valid Lebanese mobile number (e.g. 03 123 456, 70 123 456, or +961 3 123 456).")]
    public string PhoneNumber { get; set; } = string.Empty;
}
