using SmartSports.BLL.DTOs.Match;

namespace SmartSports.BLL.DTOs.Booking;

public class BookingResponse
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int PitchId { get; set; }
    public string PitchName { get; set; } = string.Empty;
    public DateOnly BookingDate { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public decimal TotalPrice { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime BookedAt { get; set; }
    public string? CancellationReason { get; set; }

    // SPDBTCP-245 — populated for endpoints that include the linked match (create, detail).
    public MatchResponse? Match { get; set; }
}
