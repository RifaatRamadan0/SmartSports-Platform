using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSports.BLL.DTOs.Booking;
using SmartSports.BLL.Interfaces;

namespace SmartSports.API.Controllers;

[ApiController]
[Route("api/bookings")]
[Authorize]
public class BookingController : ControllerBase
{
    private readonly IBookingService _bookingService;

    public BookingController(IBookingService bookingService)
    {
        _bookingService = bookingService;
    }

    // SPDBTCP-166 — Rifaat
    [HttpPost]
    public Task<IActionResult> CreateBooking([FromBody] CreateBookingRequest request)
        => throw new NotImplementedException();

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
