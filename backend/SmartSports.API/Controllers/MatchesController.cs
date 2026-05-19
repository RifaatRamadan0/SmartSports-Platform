using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SmartSports.API.Services;
using SmartSports.BLL.DTOs.Booking;
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

    [HttpGet("open")]
    [AllowAnonymous]
    [EnableRateLimiting("lookups")]
    [ResponseCache(Duration = 60, VaryByQueryKeys = new[] { "sport", "city", "page", "pageSize" })]
    [ProducesResponseType(typeof(PagedResult<MatchSummaryResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListOpen([FromQuery] MatchQuery query)
    {
        var result = await _matchService.ListOpenAsync(query);
        return Ok(result);
    }

    [HttpGet("stats")]
    [AllowAnonymous]
    [EnableRateLimiting("lookups")]
    [ResponseCache(Duration = 60)]
    [ProducesResponseType(typeof(MatchStatsResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStats()
    {
        var result = await _matchService.GetStatsAsync();
        return Ok(result);
    }

    // SPDBTCP-246
    [HttpPatch("{id:int}/visibility")]
    [Authorize(Policy = "PlayerOnly")]
    [ProducesResponseType(typeof(MatchResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateVisibility(int id, [FromBody] UpdateVisibilityRequest request)
    {
        // [Required] on a nullable bool catches missing values; .Value is safe here.
        // [Authorize] guarantees GetUserId() is non-null for authenticated players.
        var response = await _matchService.UpdateVisibilityAsync(
            _currentUser.GetUserId()!.Value, id, request.IsOpenToJoin!.Value);

        return Ok(response);
    }
}
