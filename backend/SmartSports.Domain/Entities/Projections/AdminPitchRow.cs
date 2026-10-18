using SmartSports.Domain.Enums;

namespace SmartSports.Domain.Entities.Projections;

public record AdminPitchRow
{
    public int         Id            { get; init; }
    public string      Name          { get; init; } = "";
    public string      Address       { get; init; } = "";
    public decimal     PricePerHour  { get; init; }
    public string      SportName     { get; init; } = "";
    public string      CityName      { get; init; } = "";
    public string      OwnerName     { get; init; } = "";
    public int         OwnerId       { get; init; }
    public PitchStatus Status        { get; init; }
    public DateTime    CreatedAt     { get; init; }
    public string?     CoverImageUrl { get; init; }
    public string[]    Images        { get; init; } = Array.Empty<string>();
}
