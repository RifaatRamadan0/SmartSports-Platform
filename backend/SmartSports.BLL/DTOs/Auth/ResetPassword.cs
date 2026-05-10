using System.ComponentModel.DataAnnotations;

namespace SmartSports.BLL.DTOs.Auth;

public class ResetPasswordRequest
{
    [Required]
    public Guid? Token { get; set; }

    [Required]
    [MinLength(8)]
    public string NewPassword { get; set; } = string.Empty;
}