namespace SmartSports.Domain.Entities.Projections;

/// <summary>
/// Generic id/name projection used for lookup-table queries (sport types, cities, etc.).
/// Dapper maps snake_case columns id → Id, name → Name via the global DefaultTypeMap.
/// </summary>
public record LookupRow(int Id, string Name);
