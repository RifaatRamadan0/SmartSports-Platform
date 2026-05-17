using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSports.API.Services;
using SmartSports.BLL.DTOs.Match;
using SmartSports.BLL.Interfaces;

namespace SmartSports.API.Controllers;

[ApiController]
[Route("api/matches")]
[Authorize]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public class MatchesController : ControllerBase
{
    private readonly IMatchService       _matchService;
    private readonly ICurrentUserService _currentUser;

    public MatchesController(
        IMatchService       matchService,
        ICurrentUserService currentUser)
    {
        _matchService = matchService;
        _currentUser  = currentUser;
    }

    // SPDBTCP-246 — Rifaat
    [HttpPatch("{id:int}/visibility")]
    [Authorize(Policy = "PlayerOnly")]
    [ProducesResponseType(typeof(MatchResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateVisibility(int id, [FromBody] UpdateVisibilityRequest request)
    {
        var userId = _currentUser.GetUserId();
        if (userId is null)
            return Unauthorized();

        // [Required] on a nullable bool catches missing values; .Value is safe here.
        var response = await _matchService.UpdateVisibilityAsync(
            userId.Value, id, request.IsOpenToJoin!.Value);

        return Ok(response);
    }
}
