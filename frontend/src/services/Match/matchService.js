import api from '../api'

// SPDBTCP-246 — flips a match between open (joinable + in public list) and private (invite-only).
// Backend enforces booking-owner-only authorization; 403 surfaces here unchanged.
export async function updateMatchVisibility(matchId, isOpenToJoin) {
  const { data } = await api.patch(`/api/matches/${matchId}/visibility`, { isOpenToJoin })
  return data
}
