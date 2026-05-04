namespace SmartSports.Domain.Entities.Projections;

public record PitchBookingInfo(
    int     Id,
    string  Name,
    decimal PricePerHour,
    bool    IsActive,
    bool    IsApproved,
    int     MaxBookingDurationMinutes);
