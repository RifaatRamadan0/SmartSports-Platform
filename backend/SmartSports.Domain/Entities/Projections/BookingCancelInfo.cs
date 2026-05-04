namespace SmartSports.Domain.Entities.Projections;

/// <summary>
/// Lightweight projection used by the cancel flow.
/// Only carries the fields needed to validate and perform a cancellation.
/// </summary>
public record BookingCancelInfo(
    int      Id,
    int      UserId,
    string   Status,
    DateOnly BookingDate,
    TimeOnly StartTime);
