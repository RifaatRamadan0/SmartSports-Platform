using SmartSports.DAL.Parameters;
using SmartSports.Domain.Entities.Projections;
using PitchEntity = SmartSports.Domain.Entities.Pitch;

namespace SmartSports.DAL.Interfaces.Pitch;

public interface IPitchRepository
{
    Task<PitchEntity?> GetByIdAsync(int pitchId);

    /// <summary>
    /// Returns a paged, filtered, sorted list of active and approved pitches.
    /// All filter fields in <paramref name="filters"/> are optional.
    /// </summary>
    Task<(IEnumerable<PitchListRow> Items, long TotalCount)> ListAsync(PitchFilterParams filters);
}
