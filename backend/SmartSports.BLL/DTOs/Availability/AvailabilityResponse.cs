namespace SmartSports.BLL.DTOs.Availability;

public class AvailabilityResponse
{
    public bool? UsernameAvailable { get; set; }
    public bool? EmailAvailable { get; set; }
    public bool? PhoneNumberAvailable { get; set; }
}
