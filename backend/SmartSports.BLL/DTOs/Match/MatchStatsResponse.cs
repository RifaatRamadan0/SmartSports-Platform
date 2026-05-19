namespace SmartSports.BLL.DTOs.Match;

public class MatchStatsResponse
{
    public int                        OpenGamesCount { get; set; }
    public int                        CitiesCount    { get; set; }
    public IEnumerable<NameCountItem> BySport        { get; set; } = [];
    public IEnumerable<NameCountItem> ByCity         { get; set; } = [];
}

public class NameCountItem
{
    public string Name  { get; set; } = string.Empty;
    public int    Count { get; set; }
}
