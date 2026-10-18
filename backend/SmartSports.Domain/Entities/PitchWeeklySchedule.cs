namespace SmartSports.Domain.Entities;
public class PitchWeeklySchedule
{
    public int Id { get; set; }
    public int PitchId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public TimeOnly OpenTime { get; set; }
    public TimeOnly CloseTime { get; set; }
    public bool IsActive { get; set; }
}