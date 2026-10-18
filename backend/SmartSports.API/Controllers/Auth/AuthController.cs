using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SmartSports.API.Helpers;
using SmartSports.BLL.DTOs.Auth;
using SmartSports.BLL.DTOs.Availability;
using SmartSports.BLL.Interfaces.Auth;
using Twilio.Exceptions;

namespace SmartSports.API.Controllers.Auth;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IConfiguration _configuration;

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

        RefreshTokenCookie.Append(Response, result.RefreshToken, result.RefreshTokenExpiresAt);

        return Ok(ClientAuthResponse.From(result));
    }

    // POST api/auth/refresh
    [HttpPost("refresh")]
    [ProducesResponseType(typeof(ClientAuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh()
    {
        var refreshToken = Request.Cookies[RefreshTokenCookie.Name];

        if (string.IsNullOrEmpty(refreshToken))
            return Unauthorized(new { Message = "Refresh token is missing." });

        var result = await _authService.RefreshTokenAsync(refreshToken);

        if (result is null)
            return Unauthorized(new { Message = "Invalid or expired refresh token." });

        RefreshTokenCookie.Append(Response, result.RefreshToken, result.RefreshTokenExpiresAt);

        return Ok(ClientAuthResponse.From(result));
    }

    // POST api/auth/logout
    [HttpPost("logout")]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Logout()
    {
        var refreshToken = Request.Cookies[RefreshTokenCookie.Name];

        if (!string.IsNullOrEmpty(refreshToken))
            await _authService.LogoutAsync(refreshToken);

        RefreshTokenCookie.Delete(Response);

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

}
