namespace SmartSports.BLL.DTOs.Schedule
{
    public class PitchScheduleResponse
    {
        public DayOfWeek DayOfWeek { get; set; }
        public TimeOnly OpenTime { get; set; }
        public TimeOnly CloseTime { get; set; }
        public bool IsActive { get; set; }
    }
}