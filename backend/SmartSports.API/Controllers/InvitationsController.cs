using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSports.API.Services;
using SmartSports.BLL.DTOs.Invitations;
using SmartSports.BLL.Interfaces;

namespace SmartSports.API.Controllers;

[ApiController]
[Authorize]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public class InvitationsController : ControllerBase
{
    private readonly IInvitationService  _invitationService;
    private readonly ICurrentUserService _currentUser;
    private readonly string              _frontendBaseUrl;

    public InvitationsController(
        IInvitationService  invitationService,
        ICurrentUserService currentUser,
        IConfiguration      configuration)
    {
        _invitationService = invitationService;
        _currentUser       = currentUser;
        _frontendBaseUrl   = configuration["Frontend:BaseUrl"]
            ?? throw new InvalidOperationException("Frontend:BaseUrl is not configured.");
    }

    // SPDBTCP-80 — POST /api/matches/{id}/invite-link
    [HttpPost("api/matches/{id:int}/invite-link")]
    [Authorize(Policy = "PlayerOnly")]
    [ProducesResponseType(typeof(InviteLinkResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GenerateInviteLink(int id)
    {
        var result = await _invitationService.GenerateInviteLinkAsync(
            id, _currentUser.GetUserId()!.Value, _frontendBaseUrl);
        return Ok(result);
    }

    // GET /api/join/{token}
    // AllowAnonymous — guests can preview the match before deciding to sign in and join.
    [HttpGet("api/join/{token}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(JoinPreviewResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetJoinPreview(string token)
    {
        var result = await _invitationService.GetJoinPreviewAsync(token);
        return Ok(result);
    }

    // POST /api/join/{token}
    [HttpPost("api/join/{token}")]
    [Authorize(Policy = "PlayerOnly")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> JoinViaToken(string token)
    {
        await _invitationService.JoinViaTokenAsync(token, _currentUser.GetUserId()!.Value);
        return NoContent();
    }
}
