using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SmartSports.API.Services;
using SmartSports.BLL.DTOs.Invitations;
using SmartSports.BLL.Interfaces;

namespace SmartSports.API.Controllers;

[ApiController]
[Route("api/matches/{matchId:int}/invitations")]
[Authorize]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public class InvitationController : ControllerBase
{
    private readonly IInvitationService  _invitationService;
    private readonly ICurrentUserService _currentUser;

    public InvitationController(
        IInvitationService  invitationService,
        ICurrentUserService currentUser)
    {
        _invitationService = invitationService;
        _currentUser       = currentUser;
    }

    // SPDBTCP-76 — POST /api/matches/{matchId}/invitations
    [HttpPost]
    [Authorize(Policy = "PlayerOnly")]
    [EnableRateLimiting("invitations")]
    [ProducesResponseType(typeof(InvitationResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> InviteByUsername(
        int matchId, [FromBody] InviteByUsernameRequest request)
    {
        var response = await _invitationService.InviteByUsernameAsync(
            _currentUser.GetUserId()!.Value,
            _currentUser.GetUsername() ?? string.Empty,
            matchId,
            request.Username);

        return StatusCode(StatusCodes.Status201Created, response);
    }
}
