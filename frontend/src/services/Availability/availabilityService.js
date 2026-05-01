import api from '../api';

/**
 * Fetches all available 30-minute slots for a pitch on a given date.
 * Public endpoint — no auth required.
 * @param {number} pitchId
 * @param {string} date - format YYYY-MM-DD
 * @returns {Promise<SlotResponse[]>}
 */
export const getAvailableSlots = async (pitchId, date) => {
  const response = await api.get(`/api/pitches/${pitchId}/availability`, {
    params: { date }
  });
  return response.data;
};