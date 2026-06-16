using System.ComponentModel.DataAnnotations;

namespace SmartSports.BLL.DTOs.User;

public class UpdateProfileRequest
{
    [Required]
    [MinLength(3), MaxLength(50)]
    public string Username { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^((\+?961\s?|0)3|(\+?961\s?)?(70|71|76|78|79|81|82))\s?\d{3}\s?\d{3}$",
        ErrorMessage = "Enter a valid Lebanese mobile number.")]
    public string PhoneNumber { get; set; } = string.Empty;

    [Url]
    public string? ProfilePicture    { get; set; }

    [Range(1, 4)]
    public short?  SkillLevel        { get; set; }

    public string? PreferredPosition { get; set; }
}
