namespace SmartSports.DAL.Parameters;

public record MatchFilterParams(
    DateOnly Today,
    string?  Sport,
    string?  City,
    int      Page,
    int      PageSize
);
