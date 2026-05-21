using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSports.BLL.DTOs.Schedule;
using SmartSports.BLL.Interfaces;

namespace SmartSports.API.Controllers;

[ApiController]
[Route("api/pitches/{pitchId:int}/schedule")]
public class PitchScheduleController : BaseApiController
{
    private readonly IPitchScheduleService _scheduleService;

    public PitchScheduleController(IPitchScheduleService scheduleService)
    {
        _scheduleService = scheduleService;
    }

    /// <summary>
    /// GET /api/pitches/{pitchId}/schedule
    /// Returns the full 7-day weekly schedule for a pitch.
    /// Public endpoint — no login required (players and visitors can view it).
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(IEnumerable<PitchScheduleResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSchedule(int pitchId)
    {
        var schedule = await _scheduleService.GetScheduleAsync(pitchId);
        return Ok(schedule);
    }

    /// <summary>
    /// PUT /api/pitches/{pitchId}/schedule
    /// Creates or replaces the weekly schedule for a pitch.
    /// Restricted to PitchOwner role. The owner must own this specific pitch.
    /// </summary>
    [HttpPut]
    [Authorize(Policy = "PitchOwnerOnly")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpsertSchedule(
        int pitchId,
        [FromBody] UpsertScheduleRequest request)
    {
        var ownerId = GetUserId();
        if (ownerId is null) return Unauthorized();

        await _scheduleService.UpsertScheduleAsync(ownerId.Value, pitchId, request);
        return NoContent();
    }
}
