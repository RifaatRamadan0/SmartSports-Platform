using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SmartSports.BLL.DTOs.Invitations;
using SmartSports.BLL.Interfaces;

namespace SmartSports.API.Controllers;

// Fix #12: [Route("api")] at class level — consistent with all other controllers.
[ApiController]
[Route("api")]
[Authorize]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public class InvitationsController : BaseApiController
{
    private readonly IInvitationService _invitationService;
    private readonly string             _frontendBaseUrl;

    public InvitationsController(
        IInvitationService invitationService,
        IConfiguration     configuration)
    {
        _invitationService = invitationService;
        _frontendBaseUrl   = configuration["Frontend:BaseUrl"]
            ?? throw new InvalidOperationException("Frontend:BaseUrl is not configured.");
    }

    // SPDBTCP-80 — POST /api/matches/{id}/invite-link
    [HttpPost("matches/{id:int}/invite-link")]
    [Authorize(Policy = "PlayerOnly")]
    [EnableRateLimiting("invitations")]  // Fix #2
    [ProducesResponseType(typeof(InviteLinkResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> GenerateInviteLink(int id)
    {
        var result = await _invitationService.GenerateInviteLinkAsync(
            id, GetUserId()!.Value, _frontendBaseUrl);
        return Ok(result);
    }

    // GET /api/join/{token}
    // AllowAnonymous — guests can preview the match before deciding to sign in and join.
    [HttpGet("join/{token}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(JoinPreviewResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetJoinPreview(string token)
    {
        var result = await _invitationService.GetJoinPreviewAsync(token);
        return Ok(result);
    }

    // POST /api/join/{token}
    [HttpPost("join/{token}")]
    [Authorize(Policy = "PlayerOnly")]
    [EnableRateLimiting("invitations")]  // Fix #2
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> JoinViaToken(string token)
    {
        await _invitationService.JoinViaTokenAsync(token, GetUserId()!.Value);
        return NoContent();
    }
}
