namespace SmartSports.Domain.Entities;

/// <summary>
/// Lightweight projection used by availability queries.
/// Only carries the fields needed to detect booking overlaps.
/// </summary>
public record BookedInterval(TimeOnly StartTime, TimeOnly EndTime);
