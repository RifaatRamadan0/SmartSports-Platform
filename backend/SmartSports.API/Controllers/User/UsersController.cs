using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SmartSports.API.Helpers;
using SmartSports.BLL.DTOs.Auth;
using SmartSports.BLL.DTOs.Booking;
using SmartSports.BLL.DTOs.Common;
using SmartSports.BLL.DTOs.Pitch;
using SmartSports.BLL.DTOs.User;
using SmartSports.BLL.Interfaces.Auth;
using SmartSports.BLL.Interfaces.Pitch;
using SmartSports.BLL.Interfaces.User;

using SmartSports.API.Controllers.Common;

namespace SmartSports.API.Controllers.User;

[ApiController]
[Route("api/users")]
[Authorize]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public class UsersController(IUserService userService, IAuthService authService, IFavoriteService favoriteService) : BaseApiController
{
    /// <summary>
    /// GET /api/users/me/favorites?page=&pageSize=
    /// Returns the authenticated player's saved pitches (active, approved, non-deleted),
    /// newest favorite first, with standard pitch summary fields.
    /// </summary>
    [HttpGet("me/favorites")]
    [Authorize(Policy = "PlayerOnly")]
    [ProducesResponseType(typeof(PagedResult<PitchListResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetMyFavorites([FromQuery] int page = 1, [FromQuery] int pageSize = 12)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var result = await favoriteService.ListFavoritesAsync(userId.Value, page, pageSize);
        return Ok(result);
    }

    [HttpGet("me")]
    [ProducesResponseType(typeof(UserProfileResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMe()
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var profile = await userService.GetProfileAsync(userId.Value);
        return Ok(profile);
    }

    [HttpPut("me")]
    [EnableRateLimiting("lookups")]
    [ProducesResponseType(typeof(UserProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateProfileRequest request)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var profile = await userService.UpdateProfileAsync(userId.Value, request);
        return Ok(profile);
    }

    [HttpPatch("me/password")]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(typeof(ClientAuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        // The change revokes every refresh token (killing all other devices). Immediately
        // mint a fresh session for the caller so this device stays signed in — the new
        // refresh cookie overwrites the just-revoked one and the new access token is
        // returned for the client to adopt.
        await userService.ChangePasswordAsync(userId.Value, request);

        var session = await authService.IssueSessionForUserAsync(userId.Value);
        if (session is null) return Unauthorized();

        RefreshTokenCookie.Append(Response, session.RefreshToken, session.RefreshTokenExpiresAt);
        return Ok(ClientAuthResponse.From(session));
    }

    [HttpPost("me/phone/send-verification")]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SendPhoneVerification()
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        await userService.SendPhoneVerificationAsync(userId.Value);
        return NoContent();
    }

    [HttpDelete("me")]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteMe([FromBody] DeleteAccountRequest request)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        await userService.DeleteOwnAccountAsync(userId.Value, request);
        return NoContent();
    }

    [HttpPost("me/phone/verify")]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> VerifyPhone([FromBody] VerifyPhoneRequest request)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        await userService.ConfirmPhoneVerificationAsync(userId.Value, request.Code);
        return NoContent();
    }
}
