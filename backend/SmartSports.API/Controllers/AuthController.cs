using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SmartSports.BLL.DTOs.Auth;
using SmartSports.BLL.Interfaces;
using Twilio.Exceptions;

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
        _authService   = authService;
        _configuration = configuration;
    }

    // POST api/auth/register
    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var baseUrl = _configuration["Frontend:BaseUrl"]
            ?? throw new InvalidOperationException("Frontend:BaseUrl is not configured.");

        await _authService.RegisterAsync(request, baseUrl);

        return StatusCode(StatusCodes.Status201Created,
            new { Message = "Account created. Please check your email to verify your account." });
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
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
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
            Secure   = true,
            SameSite = SameSiteMode.None,
            Path     = "/api/auth"
        });

        return Ok(new { Message = "Logged out successfully." });
    }

    // GET api/auth/verify-email?token=...
    [HttpGet("verify-email")]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> VerifyEmail([FromQuery] Guid token)
    {
        await _authService.VerifyEmailAsync(token);
        return Ok(new { Message = "Email verified successfully." });
    }

    // POST api/auth/resend-verification
    [HttpPost("resend-verification")]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ResendVerification([FromBody] ResendVerificationRequest request)
    {
        var baseUrl = _configuration["Frontend:BaseUrl"]
            ?? throw new InvalidOperationException("Frontend:BaseUrl is not configured.");

        await _authService.ResendVerificationEmailAsync(request.Email, baseUrl);

        return Ok(new { Message = "If that email is registered and unverified, a new link has been sent." });
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

    // POST api/auth/phone/send-otp
    [HttpPost("phone/send-otp")]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SendPhoneOtp([FromBody] SendOtpRequest request)
    {
        try
        {
            await _authService.SendPhoneOtpAsync(request.PhoneNumber);
            return Ok(new { Message = "Verification code sent." });
        }
        catch (TwilioException)
        {
            return BadRequest(new { Message = "Could not send verification code. Check the phone number and try again." });
        }
    }

    // POST api/auth/phone/verify-otp
    [HttpPost("phone/verify-otp")]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> VerifyPhoneOtp([FromBody] VerifyOtpRequest request)
    {
        try
        {
            var proofToken = await _authService.VerifyPhoneOtpAsync(request.PhoneNumber, request.Code);
            return Ok(new { Token = proofToken });
        }
        catch (TwilioException)
        {
            return BadRequest(new { Message = "Could not verify the code. Check the phone number and try again." });
        }
    }

    // -- Private Helpers --

    private static ClientAuthResponse ToClientResponse(AuthResponse r) => new()
    {
        AccessToken = r.AccessToken,
        ExpiresIn   = r.ExpiresIn,
        Roles       = r.Roles,
    };

    private void SetRefreshTokenCookie(string refreshToken, DateTime expiresAt)
    {
        // SameSite=None is intentional.
        // The frontend (e.g. http://localhost:5173) and API (e.g. http://localhost:5000)
        // run on different origins, so the /api/auth/refresh call is a cross-site
        // credentialed XHR. SameSite=Lax allows top-level GET navigations but blocks
        // the cookie on cross-site fetch/XHR, which is what would break silent refresh.
        // SameSite=None + Secure is the only combination that lets the browser send
        // the cookie on a cross-origin fetch.
        // CSRF risk is acceptable here because:
        //   - The cookie is HttpOnly (unreachable by JS)
        //   - This endpoint only issues a new access token; it performs no state mutation
        //   - Access tokens expire in 15 minutes, limiting blast radius
        Response.Cookies.Append(RefreshTokenCookieName, refreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure   = true,
            SameSite = SameSiteMode.None,
            Expires  = expiresAt,
            Path     = "/api/auth"
        });
    }
}
