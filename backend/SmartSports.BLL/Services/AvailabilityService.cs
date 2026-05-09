using SmartSports.BLL.DTOs.Availability;
using SmartSports.BLL.Interfaces;
using SmartSports.DAL.Interfaces.Availability;
using SmartSports.Domain.Entities;
using SmartSports.Domain.Entities.Projections;


namespace SmartSports.BLL.Services
{
    /// <summary>
    /// Implements pitch availability logic.
    /// Generates 30-minute slots based on the pitch's weekly schedule,
    /// marks them available or unavailable based on existing bookings,
    /// and computes MaxConsecutiveSlots for duration options.
    /// </summary>
    public class AvailabilityService : IAvailabilityService
    {
        private readonly IAvailabilityRepository _availabilityRepository;

        private const int MaxDaysAhead = 30;

        private const int SlotDurationMinutes = 30;

        private const int MinBookingSlots = 2;

        public AvailabilityService(IAvailabilityRepository availabilityRepository)
        {
            _availabilityRepository = availabilityRepository;
        }

        /// <inheritdoc/>
        public async Task<IEnumerable<SlotResponse>> GetAvailableSlotsAsync(int pitchId, DateOnly date)
        {
            // Validation

            var today = DateOnly.FromDateTime(DateTime.Today);

            if (date < today)
                throw new ArgumentException("Date cannot be in the past.");

            if (date > today.AddDays(MaxDaysAhead))
                throw new ArgumentException($"Date cannot be more than {MaxDaysAhead} days ahead.");

            // Load Data

            var maxDurationMintues = await _availabilityRepository.GetMaxBookingDurationAsync(pitchId);

            if (maxDurationMintues is null)
                throw new KeyNotFoundException($"Pitch with ID {pitchId} was not found or is inactive");

            var schedule = await _availabilityRepository.GetScheduleForDayAsync(pitchId, date.DayOfWeek);

            if(schedule is null)
                return Enumerable.Empty<SlotResponse>();

            var bookings = (await _availabilityRepository.GetBookingsForDateAsync(pitchId, date)).ToList();

            // Slot Generation

            var slots = GenerateSlots(schedule, bookings, date, maxDurationMintues.Value);

            return slots;
        }

        // Private Helpers

        /// <summary>
        /// Generates all 30-minute slots between open and close time,
        /// marks each as available or unavailable,
        /// and computes MaxConsecutiveSlots for each available slot.
        /// </summary>
        private static List<SlotResponse> GenerateSlots(
            PitchWeeklySchedule schedule,
            List<BookedInterval> bookings,
            DateOnly date,
            int maxDurationMinutes)
        {
            var slots = new List<SlotResponse>();
            var current = schedule.OpenTime;
            var cutoff  = GetCutoffTime(date);

            while (current < schedule.CloseTime)
            {
                var slotEnd = current.AddMinutes(SlotDurationMinutes);
                if (slotEnd > schedule.CloseTime)
                    break;

                slots.Add(new SlotResponse
                {
                    StartTime           = current,
                    EndTime             = slotEnd,
                    IsAvailable         = false,
                    MaxConsecutiveSlots = 0
                });

                current = slotEnd;
            }

            // Pre-compute which slot indices are blocked by existing bookings.
            // This single O(n*m) pass replaces repeated bookings.Any() calls inside
            // the availability loop and the consecutive-slot scan, reducing total
            // work from O(n*m*maxSlots) to O(n*m + n*maxSlots).
            var blockedIndices = new HashSet<int>();
            for (int i = 0; i < slots.Count; i++)
            {
                var slot = slots[i];
                if (bookings.Any(b => b.StartTime < slot.EndTime && b.EndTime > slot.StartTime))
                    blockedIndices.Add(i);
            }

            // Mark Availability

            for (int i = 0; i < slots.Count; i++)
            {
                var slot = slots[i];

                // Hide past slots and slots within the buffer window
                if (cutoff.HasValue && slot.StartTime <= cutoff.Value)
                    continue;

                if (blockedIndices.Contains(i))
                    continue;

                slot.IsAvailable         = true;
                slot.MaxConsecutiveSlots = ComputeMaxConsecutiveSlots(
                    slots, blockedIndices, i, maxDurationMinutes, cutoff);
            }

            // Only return slots that have enough consecutive free slots for
            // at least the minimum booking duration (1 hour = 2 slots)
            return slots
                .Where(s => !s.IsAvailable || s.MaxConsecutiveSlots >= MinBookingSlots)
                .ToList();
        }

        /// <summary>
        /// Counts how many consecutive free slots exist starting from index i,
        /// capped by the pitch's max booking duration.
        /// Uses the pre-computed blockedIndices set for O(1) per-slot lookup.
        /// </summary>
        private static int ComputeMaxConsecutiveSlots(
            List<SlotResponse> slots,
            HashSet<int> blockedIndices,
            int startIndex,
            int maxDurationMinutes,
            TimeOnly? cutoff)
        {
            int maxSlots = maxDurationMinutes / SlotDurationMinutes;
            int count    = 0;

            for (int i = startIndex; i < slots.Count && count < maxSlots; i++)
            {
                if (cutoff.HasValue && slots[i].StartTime <= cutoff.Value)
                    break;

                if (blockedIndices.Contains(i))
                    break;

                count++;
            }
            return count;
        }

        /// <summary>
        /// Returns the cutoff time for today's date.
        /// Slots at or before this time are hidden.
        /// Returns null for future dates — no cutoff needed.
        /// </summary>
        private static TimeOnly? GetCutoffTime(DateOnly date)
        {
            var today = DateOnly.FromDateTime(DateTime.Today);

            if (date != today)
                return null;

            // No buffer — cutoff is exactly now.
            // Slots strictly after now are visible.
            return TimeOnly.FromDateTime(DateTime.Now);
        }
    }
}
