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
        var userId = GetUserId();
        if (userId is null)
            return Unauthorized();

        var response = await _bookingService.CreateBookingAsync(userId.Value, request);
        return CreatedAtAction(nameof(GetBookingById), new { id = response.Id }, response);
    }

    // SPDBTCP-168 — Rifaat
    [HttpPatch("{id:int}/cancel")]
    [Authorize(Policy = "PlayerOnly")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CancelBooking(int id, [FromBody] CancelBookingRequest? request)
    {
        var userId = GetUserId();
        if (userId is null)
            return Unauthorized();

        await _bookingService.CancelBookingAsync(userId.Value, id, request?.CancellationReason);
        return NoContent();
    }

    // SPDBTCP-223 — Rifaat
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(BookingResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetBookingById(int id)
    {
        var userId = GetUserId();
        if (userId is null)
            return Unauthorized();

        var isAdmin = User.IsInRole("Admin");
        var booking = await _bookingService.GetBookingByIdAsync(userId.Value, id, isAdmin);

        if (booking is null)
            return NotFound(new { message = $"Booking with ID {id} was not found." });

        return Ok(booking);
    }


    // SPDBTCP-170 — Saad
    [HttpGet("my")]
    [Authorize(Policy = "PlayerOnly")]
    [ProducesResponseType(typeof(PagedResult<BookingResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetMyBookings([FromQuery] BookingQuery query)
    {
        var userId = GetUserId();
        if (userId is null)
            return Unauthorized();

        var result = await _bookingService.GetMyBookingsAsync(userId.Value, query);
        return Ok(result);
    }

    // SPDBTCP-170 — Saad
    [HttpGet("owner")]
    [Authorize(Policy = "PitchOwnerOnly")]
    [ProducesResponseType(typeof(PagedResult<BookingResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetOwnerBookings([FromQuery] BookingQuery query)
    {
        var userId = GetUserId();
        if (userId is null)
            return Unauthorized();

        var result = await _bookingService.GetOwnerBookingsAsync(userId.Value, query);
        return Ok(result);
    }

    // private helpers
    /// <summary>
    /// Extracts the authenticated user's ID from JWT claims.
    /// Returns null if the claim is missing (misconfigured token).
    /// </summary>
    private int? GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(claim, out var id) ? id : null;
    }
}
