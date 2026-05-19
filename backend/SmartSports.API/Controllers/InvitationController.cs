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

    // SPDBTCP-76 — Rifaat
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
        var userId = _currentUser.GetUserId();
        if (userId is null)
            return Unauthorized();

        // Username comes from the JWT claim — saves the service a DB round-trip
        // just to compose the notification message string.
        var response = await _invitationService.InviteByUsernameAsync(
            userId.Value,
            _currentUser.GetUsername() ?? string.Empty,
            matchId,
            request.Username);

        return StatusCode(StatusCodes.Status201Created, response);
    }
}
