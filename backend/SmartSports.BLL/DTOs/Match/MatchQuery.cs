namespace SmartSports.BLL.DTOs.Match;

public class MatchQuery
{
    public string? Sport    { get; set; }
    public string? City     { get; set; }
    public int     Page     { get; set; } = 1;
    public int     PageSize { get; set; } = 10;
}
