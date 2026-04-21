using System.ComponentModel.DataAnnotations;

namespace SmartSports.BLL.DTOs.Auth
{
    public class LoginRequest
    {
        [Required(ErrorMessage = "Email or username is required.")]
        public string EmailOrUsername { get; set; } = string.Empty;

        // The plain text password — we will hash this and compare it
        // to the stored hash, we never store this value
        [Required(ErrorMessage = "Password is required.")]
        [MinLength(6, ErrorMessage = "Password must be at least 6 characters long.")]
        public string Password { get; set; } = string.Empty;
    }
}
