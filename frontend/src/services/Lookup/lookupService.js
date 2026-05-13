import api from '../api'

export async function listCities() {
  const { data } = await api.get('/api/lookups/cities')
  return data
}

export async function listSportTypes() {
  const { data } = await api.get('/api/lookups/sport-types')
  return data
}
