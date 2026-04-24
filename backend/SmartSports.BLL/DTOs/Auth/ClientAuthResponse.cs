namespace SmartSports.BLL.DTOs.Auth;

public class ClientAuthResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public int ExpiresIn { get; set; }
    public IEnumerable<string> Roles { get; set; } = [];
}
