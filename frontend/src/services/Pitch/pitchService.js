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

export async function listMyPitches() {
  const { data } = await api.get('/api/pitches/mine')
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
