using SmartSports.Domain.Enums;

namespace SmartSports.BLL.DTOs.Pitch;

public class PitchResponse
{
    public int       Id                        { get; set; }
    public int       OwnerId                   { get; set; }
    public int       CityId                    { get; set; }
    public int       SportTypeId               { get; set; }
    public string    Name                      { get; set; } = string.Empty;
    public string    Address                   { get; set; } = string.Empty;
    public decimal   PricePerHour              { get; set; }
    public decimal?  Latitude                  { get; set; }
    public decimal?  Longitude                 { get; set; }
    public int       MaxBookingDurationMinutes { get; set; }
    public bool        IsActive         { get; set; }
    public PitchStatus Status           { get; set; }
    public string?     RejectionReason  { get; set; }
    public DateTime    CreatedAt        { get; set; }
}
