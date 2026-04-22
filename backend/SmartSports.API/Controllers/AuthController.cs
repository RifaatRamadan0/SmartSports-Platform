using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSports.BLL.DTOs.Auth;
using SmartSports.BLL.Interfaces;

namespace SmartSports.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    private const string RefreshTokenCookieName = "refreshToken";

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    // POST api/auth/register
    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var response = await _authService.RegisterAsync(request);

        SetRefreshTokenCookie(response.RefreshToken, response.RefreshTokenExpiresAt);

        response.RefreshToken = string.Empty;

        return StatusCode(StatusCodes.Status201Created, response);
    }

    // POST api/auth/login
    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var response = await _authService.LoginAsync(request);

        if (response is null)
            return Unauthorized(new { Message = "Invalid credentials." });

        SetRefreshTokenCookie(response.RefreshToken, response.RefreshTokenExpiresAt);

        response.RefreshToken = string.Empty;

        return Ok(response);
    }

    // POST api/auth/refresh
    [HttpPost("refresh")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh()
    {
        var refreshToken = Request.Cookies[RefreshTokenCookieName];

        if (string.IsNullOrEmpty(refreshToken))
            return Unauthorized(new { Message = "Refresh token is missing." });

        var response = await _authService.RefreshTokenAsync(refreshToken);

        if (response is null)
            return Unauthorized(new { Message = "Invalid or expired refresh token." });

        SetRefreshTokenCookie(response.RefreshToken, response.RefreshTokenExpiresAt);

        response.RefreshToken = string.Empty;

        return Ok(response);
    }

    // POST api/auth/logout
    [Authorize]
    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Logout()
    {
        var refreshToken = Request.Cookies[RefreshTokenCookieName];

        if(!string.IsNullOrEmpty(refreshToken))
           await _authService.LogoutAsync(refreshToken);

        Response.Cookies.Delete(RefreshTokenCookieName, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Path = "/api/auth"
        });

        return Ok(new { Message = "Logged out successfully." });
    }

    // -- Private Helpers --

    private void SetRefreshTokenCookie(string refreshToken, DateTime expiresAt)
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Expires = expiresAt,
            Path = "/api/auth"
        };
        Response.Cookies.Append(RefreshTokenCookieName, refreshToken, cookieOptions);
    }
}
