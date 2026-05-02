
namespace SmartSports.BLL.DTOs.Availability
{
    public class SlotResponse
    {
        public TimeOnly StartTime { get; set; }
        public TimeOnly EndTime { get; set; }
        public bool IsAvailable { get; set; }

        /// <summary>
        /// Number of consecutive free slots from this point.
        /// Capped by pitch.max_booking_duration_minutes / 30.
        /// Always 0 when IsAvailable is false.
        /// Frontend maps this to duration options (1h, 1.5h, 2h etc.)
        /// </summary>
        public int MaxConsecutiveSlots { get; set; }
    }
}
