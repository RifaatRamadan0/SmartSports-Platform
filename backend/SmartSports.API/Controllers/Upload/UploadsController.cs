using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SmartSports.BLL.DTOs.Upload;
using SmartSports.BLL.Interfaces.Upload;

namespace SmartSports.API.Controllers.Upload;

[ApiController]
[Authorize]
[Route("api/uploads")]
public class UploadsController : ControllerBase
{
    private readonly IImageKitAuthService _imageKitAuthService;

    public UploadsController(IImageKitAuthService imageKitAuthService)
    {
        _imageKitAuthService = imageKitAuthService;
    }

    /// <summary>
    /// GET /api/uploads/imagekit-auth
    /// Returns short-lived ImageKit auth params (token, expire, signature) that the
    /// browser pairs with the file when POSTing directly to ImageKit.
    /// Any authenticated user may request these: pitch owners upload pitch images,
    /// while players (and admins) upload their own profile avatar on the Settings page.
    /// </summary>
    [HttpGet("imagekit-auth")]
    [EnableRateLimiting("imagekit-auth")]
    [ProducesResponseType(typeof(ImageKitAuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public IActionResult ImageKitAuth()
    {
        var auth = _imageKitAuthService.GenerateAuthParams();
        return Ok(auth);
    }
}
