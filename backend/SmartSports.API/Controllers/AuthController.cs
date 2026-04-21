using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
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
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var response = await _authService.RegisterAsync(request);

        SetRefreshTokenCookie(response.RefreshToken);

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

        SetRefreshTokenCookie(response.RefreshToken);

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

        SetRefreshTokenCookie(response.RefreshToken);

        response.RefreshToken = string.Empty;

        return Ok(response);
    }

    // -- Private Helpers --

    private void SetRefreshTokenCookie(string refreshToken)
    {
        var expiryDays = int.TryParse(_configuration["Jwt:RefreshTokenExpiryDays"], out var parsed) ? parsed : 7;

        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Expires = DateTime.UtcNow.AddDays(expiryDays),
            Path = "/api/auth"
        };
        Response.Cookies.Append(RefreshTokenCookieName, refreshToken, cookieOptions);
    }
}
