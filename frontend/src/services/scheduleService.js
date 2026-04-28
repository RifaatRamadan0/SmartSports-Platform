import api from "./api";

export const getSchedule = async (pitchId) => {
  const response = await api.get(`/api/pitches/${pitchId}/schedule`);
  return response.data;
};

export const upsertSchedule = async (pitchId, scheduleData) => {
  await api.put(`/api/pitches/${pitchId}/schedule`, { schedule: scheduleData });
};