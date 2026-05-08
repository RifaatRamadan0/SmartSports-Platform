import api from '../api'

export async function getPitchById(id) {
  const { data } = await api.get(`/api/pitches/${id}`)
  return data
}
