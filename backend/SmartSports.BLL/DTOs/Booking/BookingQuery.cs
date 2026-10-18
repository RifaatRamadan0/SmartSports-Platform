using System.ComponentModel.DataAnnotations;

namespace SmartSports.BLL.DTOs.Booking;

public class BookingQuery
{
    // Filters
    public string? Status { get; set; }
    public DateOnly? From { get; set; }
    public DateOnly? To { get; set; }

    //  for pagination
    [Range(1, int.MaxValue, ErrorMessage = "Page must be at least 1.")]
    public int Page { get; set; } = 1;

    [Range(1, 50, ErrorMessage = "PageSize must be between 1 and 50.")]
    public int PageSize { get; set; } = 10;
}
