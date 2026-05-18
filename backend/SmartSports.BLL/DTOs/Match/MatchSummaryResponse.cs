namespace SmartSports.BLL.DTOs.Match;

public class MatchSummaryResponse
{
    public int      MatchId       { get; set; }
    public string   PitchName     { get; set; } = string.Empty;
    public string   CityName      { get; set; } = string.Empty;
    public string   SportName     { get; set; } = string.Empty;
    public DateOnly BookingDate   { get; set; }
    public TimeOnly StartTime     { get; set; }
    public TimeOnly EndTime       { get; set; }
    public int      AcceptedCount { get; set; }
    public int      MaxPlayers    { get; set; }
}
