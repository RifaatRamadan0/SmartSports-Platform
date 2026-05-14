namespace SmartSports.Domain.Entities.Projections;

public record PitchDetailRow(
    int      Id,
    int      OwnerId,
    string   Name,
    string   SportTypeName,
    string   CityName,
    string   Address,
    decimal  PricePerHour,
    decimal? Rating,
    int      MaxBookingDurationMinutes);
