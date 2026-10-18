namespace SmartSports.DAL.Parameters;

/// <summary>
/// Bundles all filter, sort, and pagination parameters for the pitch list query.
/// Owned by the DAL layer so the repository interface can reference it without
/// creating a dependency on the BLL.
/// </summary>
public record PitchFilterParams(
    string?   Search,
    string?   Sport,
    string?   City,
    decimal?  MaxPrice,
    string?   SortBy,
    DateOnly? Date,
    int       Page,
    int       PageSize
);
