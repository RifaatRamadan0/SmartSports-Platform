namespace SmartSports.DAL.Parameters;

public record MatchFilterParams(
    string? Sport,
    string? City,
    int     Page,
    int     PageSize
);
