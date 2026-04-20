namespace SmartSports.BLL.DTOs;

public class AuthResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public int ExpiresIn { get; set; } // seconds
}
