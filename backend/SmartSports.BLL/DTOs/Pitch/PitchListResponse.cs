namespace SmartSports.BLL.DTOs.Pitch;

public class PitchListResponse
{
    public int      Id                        { get; set; }
    public string   Name                      { get; set; } = string.Empty;
    public string   Address                   { get; set; } = string.Empty;
    public decimal  PricePerHour              { get; set; }
    public decimal? Rating                    { get; set; }
    public string   SportName                 { get; set; } = string.Empty;
    public int      MaxBookingDurationMinutes { get; set; }
    public string   CityName                  { get; set; } = string.Empty;
    public string?  CoverImageUrl             { get; set; }
    public bool     IsActive                  { get; set; }
    public bool     IsApproved                { get; set; }
}
