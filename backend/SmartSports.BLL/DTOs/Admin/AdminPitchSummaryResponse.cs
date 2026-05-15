using SmartSports.Domain.Enums;

namespace SmartSports.BLL.DTOs.Admin;

public class AdminPitchSummaryResponse
{
    public int         Id            { get; set; }
    public string      Name          { get; set; } = string.Empty;
    public string      Address       { get; set; } = string.Empty;
    public decimal     PricePerHour  { get; set; }
    public string      SportName     { get; set; } = string.Empty;
    public string      CityName      { get; set; } = string.Empty;
    public string      OwnerName     { get; set; } = string.Empty;
    public int         OwnerId       { get; set; }
    public PitchStatus Status        { get; set; }
    public DateTime    CreatedAt     { get; set; }
    public string?       CoverImageUrl { get; set; }
    public IEnumerable<string> Images  { get; set; } = Array.Empty<string>();
}
