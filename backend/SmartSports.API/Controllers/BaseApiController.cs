using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace SmartSports.API.Controllers;

[ApiController]
public abstract class BaseApiController : ControllerBase
{
    protected int? GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(value, out var id) ? id : null;
    }

    protected string? GetUsername() =>
        User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue("unique_name");
}
