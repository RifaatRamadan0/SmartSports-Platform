using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSports.BLL.DTOs.Lookup;
using SmartSports.BLL.Interfaces;

namespace SmartSports.API.Controllers;

[ApiController]
[Route("api/lookups")]
public class LookupsController : ControllerBase
{
    private readonly ILookupService _lookupService;

    public LookupsController(ILookupService lookupService)
    {
        _lookupService = lookupService;
    }

    /// <summary>
    /// GET /api/lookups/cities
    /// Returns cities with their region info. Public — drives city dropdowns
    /// across registration, pitch creation, search filters, etc.
    /// </summary>
    [HttpGet("cities")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(IEnumerable<CityResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListCities()
        => Ok(await _lookupService.ListCitiesAsync());

    /// <summary>
    /// GET /api/lookups/sport-types
    /// Returns the supported sport types. Public.
    /// </summary>
    [HttpGet("sport-types")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(IEnumerable<SportTypeResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListSportTypes()
        => Ok(await _lookupService.ListSportTypesAsync());
}
