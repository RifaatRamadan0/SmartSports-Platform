using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSports.API.Services;
using SmartSports.BLL.DTOs.RoleRequest;
using SmartSports.BLL.Interfaces;

namespace SmartSports.API.Controllers;

[ApiController]
[Route("api/roles")]
[Authorize]
public class RoleController : ControllerBase
{
    private readonly IRoleRequestService _roleRequestService;
    private readonly ICurrentUserService _currentUser;

    public RoleController(
        IRoleRequestService roleRequestService,
        ICurrentUserService currentUser)
    {
        _roleRequestService = roleRequestService;
        _currentUser        = currentUser;
    }

    /// <summary>
    /// POST /api/roles/request
    /// Submits a role upgrade request (e.g., Player → PitchOwner). Requires admin approval.
    /// Body: { "requestedRole": "PitchOwner" }
    /// </summary>
    [HttpPost("request")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RequestRole([FromBody] RequestRoleRequest request)
    {
        var userId = _currentUser.GetUserId();
        if (userId is null) return Unauthorized();

        await _roleRequestService.RequestRoleAsync(userId.Value, request.RequestedRole);
        return NoContent();
    }

    /// <summary>
    /// POST /api/roles/add-player
    /// Instantly grants the Player role to a PitchOwner. No approval needed.
    /// </summary>
    [HttpPost("add-player")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AddPlayerRole()
    {
        var userId = _currentUser.GetUserId();
        if (userId is null) return Unauthorized();

        await _roleRequestService.AddPlayerRoleInstantlyAsync(userId.Value);
        return NoContent();
    }

    /// <summary>
    /// GET /api/roles/my-requests
    /// Returns the current user's role request history.
    /// </summary>
    [HttpGet("my-requests")]
    [ProducesResponseType(typeof(IEnumerable<RoleRequestResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyRequests()
    {
        var userId = _currentUser.GetUserId();
        if (userId is null) return Unauthorized();

        var result = await _roleRequestService.GetMyRequestsAsync(userId.Value);
        return Ok(result);
    }
}
