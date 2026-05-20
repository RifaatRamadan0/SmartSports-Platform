using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SmartSports.API.Services;
using SmartSports.BLL.DTOs.Booking;
using SmartSports.BLL.DTOs.Match;
using System.Collections.Generic;
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

    [HttpPost("{id:int}/join")]
    [Authorize(Policy = "PlayerOnly")]
    [ProducesResponseType(typeof(MatchParticipantResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Join(int id)
    {
        var result = await _matchService.JoinAsync(_currentUser.GetUserId()!.Value, id);
        return CreatedAtAction(nameof(GetMyStatus), new { id }, result);
    }

    [HttpGet("{id:int}/my-status")]
    [Authorize(Policy = "PlayerOnly")]
    [ProducesResponseType(typeof(MatchParticipantResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMyStatus(int id)
    {
        var result = await _matchService.GetMyStatusAsync(_currentUser.GetUserId()!.Value, id);
        if (result is null) return NotFound();
        return Ok(result);
    }

    [HttpDelete("{id:int}/leave")]
    [Authorize(Policy = "PlayerOnly")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Leave(int id)
    {
        await _matchService.LeaveAsync(_currentUser.GetUserId()!.Value, id);
        return NoContent();
    }

    // SPDBTCP-83 — Rifaat: organiser inbox — pending join requests
    [HttpGet("join-requests/pending")]
    [Authorize(Policy = "PlayerOnly")]
    [ProducesResponseType(typeof(IEnumerable<PendingJoinRequestDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPendingJoinRequests()
    {
        var result = await _matchService.GetPendingJoinRequestsAsync(_currentUser.GetUserId()!.Value);
        return Ok(result);
    }

    [HttpPatch("{id:int}/participants/{userId:int}/respond")]
    [Authorize(Policy = "PlayerOnly")]
    [ProducesResponseType(typeof(MatchParticipantResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RespondToParticipant(
        int id, int userId, [FromBody] RespondToParticipantRequest request)
    {
        var result = await _matchService.RespondToParticipantAsync(
            _currentUser.GetUserId()!.Value, id, userId, request.Action);
        return Ok(result);
    }
}
