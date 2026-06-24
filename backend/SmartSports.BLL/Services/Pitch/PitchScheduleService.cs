using SmartSports.BLL.DTOs.Pitch;
using SmartSports.BLL.Interfaces.Pitch;
using SmartSports.DAL.Interfaces.Pitch;
using SmartSports.Domain.Exceptions;

namespace SmartSports.BLL.Services.Pitch;
// Imported inside the namespace so entity types resolve before the sibling
// SmartSports.BLL.Services.* namespaces that share their names.
using SmartSports.Domain.Entities;

public class PitchScheduleService : IPitchScheduleService
{
    private readonly IPitchScheduleRepository _scheduleRepository;

    public PitchScheduleService(IPitchScheduleRepository scheduleRepository)
    {
        _scheduleRepository = scheduleRepository;
    }

    /// <inheritdoc/>
    public async Task<IEnumerable<PitchScheduleResponse>> GetScheduleAsync(int pitchId)
    {
        if (!await _scheduleRepository.PitchExistsAsync(pitchId))
            throw new KeyNotFoundException($"Pitch with ID {pitchId} was not found.");

        var rows = await _scheduleRepository.GetByPitchIdAsync(pitchId);

        return rows.Select(r => new PitchScheduleResponse
        {
            DayOfWeek = r.DayOfWeek,
            OpenTime = r.OpenTime,
            CloseTime = r.CloseTime,
            IsActive = r.IsActive,
        });
    }

    /// <inheritdoc/>
    public async Task UpsertScheduleAsync(int ownerId, int pitchId, UpsertScheduleRequest request)
    {
        var pitchOwnerId = await _scheduleRepository.GetPitchOwnerIdAsync(pitchId);

        if (pitchOwnerId is null)
            throw new KeyNotFoundException($"Pitch with ID {pitchId} was not found.");

        if (pitchOwnerId != ownerId)
            throw new ForbiddenException("You do not own this pitch.");

        var hasDuplicates = request.Schedule
            .GroupBy(d => d.DayOfWeek)
            .Any(g => g.Count() > 1);

        if (hasDuplicates)
            throw new ArgumentException("Duplicate days detected. Each day must appear exactly once.");

        foreach (var day in request.Schedule)
        {
            if (!day.IsActive) continue;

            if (day.CloseTime <= day.OpenTime)
                throw new ArgumentException($"{(DayOfWeek)day.DayOfWeek}: CloseTime must be after OpenTime.");
        }

        var schedules = request.Schedule.Select(d => new PitchWeeklySchedule
        {
            PitchId = pitchId,
            DayOfWeek = (DayOfWeek)d.DayOfWeek,
            OpenTime = d.OpenTime,
            CloseTime = d.CloseTime,
            IsActive = d.IsActive,
        });

        await _scheduleRepository.UpsertAsync(pitchId, schedules);
    }
}
