import api from '../api'

export async function getPitchById(id) {
  const { data } = await api.get(`/api/pitches/${id}`)
  return data
}

export async function listPitches({
  search   = '',
  sport    = '',
  city     = '',
  maxPrice = '',
  sortBy   = '',
  date     = '',
  page     = 1,
  pageSize = 12,
} = {}) {
  const params = { page, pageSize }
  if (search)                       params.search   = search
  if (sport && sport !== 'All')     params.sport    = sport
  if (city)                         params.city     = city
  if (maxPrice && Number(maxPrice) > 0) params.maxPrice = maxPrice
  if (sortBy && sortBy !== 'newest')    params.sortBy   = sortBy
  if (date)                         params.date     = date
  const { data } = await api.get('/api/pitches', { params })
  return data
}

export async function listMyPitches({ page = 1, pageSize = 100 } = {}) {
  const { data } = await api.get('/api/pitches/mine', { params: { page, pageSize } })
  return data
}

export async function getMyPitchById(id) {
  const { data } = await api.get(`/api/pitches/mine/${id}`)
  return data
}

export async function createPitch(payload) {
  const { data } = await api.post('/api/pitches', payload)
  return data
}

export async function updatePitch(id, payload) {
  const { data } = await api.put(`/api/pitches/${id}`, payload)
  return data
}

export async function deletePitch(id) {
  await api.delete(`/api/pitches/${id}`)
}

// Toggles the favorite for the current player and returns the new state (boolean).
export async function toggleFavorite(id) {
  const { data } = await api.post(`/api/pitches/${id}/favorite`)
  return data.isFavorited
}

// Returns the current player's saved pitches as a paged result.
export async function listFavorites({ page = 1, pageSize = 12 } = {}) {
  const { data } = await api.get('/api/users/me/favorites', { params: { page, pageSize } })
  return data
}
