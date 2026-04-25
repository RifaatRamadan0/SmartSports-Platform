namespace SmartSports.BLL.DTOs.Booking;

public class BookingQuery
{
    public string? Status { get; set; }
    public DateOnly? From { get; set; }
    public DateOnly? To { get; set; }
}
