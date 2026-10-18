using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSports.API.Controllers.Common;
using SmartSports.BLL.DTOs.Review;
using SmartSports.BLL.Interfaces.Review;

namespace SmartSports.API.Controllers.Review;

[ApiController]
[Route("api")]
[Authorize]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public class ReviewController : BaseApiController
{
    private readonly IReviewService _reviewService;

    public ReviewController(IReviewService reviewService)
    {
        _reviewService = reviewService;
    }

    [HttpPost("bookings/{bookingId:int}/reviews")]
    [Authorize(Policy = "PlayerOnly")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateReview(int bookingId, [FromBody] CreateReviewRequest request)
    {
        await _reviewService.CreateReviewAsync(GetUserId()!.Value, bookingId, request);
        return StatusCode(StatusCodes.Status201Created);
    }
}
