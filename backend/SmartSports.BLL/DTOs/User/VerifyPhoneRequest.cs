using System.ComponentModel.DataAnnotations;

namespace SmartSports.BLL.DTOs.User;

public class VerifyPhoneRequest
{
    [Required]
    [MinLength(6), MaxLength(6)]
    public string Code { get; set; } = string.Empty;
}
