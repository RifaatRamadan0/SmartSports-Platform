import api from '../api'

export async function getSportTypes() {
  const { data } = await api.get('/api/sport-types')
  return data
}

export async function getCities() {
  const { data } = await api.get('/api/cities')
  return data
}
