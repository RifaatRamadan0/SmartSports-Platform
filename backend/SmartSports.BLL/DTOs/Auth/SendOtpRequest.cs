using System.ComponentModel.DataAnnotations;

namespace SmartSports.BLL.DTOs.Auth;

public class SendOtpRequest
{
    [Required]
    public string PhoneNumber { get; set; } = string.Empty;
}
