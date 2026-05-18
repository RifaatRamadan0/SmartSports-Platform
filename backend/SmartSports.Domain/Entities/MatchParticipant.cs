namespace SmartSports.Domain.Entities;

public class MatchParticipant
{
    public int    Id                  { get; set; }
    public int    MatchId             { get; set; }
    public int    UserId              { get; set; }
    public string Status              { get; set; } = "pending"; // participant_status: pending | accepted | rejected
    public bool   AttendanceConfirmed { get; set; }
}
