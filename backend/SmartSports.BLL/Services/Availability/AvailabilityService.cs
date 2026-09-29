using SmartSports.BLL.DTOs.Availability;
using SmartSports.BLL.Interfaces.Availability;
using SmartSports.DAL.Interfaces.Availability;
using SmartSports.Domain.Common;
using SmartSports.Domain.Entities.Projections;


namespace SmartSports.BLL.Services.Availability
{
    // Imported inside the namespace so entity types resolve before the sibling
    // SmartSports.BLL.Services.* namespaces that share their names.
    using SmartSports.Domain.Entities;

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

            var today = PitchTime.Today;

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
            var slots    = new List<SlotResponse>();
            var current  = schedule.OpenTime;
            var cutoff   = GetCutoffTime(date);
            var maxSlots = maxDurationMinutes / SlotDurationMinutes;

            // Generate the slots, deciding availability as each one is created.
            while (current < schedule.CloseTime)
            {
                var slotEnd = current.AddMinutes(SlotDurationMinutes);
                if (slotEnd > schedule.CloseTime)
                    break;

                var isBooked = bookings.Any(b => b.StartTime < slotEnd && b.EndTime > current);

                // Past slots and slots inside the buffer window are not bookable.
                var isPast = cutoff.HasValue && current <= cutoff.Value;

                slots.Add(new SlotResponse
                {
                    StartTime           = current,
                    EndTime             = slotEnd,
                    IsAvailable         = !isBooked && !isPast,
                    MaxConsecutiveSlots = 0
                });

                current = slotEnd;
            }

            // For each available slot, count how many available slots run forward
            // from it, capped by the pitch's max booking duration.
            for (int i = 0; i < slots.Count; i++)
            {
                if (!slots[i].IsAvailable)
                    continue;

                int count = 0;

                for (int j = i; j < slots.Count && count < maxSlots; j++)
                {
                    if (!slots[j].IsAvailable)
                        break;

                    count++;
                }

                slots[i].MaxConsecutiveSlots = count;
            }

            // Only return slots that have enough consecutive free slots for
            // at least the minimum booking duration (1 hour = 2 slots)
            return slots
                .Where(s => !s.IsAvailable || s.MaxConsecutiveSlots >= MinBookingSlots)
                .ToList();
        }

        /// <summary>
        /// Returns the cutoff time for today's date.
        /// Slots at or before this time are hidden.
        /// Returns null for future dates — no cutoff needed.
        /// </summary>
        private static TimeOnly? GetCutoffTime(DateOnly date)
        {
            var today = PitchTime.Today;

            if (date != today)
                return null;

            // No buffer — cutoff is exactly now.
            // Slots strictly after now are visible.
            return TimeOnly.FromDateTime(PitchTime.Now);
        }
    }
}
