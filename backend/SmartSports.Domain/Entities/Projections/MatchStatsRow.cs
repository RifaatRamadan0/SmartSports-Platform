namespace SmartSports.Domain.Entities.Projections;

public record MatchStatsRow(long OpenGamesCount, long CitiesCount);

public record MatchCountByName(string Name, int Count);
