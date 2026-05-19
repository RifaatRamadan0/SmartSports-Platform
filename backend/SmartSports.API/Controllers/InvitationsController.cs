using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSports.API.Services;
using SmartSports.BLL.DTOs.Invitation;
using SmartSports.BLL.Interfaces;

namespace SmartSports.API.Controllers;

[ApiController]
[Authorize]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public class InvitationsController : ControllerBase
{
    private readonly IInvitationService  _invitationService;
    private readonly ICurrentUserService _currentUser;
    private readonly IConfiguration      _configuration;

    public InvitationsController(
        IInvitationService  invitationService,
        ICurrentUserService currentUser,
        IConfiguration      configuration)
    {
        _invitationService = invitationService;
        _currentUser       = currentUser;
        _configuration     = configuration;
    }

    [HttpPost("api/matches/{id:int}/invite-link")]
    [Authorize(Policy = "PlayerOnly")]
    [ProducesResponseType(typeof(InviteLinkResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GenerateInviteLink(int id)
    {
        var frontendBaseUrl = _configuration["Frontend:BaseUrl"] ?? "http://localhost:5173";
        var result = await _invitationService.GenerateInviteLinkAsync(
            id, _currentUser.GetUserId()!.Value, frontendBaseUrl);
        return Ok(result);
    }

    [HttpGet("api/join/{token}")]
    [ProducesResponseType(typeof(JoinPreviewResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetJoinPreview(string token)
    {
        var result = await _invitationService.GetJoinPreviewAsync(token);
        return Ok(result);
    }

    [HttpPost("api/join/{token}")]
    [Authorize(Policy = "PlayerOnly")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> JoinViaToken(string token)
    {
        await _invitationService.JoinViaTokenAsync(token, _currentUser.GetUserId()!.Value);
        return Ok(new { status = "pending" });
    }
}
