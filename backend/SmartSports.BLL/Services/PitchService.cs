using SmartSports.BLL.DTOs.Booking;
using SmartSports.BLL.DTOs.Pitch;
using SmartSports.BLL.Interfaces;
using SmartSports.DAL.Interfaces.Pitch;
using SmartSports.DAL.Parameters;

namespace SmartSports.BLL.Services;

public class PitchService : IPitchService
{
    private readonly IPitchRepository _pitchRepository;

    public PitchService(IPitchRepository pitchRepository)
    {
        _pitchRepository = pitchRepository;
    }

    public async Task<PitchResponse> GetByIdAsync(int pitchId)
    {
        var pitch = await _pitchRepository.GetByIdAsync(pitchId);

        if (pitch is null || !pitch.IsActive || !pitch.IsApproved)
            throw new KeyNotFoundException($"Pitch with ID {pitchId} was not found.");

        return new PitchResponse
        {
            Id                        = pitch.Id,
            OwnerId                   = pitch.OwnerId,
            Name                      = pitch.Name,
            PricePerHour              = pitch.PricePerHour,
            MaxBookingDurationMinutes = pitch.MaxBookingDurationMinutes,
            IsActive                  = pitch.IsActive,
            IsApproved                = pitch.IsApproved,
        };
    }

    public async Task<PagedResult<PitchListResponse>> ListAsync(PitchSearchQuery query)
    {
        // Clamp pagination bounds.
        if (query.Page     < 1)   query.Page     = 1;
        if (query.PageSize < 1)   query.PageSize = 12;
        if (query.PageSize > 100) query.PageSize = 100;

        // Discard nonsensical price ceiling.
        if (query.MaxPrice.HasValue && query.MaxPrice <= 0)
            query.MaxPrice = null;

        var filters = new PitchFilterParams(
            Search:   query.Search?.Trim(),
            Sport:    query.Sport?.Trim(),
            City:     query.City?.Trim(),
            MaxPrice: query.MaxPrice,
            SortBy:   query.SortBy?.Trim(),
            Page:     query.Page,
            PageSize: query.PageSize
        );

        var (rows, total) = await _pitchRepository.ListAsync(filters);

        var items = rows.Select(r => new PitchListResponse
        {
            Id                        = r.Id,
            Name                      = r.Name,
            Address                   = r.Address,
            PricePerHour              = r.PricePerHour,
            Rating                    = r.Rating,
            SportName                 = r.SportName,
            MaxBookingDurationMinutes = r.MaxBookingDurationMinutes,
            CityName                  = r.CityName,
            CoverImageUrl             = r.CoverImageUrl,
        });

        return new PagedResult<PitchListResponse>
        {
            Items      = items,
            TotalCount = (int)Math.Min(total, int.MaxValue),
            Page       = query.Page,
            PageSize   = query.PageSize,
        };
    }
}
