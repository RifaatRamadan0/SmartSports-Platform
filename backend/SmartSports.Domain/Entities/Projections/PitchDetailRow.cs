namespace SmartSports.Domain.Entities.Projections;

public record PitchDetailRow
{
    public int      Id                        { get; init; }
    public int      OwnerId                   { get; init; }
    public string   Name                      { get; init; } = "";
    public string   SportTypeName             { get; init; } = "";
    public string   CityName                  { get; init; } = "";
    public string   Address                   { get; init; } = "";
    public decimal  PricePerHour              { get; init; }
    public decimal? Rating                    { get; init; }
    public int      RatingCount               { get; init; }
    public int      MaxBookingDurationMinutes { get; init; }
    public int      Capacity                  { get; init; }
    public bool     IsFavorited               { get; init; }
}
