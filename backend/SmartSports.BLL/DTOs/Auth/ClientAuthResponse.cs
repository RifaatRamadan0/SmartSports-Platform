namespace SmartSports.BLL.DTOs.Auth;

public class ClientAuthResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public int ExpiresIn { get; set; }
    public IEnumerable<string> Roles { get; set; } = [];

    /// Projects the internal AuthResponse to the client-safe shape (drops the
    /// refresh token, which travels only in the HttpOnly cookie).
    public static ClientAuthResponse From(AuthResponse r) => new()
    {
        AccessToken = r.AccessToken,
        ExpiresIn   = r.ExpiresIn,
        Roles       = r.Roles,
    };
}
