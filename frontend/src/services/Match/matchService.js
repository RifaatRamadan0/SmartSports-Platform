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

// Returns aggregate stats for the open games page.
export async function getMatchStats() {
  const { data } = await api.get('/api/matches/stats')
  return data
}
