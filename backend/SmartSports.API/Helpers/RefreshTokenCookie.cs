namespace SmartSports.API.Helpers;

/// <summary>
/// Single source of truth for the refresh-token cookie. Both the auth flow and the
/// change-password flow issue this cookie, and the attributes must match exactly so a
/// newly issued token overwrites the previous one rather than creating a second cookie.
/// </summary>
public static class RefreshTokenCookie
{
    public const string Name = "refreshToken";

    public static void Append(HttpResponse response, string token, DateTime expiresAt)
    {
        var options = BuildOptions();
        options.Expires = expiresAt;
        response.Cookies.Append(Name, token, options);
    }

    public static void Delete(HttpResponse response) =>
        response.Cookies.Delete(Name, BuildOptions());

    // Lax works because frontend and API are same-site (localhost:5173 → :5079 locally,
    // one origin in production); SameSite ignores the port. It stops other sites from
    // triggering /refresh or /logout with this cookie, which CORS does not prevent.
    // Hosting the frontend on a different domain would need SameSite=None again.
    private static CookieOptions BuildOptions() => new()
    {
        HttpOnly = true,
        Secure   = true,
        SameSite = SameSiteMode.Lax,
        Path     = "/api/auth"
    };
}
