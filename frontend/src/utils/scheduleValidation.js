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

    // Compare as strings — "HH:MM:SS" format sorts correctly lexicographically
    if (day.openTime >= day.closeTime) {
      errors.push(`${DAY_NAMES[day.dayOfWeek]}: Opening time must be earlier than closing time.`);
    }
  }

  return errors;
};