import api from '../api'

// SPDBTCP-246 — flips a match between open (joinable + in public list) and private (invite-only).
// Backend enforces booking-owner-only authorization; 403 surfaces here unchanged.
export async function updateMatchVisibility(matchId, isOpenToJoin) {
  const { data } = await api.patch(`/api/matches/${matchId}/visibility`, { isOpenToJoin })
  return data
}

// Returns aggregate stats for open matches: counts, min price, sport/city breakdowns.
export async function getMatchStats() {
  const { data } = await api.get('/api/matches/stats')
  return data
}

// Returns a paginated list of open matches. sport and city are optional filters.
export async function listOpenMatches({ sport, city, page = 1, pageSize = 10 } = {}) {
  const params = { page, pageSize }
  if (sport) params.sport = sport
  if (city)  params.city  = city
  const { data } = await api.get('/api/matches/open', { params })
  return data
}

// Sends a join request for the current player. Returns MatchParticipantResponse (status='pending').
export async function joinMatch(matchId) {
  const { data } = await api.post(`/api/matches/${matchId}/join`)
  return data
}

// Returns the current player's participant record for a match, or null if not a participant.
export async function getMyMatchStatus(matchId) {
  try {
    const { data } = await api.get(`/api/matches/${matchId}/my-status`)
    return data
  } catch (err) {
    if (err.response?.status === 404) return null
    throw err
  }
}

// Removes the current player from the match.
export async function leaveMatch(matchId) {
  await api.delete(`/api/matches/${matchId}/leave`)
}
