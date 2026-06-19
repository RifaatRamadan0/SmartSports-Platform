namespace SmartSports.Domain.Entities.Projections;

public record PitchDetailRow(
    int      Id,
    int      OwnerId,
    string   Name,
    string   SportTypeName,
    string   CityName,
    string   Address,
    decimal  PricePerHour,
    decimal? Rating,
    int      MaxBookingDurationMinutes,
    int      Capacity)
{
    /// <summary>
    /// True when the current user has favorited this pitch. Populated only by
    /// queries that select an is_favorited column; defaults to false otherwise.
    /// </summary>
    public bool IsFavorited { get; init; }
}
