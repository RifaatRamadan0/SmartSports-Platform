namespace SmartSports.BLL.DTOs.Pitch;

public class ScheduleDayResponse
{
    public int      DayOfWeek { get; init; }
    public TimeOnly OpenTime  { get; init; }
    public TimeOnly CloseTime { get; init; }
    public bool     IsActive  { get; init; }
}
