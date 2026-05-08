namespace SmartSports.Domain.Entities.Projections;

public class PitchListRow
{
    public int      Id           { get; set; }
    public string   Name         { get; set; } = string.Empty;
    public string   Address      { get; set; } = string.Empty;
    public decimal  PricePerHour { get; set; }
    public decimal? Rating       { get; set; }
    public string   SportName    { get; set; } = string.Empty;
}
