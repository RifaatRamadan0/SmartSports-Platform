namespace SmartSports.BLL.DTOs.Auth;

public class AuthResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public int ExpiresIn { get; set; } // seconds

    public string RefreshToken { get; set; } = string.Empty;
    public DateTime RefreshTokenExpiresAt { get; set; }
}
