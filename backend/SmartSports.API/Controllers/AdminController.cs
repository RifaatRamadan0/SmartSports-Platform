using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSports.BLL.DTOs.Admin;
using SmartSports.BLL.DTOs.Booking;
using SmartSports.BLL.DTOs.RoleRequest;
using SmartSports.BLL.Interfaces;

namespace SmartSports.API.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminController : BaseApiController
{
    private readonly IAdminPitchService       _adminPitchService;
    private readonly IAdminRoleRequestService _adminRoleRequestService;
    private readonly IAdminUserService        _adminUserService;

    public AdminController(
        IAdminPitchService       adminPitchService,
        IAdminRoleRequestService adminRoleRequestService,
        IAdminUserService        adminUserService)
    {
        _adminPitchService       = adminPitchService;
        _adminRoleRequestService = adminRoleRequestService;
        _adminUserService        = adminUserService;
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

    // ── Role Requests ────────────────────────────────────────────────────────

    /// <summary>
    /// GET /api/admin/role-requests?page=&pageSize=
    /// Returns paginated pending role requests for admin review.
    /// </summary>
    [HttpGet("role-requests")]
    [ProducesResponseType(typeof(PagedResult<AdminRoleRequestSummary>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPendingRoleRequests([FromQuery] int page = 1, [FromQuery] int pageSize = 15)
    {
        var result = await _adminRoleRequestService.GetPendingRequestsAsync(page, pageSize);
        return Ok(result);
    }

    /// <summary>
    /// PATCH /api/admin/role-requests/{id}/approve
    /// Approves a role request and grants the role to the user immediately.
    /// </summary>
    [HttpPatch("role-requests/{id:int}/approve")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ApproveRoleRequest(int id)
    {
        var adminId = GetUserId();
        if (adminId is null) return Unauthorized();

        await _adminRoleRequestService.ApproveRequestAsync(id, adminId.Value);
        return NoContent();
    }

    /// <summary>
    /// PATCH /api/admin/role-requests/{id}/reject
    /// Rejects a role request with an optional reason.
    /// </summary>
    [HttpPatch("role-requests/{id:int}/reject")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RejectRoleRequest(int id, [FromBody] RejectRoleRequestRequest request)
    {
        var adminId = GetUserId();
        if (adminId is null) return Unauthorized();

        await _adminRoleRequestService.RejectRequestAsync(id, adminId.Value, request.Reason);
        return NoContent();
    }

    // ── User Management ──────────────────────────────────────────────────────

    [HttpGet("users")]
    [ProducesResponseType(typeof(PagedResult<AdminUserSummaryResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUsers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? role = null,
        [FromQuery] bool? isBanned = null)
    {
        var result = await _adminUserService.ListUsersAsync(page, pageSize, role, isBanned);
        return Ok(result);
    }

    [HttpGet("users/{id:int}")]
    [ProducesResponseType(typeof(AdminUserSummaryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetUser(int id)
    {
        var user = await _adminUserService.GetUserAsync(id);
        return Ok(user);
    }

    [HttpPatch("users/{id:int}/ban")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> BanUser(int id)
    {
        var adminId = GetUserId();
        if (adminId is null) return Unauthorized();

        await _adminUserService.BanUserAsync(adminId.Value, id);
        return NoContent();
    }

    [HttpPatch("users/{id:int}/unban")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UnbanUser(int id)
    {
        await _adminUserService.UnbanUserAsync(id);
        return NoContent();
    }
}
