import api from '../api'

export async function listImages(pitchId) {
  const { data } = await api.get(`/api/pitches/mine/${pitchId}/images`)
  return data
}

export async function addImage(pitchId, { imageUrl, isCover = false }) {
  const { data } = await api.post(`/api/pitches/mine/${pitchId}/images`, { imageUrl, isCover })
  return data
}

export async function setCover(pitchId, imageId) {
  const { data } = await api.patch(`/api/pitches/mine/${pitchId}/images/${imageId}/cover`)
  return data
}

export async function deleteImage(pitchId, imageId) {
  await api.delete(`/api/pitches/mine/${pitchId}/images/${imageId}`)
}
