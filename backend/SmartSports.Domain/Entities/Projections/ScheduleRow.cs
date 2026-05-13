namespace SmartSports.Domain.Entities.Projections;

public record ScheduleRow(
    int      PitchId,
    int      DayOfWeek,
    TimeOnly OpenTime,
    TimeOnly CloseTime,
    bool     IsActive);
