using System.ComponentModel.DataAnnotations;

namespace SmartSports.BLL.DTOs.Booking;

public class CreateBookingRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "PitchId is required.")]
    public int PitchId { get; set; }

    [Required(ErrorMessage = "BookingDate is required.")]
    public DateOnly? BookingDate { get; set; }

    [Required(ErrorMessage = "StartTime is required.")]
    public TimeOnly? StartTime { get; set; }

    [Range(60, 480, ErrorMessage = "Duration must be between 60 and 480 minutes.")]
    public int DurationInMinutes { get; set; }
}