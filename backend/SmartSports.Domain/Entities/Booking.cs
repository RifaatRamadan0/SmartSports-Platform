namespace SmartSports.Domain.Entities;

public class Booking
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int PitchId { get; set; }
    public DateOnly BookingDate { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public decimal TotalPrice { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime BookedAt { get; set; }

    // joined fields
    // Populated only when fetched with a JOIN on pitches.
    // Empty string when fetched without the JOIN (e.g. availability queries).
    public string PitchName { get; set; } = string.Empty;
}
