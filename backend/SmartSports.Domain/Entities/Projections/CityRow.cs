namespace SmartSports.Domain.Entities.Projections;

public record CityRow(
    int    Id,
    string Name,
    int    RegionId,
    string RegionName);
