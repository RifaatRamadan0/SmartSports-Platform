using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSports.BLL.DTOs.Admin;
using SmartSports.BLL.DTOs.Booking;
using SmartSports.BLL.Interfaces;

namespace SmartSports.API.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminController : ControllerBase
{
    private readonly IAdminPitchService _adminPitchService;

    public AdminController(IAdminPitchService adminPitchService)
    {
        _adminPitchService = adminPitchService;
    }

    /// <summary>
    /// GET /api/admin/pitches?page=&pageSize=
    /// Returns a paginated list of pitches with status = PendingApproval.
    /// </summary>
    [HttpGet("pitches")]
    [ProducesResponseType(typeof(PagedResult<AdminPitchSummaryResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetPendingPitches([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _adminPitchService.GetPendingPitchesAsync(page, pageSize);
        return Ok(result);
    }

    /// <summary>
    /// PATCH /api/admin/pitches/{id}/approve
    /// Approves a pitch, making it visible in public search results.
    /// 404 if the pitch does not exist or is soft-deleted.
    /// </summary>
    [HttpPatch("pitches/{id:int}/approve")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ApprovePitch(int id)
    {
        await _adminPitchService.ApproveAsync(id);
        return NoContent();
    }

    /// <summary>
    /// PATCH /api/admin/pitches/{id}/reject
    /// Rejects a pitch. Body: { "reason": "optional explanation for the owner" }
    /// 404 if the pitch does not exist or is soft-deleted.
    /// </summary>
    [HttpPatch("pitches/{id:int}/reject")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RejectPitch(int id, [FromBody] RejectPitchRequest request)
    {
        await _adminPitchService.RejectAsync(id, request.Reason);
        return NoContent();
    }
}
