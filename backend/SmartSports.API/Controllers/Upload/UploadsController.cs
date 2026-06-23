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
    /// PitchOwner-only — relax the policy if other roles ever need to upload.
    /// </summary>
    [HttpGet("imagekit-auth")]
    [Authorize(Policy = "PitchOwnerOnly")]
    [EnableRateLimiting("imagekit-auth")]
    [ProducesResponseType(typeof(ImageKitAuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public IActionResult ImageKitAuth()
    {
        var auth = _imageKitAuthService.GenerateAuthParams();
        return Ok(auth);
    }
}
