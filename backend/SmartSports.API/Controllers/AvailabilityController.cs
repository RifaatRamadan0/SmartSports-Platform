using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using SmartSports.BLL.Interfaces;

namespace SmartSports.API.Controllers
{
    [ApiController]
    [Route("api/pitches")]
    public class AvailabilityController : ControllerBase
    {
        private readonly IAvailabilityService _availabilityService;

        public AvailabilityController(IAvailabilityService availabilityService)
        {
            _availabilityService = availabilityService;
        }

        /// <summary>
        /// GET /api/pitches/{id}/availability?date=YYYY-MM-DD
        /// Returns all 30-minute slots for a pitch on a given date.
        /// Empty list means pitch is closed that day.
        /// </summary>
        [HttpGet("{id:int}/availability")]
        [AllowAnonymous]
        public async Task<IActionResult> GetAvailableSlots(int id, [FromQuery] DateOnly date)
        {
            var slots = await _availabilityService.GetAvailableSlotsAsync(id, date);
            return Ok(slots);
        }
    }
}
