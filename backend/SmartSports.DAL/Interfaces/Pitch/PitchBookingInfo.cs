namespace SmartSports.DAL.Interfaces.Pitch;

public record PitchBookingInfo(
    int     Id,
    string  Name,
    decimal PricePerHour,
    bool    IsActive,
    bool    IsApproved,
    int     MaxBookingDurationMinutes);
