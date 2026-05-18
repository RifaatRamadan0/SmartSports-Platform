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
    public string? CancellationReason { get; set; }

    // joined fields — populated only when fetched via GetByIdAsync (includes JOIN on pitches).
    // PitchOwnerId is read by BookingService.EnsureUserCanAccessAsync; any new repository
    // method that loads a Booking MUST also JOIN pitches.owner_id, otherwise the owner-auth
    // check will silently fail and deny legitimate pitch owners.
    public string PitchName    { get; set; } = string.Empty;
    public int?   PitchOwnerId { get; set; }
}
