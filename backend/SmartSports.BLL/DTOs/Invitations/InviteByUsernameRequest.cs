using System.ComponentModel.DataAnnotations;

namespace SmartSports.BLL.DTOs.Invitations;

public class InviteByUsernameRequest
{
    [Required(ErrorMessage = "Username is required.")]
    [StringLength(50, MinimumLength = 3, ErrorMessage = "Username must be between 3 and 50 characters.")]
    [RegularExpression(@"^[a-zA-Z0-9_.\-]+$",
        ErrorMessage = "Username may only contain letters, numbers, underscores, dots, and hyphens.")]
    public string Username { get; set; } = string.Empty;
}
