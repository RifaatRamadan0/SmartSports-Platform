using System.ComponentModel.DataAnnotations;

namespace SmartSports.BLL.DTOs.Auth;

public class VerifyOtpRequest
{
    [Required]
    [RegularExpression(@"^((\+?961\s?|0)3|(\+?961\s?)?(70|71|76|78|79|81|82))\s?\d{3}\s?\d{3}$",
        ErrorMessage = "Enter a valid Lebanese mobile number (e.g. 03 123 456, 70 123 456, or +961 3 123 456).")]
    public string PhoneNumber { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^\d{6}$", ErrorMessage = "Code must be exactly 6 digits.")]
    public string Code { get; set; } = string.Empty;
}
