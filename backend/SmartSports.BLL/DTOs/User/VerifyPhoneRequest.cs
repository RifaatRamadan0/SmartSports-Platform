using System.ComponentModel.DataAnnotations;

namespace SmartSports.BLL.DTOs.User;

public class VerifyPhoneRequest
{
    [Required]
    public string Code { get; set; } = string.Empty;
}
