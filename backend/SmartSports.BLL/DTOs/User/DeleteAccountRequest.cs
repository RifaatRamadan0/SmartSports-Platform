using System.ComponentModel.DataAnnotations;

namespace SmartSports.BLL.DTOs.User;

public class DeleteAccountRequest
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;
}
