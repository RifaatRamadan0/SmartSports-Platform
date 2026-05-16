using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSports.BLL.DTOs.RoleRequest;
using SmartSports.BLL.Interfaces;

namespace SmartSports.API.Controllers;

[ApiController]
[Route("api/roles")]
[Authorize]
public class RoleController : ControllerBase
{
    private readonly IRoleRequestService _roleRequestService;

    public RoleController(IRoleRequestService roleRequestService)
    {
        _roleRequestService = roleRequestService;
    }

    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

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
        await _roleRequestService.RequestRoleAsync(CurrentUserId, request.RequestedRole);
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
        await _roleRequestService.AddPlayerRoleInstantlyAsync(CurrentUserId);
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
        var result = await _roleRequestService.GetMyRequestsAsync(CurrentUserId);
        return Ok(result);
    }
}
