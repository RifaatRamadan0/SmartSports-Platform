namespace SmartSports.Domain.Entities.Projections;

public record CityRow
{
    public int    Id         { get; init; }
    public string Name       { get; init; } = "";
    public int    RegionId   { get; init; }
    public string RegionName { get; init; } = "";
}
