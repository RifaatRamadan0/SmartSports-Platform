using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
