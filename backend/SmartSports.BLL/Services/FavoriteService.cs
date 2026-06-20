using SmartSports.BLL.DTOs.Booking;
using SmartSports.BLL.DTOs.Pitch;
using SmartSports.BLL.Interfaces;
using SmartSports.DAL.Interfaces.Pitch;

namespace SmartSports.BLL.Services;

public class FavoriteService : IFavoriteService
{
    private readonly IFavoritePitchRepository _favoriteRepository;
    private readonly IPitchRepository         _pitchRepository;

    public FavoriteService(
        IFavoritePitchRepository favoriteRepository,
        IPitchRepository         pitchRepository)
    {
        _favoriteRepository = favoriteRepository;
        _pitchRepository    = pitchRepository;
    }

    public async Task<bool> ToggleAsync(int userId, int pitchId)
    {
        // Only allow favoriting pitches a player could actually discover. A lightweight
        // EXISTS check is enough here — we just need the visibility gate, not the full row.
        if (!await _pitchRepository.ExistsVisibleAsync(pitchId))
            throw new KeyNotFoundException($"Pitch with ID {pitchId} was not found.");

        return await _favoriteRepository.ToggleAsync(userId, pitchId);
    }

    public async Task<PagedResult<PitchListResponse>> ListFavoritesAsync(int userId, int page, int pageSize)
    {
        if (page     < 1)   page     = 1;
        if (pageSize < 1)   pageSize = 12;
        if (pageSize > 100) pageSize = 100;

        var (rows, total) = await _favoriteRepository.ListFavoritesAsync(userId, page, pageSize);

        return new PagedResult<PitchListResponse>
        {
            Items = rows.Select(r => new PitchListResponse
            {
                Id                        = r.Id,
                Name                      = r.Name,
                Address                   = r.Address,
                PricePerHour              = r.PricePerHour,
                Rating                    = r.Rating,
                SportName                 = r.SportName,
                MaxBookingDurationMinutes = r.MaxBookingDurationMinutes,
                Capacity                  = r.Capacity,
                CityName                  = r.CityName,
                CoverImageUrl             = r.CoverImageUrl,
                ImageCount                = r.ImageCount,
                IsActive    = r.IsActive,
                Status      = r.Status,
                IsFavorited = r.IsFavorited,
            }),
            TotalCount = (int)Math.Min(total, int.MaxValue),
            Page       = page,
            PageSize   = pageSize,
        };
    }
}
