using SmartSports.BLL.DTOs.Booking;
using SmartSports.BLL.DTOs.Pitch;
using SmartSports.BLL.Interfaces;
using SmartSports.DAL.Interfaces.Pitch;

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

    public async Task<PagedResult<PitchListResponse>> ListAsync(string? sport, int page, int pageSize)
    {
        if (page     < 1)   page     = 1;
        if (pageSize < 1)   pageSize = 12;
        if (pageSize > 100) pageSize = 100;

        var (rows, total) = await _pitchRepository.ListAsync(sport, page, pageSize);

        var items = rows.Select(r => new PitchListResponse
        {
            Id                        = r.Id,
            Name                      = r.Name,
            Address                   = r.Address,
            PricePerHour              = r.PricePerHour,
            Rating                    = r.Rating,
            SportName                 = r.SportName,
            MaxBookingDurationMinutes = r.MaxBookingDurationMinutes,
        });

        return new PagedResult<PitchListResponse>
        {
            Items      = items,
            TotalCount = (int)Math.Min(total, int.MaxValue),
            Page       = page,
            PageSize   = pageSize,
        };
    }
}
