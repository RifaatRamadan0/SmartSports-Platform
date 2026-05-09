using SmartSports.Domain.Entities.Projections;
using PitchEntity = SmartSports.Domain.Entities.Pitch;

namespace SmartSports.DAL.Interfaces.Pitch;

public interface IPitchRepository
{
    Task<PitchEntity?> GetByIdAsync(int pitchId);

    /// <summary>
    /// Lists active and approved pitches with their sport name.
    /// Optional filter by sport name (case-insensitive). Returns paged rows + total.
    /// </summary>
    Task<(IEnumerable<PitchListRow> Items, long TotalCount)> ListAsync(
        string? sport, int page, int pageSize);
}
