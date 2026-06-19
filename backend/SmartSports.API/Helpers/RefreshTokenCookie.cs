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

    // SameSite=None is intentional.
    // The frontend (e.g. http://localhost:5173) and API (e.g. http://localhost:5000)
    // run on different origins, so the /api/auth/refresh call is a cross-site
    // credentialed XHR. SameSite=Lax allows top-level GET navigations but blocks
    // the cookie on cross-site fetch/XHR, which is what would break silent refresh.
    // SameSite=None + Secure is the only combination that lets the browser send
    // the cookie on a cross-origin fetch.
    // CSRF risk is acceptable here because:
    //   - The cookie is HttpOnly (unreachable by JS)
    //   - The refresh endpoint only issues a new access token; it performs no state mutation
    //   - Access tokens expire in 15 minutes, limiting blast radius
    //   - The path scopes the cookie to /api/auth so it isn't sent on ordinary API calls
    private static CookieOptions BuildOptions() => new()
    {
        HttpOnly = true,
        Secure   = true,
        SameSite = SameSiteMode.None,
        Path     = "/api/auth"
    };
}
