using System.Security.Claims;

namespace SmartSports.API.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public int? GetUserId()
    {
        var value = _httpContextAccessor.HttpContext?.User
            .FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(value, out var id) ? id : null;
    }

    public string? GetUsername()
    {
        var principal = _httpContextAccessor.HttpContext?.User;
        return principal?.FindFirstValue(ClaimTypes.Name)
            ?? principal?.FindFirstValue("unique_name");
    }
}
