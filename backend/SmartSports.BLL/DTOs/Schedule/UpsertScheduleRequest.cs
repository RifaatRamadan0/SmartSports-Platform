using System.ComponentModel.DataAnnotations;

namespace SmartSports.BLL.DTOs.Schedule
{
    public class UpsertScheduleRequest
    {
        [Required]
        [MinLength(7, ErrorMessage = "Schedule must contain 7 entries, one for each day of the week.")]
        [MaxLength(7, ErrorMessage = "Schedule must contain 7 entries, one for each day of the week.")]
        public List<DayScheduleEntry> Schedule { get; set; } = new();
    }

    public class DayScheduleEntry
    {
        [Required]
        [Range(0, 6, ErrorMessage = "DayOfWeek must be between 0 (Sunday) and 6 (Saturday).")]
        public int DayOfWeek { get; set; }
        public TimeOnly OpenTime { get; set; }
        public TimeOnly CloseTime { get; set; }
        public bool IsActive { get; set; }
    }
}