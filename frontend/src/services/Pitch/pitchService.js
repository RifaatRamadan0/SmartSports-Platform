import api from '../api'

export async function getPitchById(id) {
  const { data } = await api.get(`/api/pitches/${id}`)
  return data
}

export async function listPitches({ sport, page = 1, pageSize = 12 } = {}) {
  const params = { page, pageSize }
  if (sport && sport !== 'All') params.sport = sport
  const { data } = await api.get('/api/pitches', { params })
  return data
}
