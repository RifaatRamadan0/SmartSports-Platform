using SmartSports.BLL.DTOs.Pitch;
using SmartSports.BLL.Interfaces;
using SmartSports.DAL.Interfaces.Pitch;
using SmartSports.Domain.Entities;
using SmartSports.Domain.Exceptions;

namespace SmartSports.BLL.Services;

public class PitchImageService : IPitchImageService
{
    private const int MaxImagesPerPitch = 8;

    private readonly IPitchRepository _pitchRepository;

    public PitchImageService(IPitchRepository pitchRepository)
    {
        _pitchRepository = pitchRepository;
    }

    public async Task<IEnumerable<PitchImageResponse>> ListAsync(int ownerId, int pitchId)
    {
        await EnsureOwnedAsync(ownerId, pitchId);

        var rows = await _pitchRepository.GetPitchImagesAsync(pitchId);
        return rows.Select(ToResponse);
    }

    public async Task<PitchImageResponse> AddAsync(int ownerId, int pitchId, AddPitchImageRequest request)
    {
        await EnsureOwnedAsync(ownerId, pitchId);

        var url = (request.ImageUrl ?? string.Empty).Trim();
        if (url.Length == 0)
            throw new ArgumentException("Image URL is required.");
        if (url.Length > 2048)
            throw new ArgumentException("Image URL is too long.");
        if (!Uri.TryCreate(url, UriKind.Absolute, out var parsed) ||
            (parsed.Scheme != Uri.UriSchemeHttp && parsed.Scheme != Uri.UriSchemeHttps))
        {
            throw new ArgumentException("Image URL must be an absolute http(s) URL.");
        }

        var count = await _pitchRepository.CountPitchImagesAsync(pitchId);
        if (count >= MaxImagesPerPitch)
            throw new ArgumentException($"A pitch can have at most {MaxImagesPerPitch} images.");

        var isCover = request.IsCover ?? false;
        var row = await _pitchRepository.AddPitchImageAsync(pitchId, url, isCover);
        return ToResponse(row);
    }

    public async Task<PitchImageResponse> SetCoverAsync(int ownerId, int pitchId, int imageId)
    {
        await EnsureOwnedAsync(ownerId, pitchId);

        var image = await _pitchRepository.GetPitchImageAsync(pitchId, imageId)
            ?? throw new KeyNotFoundException($"Image {imageId} was not found for this pitch.");

        if (!image.IsCover)
        {
            var updated = await _pitchRepository.SetPitchImageCoverAsync(pitchId, imageId);
            if (!updated)
                throw new KeyNotFoundException($"Image {imageId} was not found for this pitch.");
        }

        var fresh = await _pitchRepository.GetPitchImageAsync(pitchId, imageId)
            ?? throw new KeyNotFoundException($"Image {imageId} was not found for this pitch.");
        return ToResponse(fresh);
    }

    public async Task DeleteAsync(int ownerId, int pitchId, int imageId)
    {
        await EnsureOwnedAsync(ownerId, pitchId);

        var deleted = await _pitchRepository.DeletePitchImageAsync(pitchId, imageId);
        if (!deleted)
            throw new KeyNotFoundException($"Image {imageId} was not found for this pitch.");
    }

    private async Task EnsureOwnedAsync(int ownerId, int pitchId)
    {
        var pitch = await _pitchRepository.GetByIdAsync(pitchId);

        if (pitch is null || pitch.DeletedAt is not null)
            throw new KeyNotFoundException($"Pitch with ID {pitchId} was not found.");

        if (pitch.OwnerId != ownerId)
            throw new ForbiddenException("You do not own this pitch.");
    }

    private static PitchImageResponse ToResponse(PitchImage image) => new()
    {
        Id           = image.Id,
        ImageUrl     = image.ImageUrl,
        IsCover      = image.IsCover,
        DisplayOrder = image.DisplayOrder,
    };
}
