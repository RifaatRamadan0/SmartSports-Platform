namespace SmartSports.BLL.DTOs.Booking;

public class CreateBookingRequest
{
    public int PitchId { get; set; }
    public DateOnly BookingDate { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
}
