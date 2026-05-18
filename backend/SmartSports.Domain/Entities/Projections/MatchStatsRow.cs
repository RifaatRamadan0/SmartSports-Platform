namespace SmartSports.Domain.Entities.Projections;

public record MatchStatsRow(long OpenGamesCount, long CitiesCount, decimal? MinPricePerPlayer);

public record MatchCountByName(string Name, int Count);
