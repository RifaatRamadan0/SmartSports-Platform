using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SmartSports.BLL.DTOs.Invitation;
using SmartSports.BLL.Interfaces.Invitation;

using SmartSports.API.Controllers.Common;

namespace SmartSports.API.Controllers.Invitation;

[ApiController]
[Route("api")]
[Authorize]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public class InvitationController : BaseApiController
{
    private readonly IInvitationService _invitationService;

    public InvitationController(IInvitationService invitationService)
    {
        _invitationService = invitationService;
    }

    // SPDBTCP-76 — Rifaat
    [HttpPost("matches/{matchId:int}/invitations")]
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
            GetUserId()!.Value,
            GetUsername() ?? string.Empty,
            matchId,
            request.Username);

        return StatusCode(StatusCodes.Status201Created, response);
    }

    // SPDBTCP-83 — Rifaat
    [HttpGet("invitations/me")]
    [Authorize(Policy = "PlayerOnly")]
    [ProducesResponseType(typeof(IEnumerable<PendingInvitationDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyPendingInvitations()
    {
        var result = await _invitationService.GetPendingAsync(GetUserId()!.Value);
        return Ok(result);
    }

    // SPDBTCP-83 — Rifaat
    [HttpPut("invitations/{id:int}/accept")]
    [Authorize(Policy = "PlayerOnly")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> AcceptInvitation(int id)
    {
        await _invitationService.AcceptAsync(id, GetUserId()!.Value);
        return NoContent();
    }

    // SPDBTCP-83 — Rifaat
    [HttpPut("invitations/{id:int}/decline")]
    [Authorize(Policy = "PlayerOnly")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeclineInvitation(int id)
    {
        await _invitationService.DeclineAsync(id, GetUserId()!.Value);
        return NoContent();
    }
}
