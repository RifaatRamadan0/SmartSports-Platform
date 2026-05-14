namespace SmartSports.BLL.DTOs.Pitch;

public class PitchDetailResponse
{
    public int      Id                        { get; init; }
    public int      OwnerId                   { get; init; }
    public string   Name                      { get; init; } = string.Empty;
    public string   SportTypeName             { get; init; } = string.Empty;
    public string   CityName                  { get; init; } = string.Empty;
    public string   Address                   { get; init; } = string.Empty;
    public decimal  PricePerHour              { get; init; }
    public decimal? Rating                    { get; init; }
    public int      MaxBookingDurationMinutes { get; init; }

    public IEnumerable<string>              Images        { get; init; } = [];
    public IEnumerable<ScheduleDayResponse> Schedule      { get; init; } = [];
    public IEnumerable<ReviewSummary>       RecentReviews { get; init; } = [];
}
