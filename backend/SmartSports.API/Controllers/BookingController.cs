using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSports.BLL.DTOs.Booking;
using SmartSports.BLL.Interfaces;

namespace SmartSports.API.Controllers;

[ApiController]
[Route("api/bookings")]
[Authorize]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public class BookingController : ControllerBase
{
    private readonly IBookingService _bookingService;

    public BookingController(IBookingService bookingService)
    {
        _bookingService = bookingService;
    }

    // SPDBTCP-166 — Rifaat
    [HttpPost]
    [Authorize(Policy = "PlayerOnly")]
    [ProducesResponseType(typeof(BookingResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateBooking([FromBody] CreateBookingRequest request)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
            return Unauthorized();

        var response = await _bookingService.CreateBookingAsync(userId, request);
        return CreatedAtAction(nameof(GetBookingById), new { id = response.Id }, response);
    }

    // SPDBTCP-168 — Rifaat
    [HttpPatch("{id}/cancel")]
    public Task<IActionResult> CancelBooking(int id)
        => throw new NotImplementedException();

    // SPDBTCP-223 — Rifaat
    [HttpGet("{id}")]
    public Task<IActionResult> GetBookingById(int id)
        => throw new NotImplementedException();

    // SPDBTCP-170 — Saad
    [HttpGet("my")]
    public Task<IActionResult> GetMyBookings([FromQuery] BookingQuery query)
        => throw new NotImplementedException();

    // SPDBTCP-170 — Saad
    [HttpGet("owner")]
    public Task<IActionResult> GetOwnerBookings([FromQuery] BookingQuery query)
        => throw new NotImplementedException();
}
