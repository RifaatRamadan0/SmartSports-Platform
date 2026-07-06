namespace SmartSports.BLL.DTOs.Pitch;

/// <summary>
/// Encapsulates all search, filter, sort, and pagination inputs for the pitch list endpoint.
/// ASP.NET Core binds this directly from query-string parameters via [FromQuery].
/// </summary>
public class PitchSearchQuery
{
    public string?  Search   { get; set; }
    public string?  Sport    { get; set; }
    public string?  City     { get; set; }
    public decimal? MaxPrice { get; set; }

    /// <summary>
    /// Optional ISO date (yyyy-MM-dd). Filters to pitches whose weekly schedule is
    /// active on that date's weekday. Kept as a string (not DateOnly) so a malformed
    /// value fails soft in the service rather than returning a binding-level 400.
    /// </summary>
    public string?  Date     { get; set; }

    /// <summary>Accepted values: newest (default), price_asc, price_desc, rating_desc.</summary>
    public string?  SortBy   { get; set; }

    public int Page     { get; set; } = 1;
    public int PageSize { get; set; } = 12;
}
