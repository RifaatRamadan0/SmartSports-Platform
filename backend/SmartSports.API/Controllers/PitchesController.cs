using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSports.BLL.DTOs.Booking;
using SmartSports.BLL.DTOs.Pitch;
using SmartSports.BLL.Interfaces;

namespace SmartSports.API.Controllers;

[ApiController]
[Route("api/pitches")]
public class PitchesController : ControllerBase
{
    private readonly IPitchService _pitchService;

    public PitchesController(IPitchService pitchService)
    {
        _pitchService = pitchService;
    }

    /// <summary>
    /// GET /api/pitches?sport=&page=&pageSize=
    /// Lists active and approved pitches with sport name. Public.
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(PagedResult<PitchListResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromQuery] string? sport,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12)
    {
        var result = await _pitchService.ListAsync(sport, page, pageSize);
        return Ok(result);
    }

    /// <summary>
    /// GET /api/pitches/mine
    /// Lists every pitch owned by the caller (incl. inactive/unapproved, excl. soft-deleted).
    /// </summary>
    [HttpGet("mine")]
    [Authorize(Policy = "PitchOwnerOnly")]
    [ProducesResponseType(typeof(IEnumerable<PitchListResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ListMine()
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var ownerId))
            return Unauthorized();

        var result = await _pitchService.ListMineAsync(ownerId);
        return Ok(result);
    }

    /// <summary>
    /// GET /api/pitches/mine/{id}
    /// Returns full detail for one of the caller's own pitches (incl. inactive/unapproved).
    /// Used to pre-fill the owner edit form.
    /// </summary>
    [HttpGet("mine/{id:int}")]
    [Authorize(Policy = "PitchOwnerOnly")]
    [ProducesResponseType(typeof(PitchResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMineById(int id)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var ownerId))
            return Unauthorized();

        var pitch = await _pitchService.GetOwnedByIdAsync(ownerId, id);
        return Ok(pitch);
    }

    /// <summary>
    /// GET /api/pitches/{id}
    /// Returns full pitch details (name, address, price/hr, max duration,
    /// lat/lon, sport, city, owner id, approval/active state, created date).
    /// Only active and approved pitches are returned; soft-deleted or unapproved → 404.
    /// </summary>
    [HttpGet("{id:int}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(PitchResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var pitch = await _pitchService.GetByIdAsync(id);
        return Ok(pitch);
    }

    /// <summary>
    /// POST /api/pitches
    /// Creates a new pitch owned by the caller. Server sets owner, active=true,
    /// approved=false, created_at=NOW().
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "PitchOwnerOnly")]
    [ProducesResponseType(typeof(PitchResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Create([FromBody] CreatePitchRequest request)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var ownerId))
            return Unauthorized();

        var created = await _pitchService.CreateAsync(ownerId, request);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    /// <summary>
    /// PUT /api/pitches/{id}
    /// Updates an existing pitch. Caller must own it. Approval state is preserved.
    /// </summary>
    [HttpPut("{id:int}")]
    [Authorize(Policy = "PitchOwnerOnly")]
    [ProducesResponseType(typeof(PitchResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdatePitchRequest request)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var ownerId))
            return Unauthorized();

        var updated = await _pitchService.UpdateAsync(ownerId, id, request);
        return Ok(updated);
    }

    /// <summary>
    /// DELETE /api/pitches/{id}
    /// Soft-deletes a pitch the caller owns.
    /// </summary>
    [HttpDelete("{id:int}")]
    [Authorize(Policy = "PitchOwnerOnly")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var ownerId))
            return Unauthorized();

        await _pitchService.SoftDeleteAsync(ownerId, id);
        return NoContent();
    }
}
