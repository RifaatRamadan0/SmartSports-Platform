namespace SmartSports.Domain.Entities.Projections;

public record SportTypeRow
{
    public int    Id   { get; init; }
    public string Name { get; init; } = "";
}
