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
            throw new KeyNotFoundException($"Pitch with ID {pitchId} was not found or is inactive.");

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
}
