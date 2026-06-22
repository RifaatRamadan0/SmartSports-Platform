using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SmartSports.BLL.DTOs.Booking;
using SmartSports.BLL.DTOs.Pitch;
using SmartSports.BLL.Interfaces;

namespace SmartSports.API.Controllers;

[ApiController]
[Authorize]
[Route("api/pitches")]
public class PitchesController : BaseApiController
{
    private readonly IPitchService       _pitchService;
    private readonly IPitchImageService  _pitchImageService;
    private readonly IFavoriteService    _favoriteService;

    public PitchesController(
        IPitchService      pitchService,
        IPitchImageService pitchImageService,
        IFavoriteService   favoriteService)
    {
        _pitchService      = pitchService;
        _pitchImageService = pitchImageService;
        _favoriteService   = favoriteService;
    }

    /// <summary>
    /// GET /api/pitches?search=&sport=&city=&maxPrice=&sortBy=&page=&pageSize=
    /// Public. Returns active and approved pitches with filtering, sorting, and pagination.
    /// sortBy: newest (default) | price_asc | price_desc | rating_desc
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(PagedResult<PitchListResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] PitchSearchQuery query)
    {
        // JWT bearer still populates the principal on [AllowAnonymous] endpoints, so an
        // authenticated player gets correct isFavorited flags while guests get null → false.
        var result = await _pitchService.ListAsync(query, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// GET /api/pitches/mine?page=&pageSize=
    /// Lists every pitch owned by the caller (incl. inactive/unapproved, excl. soft-deleted). Paged.
    /// </summary>
    [HttpGet("mine")]
    [Authorize(Policy = "PitchOwnerOnly")]
    [ProducesResponseType(typeof(PagedResult<PitchListResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ListMine([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var ownerId = GetUserId();
        if (ownerId is null) return Unauthorized();

        var result = await _pitchService.ListMineAsync(ownerId.Value, page, pageSize);
        return Ok(result);
    }

    /// <summary>
    /// GET /api/pitches/mine/{id}
    /// Returns full detail for one of the caller's own pitches (incl. inactive/unapproved).
    /// Used to pre-fill the owner edit form.
    /// </summary>
    [HttpGet("mine/{id:int}")]
    [Authorize(Policy = "PitchOwnerOnly")]
    [ProducesResponseType(typeof(PitchResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMineById(int id)
    {
        var ownerId = GetUserId();
        if (ownerId is null) return Unauthorized();

        var pitch = await _pitchService.GetOwnedByIdAsync(ownerId.Value, id);
        return Ok(pitch);
    }

    /// <summary>
    /// GET /api/pitches/{id}
    /// Returns full public detail: name, sport type, city, price, rating, images, weekly schedule, and up to 5 recent reviews.
    /// 404 if the pitch does not exist, is inactive, or is not approved.
    /// </summary>
    [HttpGet("{id:int}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(PitchDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var detail = await _pitchService.GetDetailAsync(id, GetUserId());
        return Ok(detail);
    }

    /// <summary>
    /// POST /api/pitches/{id}/favorite
    /// Toggles the favorite for the authenticated player and returns the new state.
    /// 404 if the pitch does not exist or is not publicly visible.
    /// </summary>
    [HttpPost("{id:int}/favorite")]
    [Authorize(Policy = "PlayerOnly")]
    [EnableRateLimiting("favorites")]
    [ProducesResponseType(typeof(FavoriteToggleResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ToggleFavorite(int id)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var isFavorited = await _favoriteService.ToggleAsync(userId.Value, id);
        return Ok(new FavoriteToggleResponse { IsFavorited = isFavorited });
    }

    /// <summary>
    /// POST /api/pitches
    /// Creates a new pitch owned by the caller. Server sets owner, active=true,
    /// approved=false, created_at=NOW().
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "PitchOwnerOnly")]
    [ProducesResponseType(typeof(PitchResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Create([FromBody] CreatePitchRequest request)
    {
        var ownerId = GetUserId();
        if (ownerId is null) return Unauthorized();

        var created = await _pitchService.CreateAsync(ownerId.Value, request);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    /// <summary>
    /// PUT /api/pitches/{id}
    /// Updates an existing pitch. Caller must own it. Approval state is preserved.
    /// </summary>
    [HttpPut("{id:int}")]
    [Authorize(Policy = "PitchOwnerOnly")]
    [ProducesResponseType(typeof(PitchResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdatePitchRequest request)
    {
        var ownerId = GetUserId();
        if (ownerId is null) return Unauthorized();

        var updated = await _pitchService.UpdateAsync(ownerId.Value, id, request);
        return Ok(updated);
    }

    /// <summary>
    /// DELETE /api/pitches/{id}
    /// Soft-deletes a pitch the caller owns.
    /// </summary>
    [HttpDelete("{id:int}")]
    [Authorize(Policy = "PitchOwnerOnly")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        var ownerId = GetUserId();
        if (ownerId is null) return Unauthorized();

        await _pitchService.SoftDeleteAsync(ownerId.Value, id);
        return NoContent();
    }

    // ─── Pitch images (owner-only) ────────────────────────────────────────────

    /// <summary>
    /// GET /api/pitches/mine/{pitchId}/images
    /// Lists all images attached to one of the caller's pitches, cover first.
    /// </summary>
    [HttpGet("mine/{pitchId:int}/images")]
    [Authorize(Policy = "PitchOwnerOnly")]
    [ProducesResponseType(typeof(IEnumerable<PitchImageResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ListImages(int pitchId)
    {
        var ownerId = GetUserId();
        if (ownerId is null) return Unauthorized();

        var images = await _pitchImageService.ListAsync(ownerId.Value, pitchId);
        return Ok(images);
    }

    /// <summary>
    /// POST /api/pitches/mine/{pitchId}/images
    /// Attaches a new image to the caller's pitch. Up to 8 images per pitch.
    /// Pass isCover = true to make this the cover (any prior cover is unset).
    /// </summary>
    [HttpPost("mine/{pitchId:int}/images")]
    [Authorize(Policy = "PitchOwnerOnly")]
    [ProducesResponseType(typeof(PitchImageResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddImage(int pitchId, [FromBody] AddPitchImageRequest request)
    {
        var ownerId = GetUserId();
        if (ownerId is null) return Unauthorized();

        var created = await _pitchImageService.AddAsync(ownerId.Value, pitchId, request);
        return CreatedAtAction(nameof(ListImages), new { pitchId }, created);
    }

    /// <summary>
    /// PATCH /api/pitches/mine/{pitchId}/images/{imageId}/cover
    /// Marks an existing image as the cover for the pitch. Clears any prior cover.
    /// </summary>
    [HttpPatch("mine/{pitchId:int}/images/{imageId:int}/cover")]
    [Authorize(Policy = "PitchOwnerOnly")]
    [ProducesResponseType(typeof(PitchImageResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetCover(int pitchId, int imageId)
    {
        var ownerId = GetUserId();
        if (ownerId is null) return Unauthorized();

        var updated = await _pitchImageService.SetCoverAsync(ownerId.Value, pitchId, imageId);
        return Ok(updated);
    }

    /// <summary>
    /// DELETE /api/pitches/mine/{pitchId}/images/{imageId}
    /// Removes an image from the pitch. Deleting the cover leaves the pitch
    /// without a cover (no auto-promote).
    /// </summary>
    [HttpDelete("mine/{pitchId:int}/images/{imageId:int}")]
    [Authorize(Policy = "PitchOwnerOnly")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteImage(int pitchId, int imageId)
    {
        var ownerId = GetUserId();
        if (ownerId is null) return Unauthorized();

        await _pitchImageService.DeleteAsync(ownerId.Value, pitchId, imageId);
        return NoContent();
    }
}
