using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SmartSports.BLL.DTOs.Lookup;
using SmartSports.BLL.Interfaces;

namespace SmartSports.API.Controllers;

[ApiController]
[Route("api/sport-types")]
public class SportTypesController : ControllerBase
{
    private readonly ISportTypeService _service;

    public SportTypesController(ISportTypeService service)
    {
        _service = service;
    }

    /// <summary>
    /// GET /api/sport-types
    /// Returns all sport types ordered by name. Public. Used to populate filter dropdowns.
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    [EnableRateLimiting("lookups")]
    [ResponseCache(Duration = 3600)]
    [ProducesResponseType(typeof(IEnumerable<SportTypeResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List()
    {
        var result = await _service.ListAsync();
        return Ok(result);
    }
}
