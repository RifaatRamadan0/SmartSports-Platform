using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SmartSports.BLL.DTOs.Auth;
using SmartSports.BLL.Interfaces;

namespace SmartSports.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IConfiguration _configuration;

    private const string RefreshTokenCookieName = "refreshToken";

    public AuthController(IAuthService authService, IConfiguration configuration)
    {
        _authService = authService;
        _configuration = configuration;
    }

    // POST api/auth/register
    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(typeof(ClientAuthResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var result = await _authService.RegisterAsync(request);

        SetRefreshTokenCookie(result.RefreshToken, result.RefreshTokenExpiresAt);

        return StatusCode(StatusCodes.Status201Created, ToClientResponse(result));
    }

    // GET api/auth/check-availability
    [HttpGet("check-availability")]
    [EnableRateLimiting("availability")]
    [ProducesResponseType(typeof(AvailabilityResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> CheckAvailability(
        [FromQuery] string? username,
        [FromQuery] string? email,
        [FromQuery] string? phoneNumber)
    {
        var result = await _authService.CheckAvailabilityAsync(username, email, phoneNumber);
        return Ok(result);
    }

    // POST api/auth/login
    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(typeof(ClientAuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _authService.LoginAsync(request);

        if (result is null)
            return Unauthorized(new { Message = "Invalid credentials." });

        SetRefreshTokenCookie(result.RefreshToken, result.RefreshTokenExpiresAt);

        return Ok(ToClientResponse(result));
    }

    // POST api/auth/refresh
    [HttpPost("refresh")]
    [ProducesResponseType(typeof(ClientAuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh()
    {
        var refreshToken = Request.Cookies[RefreshTokenCookieName];

        if (string.IsNullOrEmpty(refreshToken))
            return Unauthorized(new { Message = "Refresh token is missing." });

        var result = await _authService.RefreshTokenAsync(refreshToken);

        if (result is null)
            return Unauthorized(new { Message = "Invalid or expired refresh token." });

        SetRefreshTokenCookie(result.RefreshToken, result.RefreshTokenExpiresAt);

        return Ok(ToClientResponse(result));
    }

    // POST api/auth/logout
    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Logout()
    {
        var refreshToken = Request.Cookies[RefreshTokenCookieName];

        if (!string.IsNullOrEmpty(refreshToken))
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

    // POST api/auth/forgot-password
    [HttpPost("forgot-password")]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        var baseUrl = _configuration["Frontend:BaseUrl"]
            ?? throw new InvalidOperationException("Frontend:BaseUrl is not configured.");

        await _authService.ForgotPasswordAsync(request, baseUrl);

        return Ok(new { Message = "If that email is registered, a reset link has been sent." });
    }

    // POST api/auth/reset-password
    [HttpPost("reset-password")]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        await _authService.ResetPasswordAsync(request);
        return Ok(new { Message = "Password has been reset successfully." });
    }

    // -- Private Helpers --

    private static ClientAuthResponse ToClientResponse(AuthResponse r) => new()
    {
        AccessToken = r.AccessToken,
        ExpiresIn   = r.ExpiresIn,
        Roles        = r.Roles,
    };

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
