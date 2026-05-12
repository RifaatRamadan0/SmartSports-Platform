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
  page     = 1,
  pageSize = 12,
} = {}) {
  const params = { page, pageSize }
  if (search)                       params.search   = search
  if (sport && sport !== 'All')     params.sport    = sport
  if (city)                         params.city     = city
  if (maxPrice && Number(maxPrice) > 0) params.maxPrice = maxPrice
  if (sortBy && sortBy !== 'newest')    params.sortBy   = sortBy
  const { data } = await api.get('/api/pitches', { params })
  return data
}
