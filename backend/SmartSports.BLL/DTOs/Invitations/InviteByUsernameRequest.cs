using System.ComponentModel.DataAnnotations;

namespace SmartSports.BLL.DTOs.Invitations;

public class InviteByUsernameRequest
{
    [Required(ErrorMessage = "Username is required.")]
    [StringLength(50, MinimumLength = 3, ErrorMessage = "Username must be between 3 and 50 characters.")]
    public string Username { get; set; } = string.Empty;
}
