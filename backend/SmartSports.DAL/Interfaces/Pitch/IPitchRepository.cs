using PitchEntity = SmartSports.Domain.Entities.Pitch;

namespace SmartSports.DAL.Interfaces.Pitch;

public interface IPitchRepository
{
    Task<PitchEntity?> GetByIdAsync(int pitchId);
}