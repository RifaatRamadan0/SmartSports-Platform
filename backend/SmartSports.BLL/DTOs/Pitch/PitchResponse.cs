namespace SmartSports.BLL.DTOs.Pitch;

public class PitchResponse
{
    public int     Id                        { get; set; }
    public int     OwnerId                   { get; set; }
    public string  Name                      { get; set; } = string.Empty;
    public decimal PricePerHour              { get; set; }
    public int     MaxBookingDurationMinutes { get; set; }
    public bool    IsActive                  { get; set; }
    public bool    IsApproved                { get; set; }
}
