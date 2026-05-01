using SmartSports.BLL.DTOs.Availability;

namespace SmartSports.BLL.Interfaces;

public interface IAvailabilityService
{
    /// <summary>
    /// Returns all 30-minute slots for a pitch on a given date.
    /// - Empty list if pitch doesn't exist, is inactive, or is closed that day.
    /// - Slots in the past (before now) are excluded.
    /// - Each available slot includes MaxConsecutiveSlots for duration options.
    /// - Validation: date cannot be in the past, max 30 days ahead.
    /// </summary>
    Task<IEnumerable<SlotResponse>> GetAvailableSlotsAsync(int pitchId, DateOnly date);
}