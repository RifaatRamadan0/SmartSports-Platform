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
    /// GET /api/pitches/{id}
    /// Returns the pitch's public info (name, price/hr, max duration).
    /// </summary>
    [HttpGet("{id:int}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(PitchResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        try
        {
            var pitch = await _pitchService.GetByIdAsync(id);
            return Ok(pitch);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }
}
