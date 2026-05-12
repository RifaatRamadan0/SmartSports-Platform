namespace SmartSports.Domain.Entities.Projections;

public record PitchListRow(
    int      Id,
    string   Name,
    string   Address,
    decimal  PricePerHour,
    decimal? Rating,
    string   SportName,
    int      MaxBookingDurationMinutes,
    string   CityName,
    string?  CoverImageUrl);
