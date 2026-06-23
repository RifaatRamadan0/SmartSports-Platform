using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SmartSports.BLL.DTOs.Lookup;
using SmartSports.BLL.Interfaces.Lookup;

namespace SmartSports.API.Controllers.Lookup;

[ApiController]
[Route("api/cities")]
public class CitiesController : ControllerBase
{
    private readonly ICityService _service;

    public CitiesController(ICityService service)
    {
        _service = service;
    }

    /// <summary>
    /// GET /api/cities
    /// Returns all cities ordered by name. Public. Used to populate filter dropdowns.
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    [EnableRateLimiting("lookups")]
    [ResponseCache(Duration = 3600)]
    [ProducesResponseType(typeof(IEnumerable<CityResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List()
    {
        var result = await _service.ListAsync();
        return Ok(result);
    }
}
