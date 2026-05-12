using System.ComponentModel.DataAnnotations;

namespace SmartSports.BLL.DTOs.Auth;

public class VerifyOtpRequest
{
    [Required]
    public string PhoneNumber { get; set; } = string.Empty;

    [Required]
    [StringLength(6, MinimumLength = 6)]
    public string Code { get; set; } = string.Empty;
}
