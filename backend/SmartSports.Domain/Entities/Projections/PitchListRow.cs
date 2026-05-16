using SmartSports.Domain.Enums;

namespace SmartSports.Domain.Entities.Projections;

public record PitchListRow
{
    public int      Id                        { get; init; }
    public string   Name                      { get; init; } = "";
    public string   Address                   { get; init; } = "";
    public decimal  PricePerHour              { get; init; }
    public decimal? Rating                    { get; init; }
    public string   SportName                 { get; init; } = "";
    public int      MaxBookingDurationMinutes { get; init; }
    public string   CityName                  { get; init; } = "";
    public string?  CoverImageUrl             { get; init; }
    public int      ImageCount                { get; init; }
    public bool        IsActive { get; init; }
    public PitchStatus Status   { get; init; }
}
