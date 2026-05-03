using SmartSports.Domain.Entities.Projections;

namespace SmartSports.DAL.Interfaces.Pitch;

public interface IPitchRepository
{
    Task<PitchBookingInfo?> GetByIdAsync(int pitchId);
}
