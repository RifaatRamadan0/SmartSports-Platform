using System.ComponentModel.DataAnnotations;

namespace SmartSports.BLL.DTOs.Auth;

public class VerifyOtpRequest
{
    [Required]
    public string PhoneNumber { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^\d{6}$", ErrorMessage = "Code must be exactly 6 digits.")]
    public string Code { get; set; } = string.Empty;
}
