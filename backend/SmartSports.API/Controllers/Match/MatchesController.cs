using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SmartSports.BLL.DTOs.Booking;
using SmartSports.BLL.DTOs.Common;
using SmartSports.BLL.DTOs.Match;
using System.Collections.Generic;
using SmartSports.BLL.Interfaces.Match;

using SmartSports.API.Controllers.Common;

namespace SmartSports.API.Controllers.Match;

[ApiController]
[Route("api/matches")]
[Authorize]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public class MatchesController : BaseApiController
{
    private readonly IMatchService _matchService;

    public MatchesController(IMatchService matchService)
    {
        _matchService = matchService;
    }

    // SPDBTCP-83 — Existence check for direct deep-links into /matches/:id.
    // [AllowAnonymous] because the page itself is reachable by unauthenticated
    // visitors via shareable links (SPDBTCP-80) and we still need to render
    // 404 vs. the page shell consistently for both roles.
    [HttpGet("{id:int}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(MatchResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _matchService.GetByIdAsync(id);
        if (result is null) return NotFound();
        return Ok(result);
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

    // "My Games" section on Find Games — returns matches the caller is organising
    // OR has joined/requested. Player-only because owners/admins don't join matches.
    [HttpGet("my")]
    [Authorize(Policy = "PlayerOnly")]
    [ProducesResponseType(typeof(IEnumerable<MyMatchSummaryResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListMy()
    {
        var result = await _matchService.ListMyAsync(GetUserId()!.Value);
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
            GetUserId()!.Value, id, request.IsOpenToJoin!.Value);

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
        var result = await _matchService.JoinAsync(GetUserId()!.Value, id);
        return CreatedAtAction(nameof(GetMyStatus), new { id }, result);
    }

    [HttpGet("{id:int}/my-status")]
    [Authorize(Policy = "PlayerOnly")]
    [ProducesResponseType(typeof(MatchParticipantResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMyStatus(int id)
    {
        var result = await _matchService.GetMyStatusAsync(GetUserId()!.Value, id);
        if (result is null) return NotFound();
        return Ok(result);
    }

    [HttpDelete("{id:int}/leave")]
    [Authorize(Policy = "PlayerOnly")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Leave(int id)
    {
        await _matchService.LeaveAsync(GetUserId()!.Value, id);
        return NoContent();
    }

    // SPDBTCP-83 — Rifaat: organiser inbox — pending join requests
    [HttpGet("join-requests/pending")]
    [Authorize(Policy = "PlayerOnly")]
    [ProducesResponseType(typeof(IEnumerable<PendingJoinRequestDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPendingJoinRequests()
    {
        var result = await _matchService.GetPendingJoinRequestsAsync(GetUserId()!.Value);
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
            GetUserId()!.Value, id, userId, request.Action);
        return Ok(result);
    }
}
