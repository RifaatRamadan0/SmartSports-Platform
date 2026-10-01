/**
 * Validates a 7-day schedule before sending to the API.
 * Returns an array of error strings.
 * Empty array means the schedule is valid.
 * @param {Array} schedule
 * @returns {string[]}
 */
import { DAY_NAMES_LONG } from '../constants'

export const validateSchedule = (schedule) => {
  const errors = [];
  const DAY_NAMES = DAY_NAMES_LONG;

  for (const day of schedule) {
    // Skip closed days — no time validation needed
    if (!day.isActive) continue;

    // Check for empty/missing times
    if (!day.openTime || !day.closeTime) {
      errors.push(`${DAY_NAMES[day.dayOfWeek]}: Open and close times are required.`);
      continue;
    }

    // Mirrors the API: slots are 30 minutes, so times must sit on :00 or :30
    const offGrid = (t) => !['00', '30'].includes(t.slice(3, 5));
    if (offGrid(day.openTime) || offGrid(day.closeTime)) {
      errors.push(`${DAY_NAMES[day.dayOfWeek]}: Times must be on the hour or half hour (e.g. 08:00, 22:30).`);
      continue;
    }

    // Compare as strings — "HH:MM:SS" format sorts correctly lexicographically
    if (day.openTime >= day.closeTime) {
      errors.push(`${DAY_NAMES[day.dayOfWeek]}: Opening time must be earlier than closing time.`);
    }
  }

  return errors;
};