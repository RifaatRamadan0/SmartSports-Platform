import api from '../api'

export async function listPendingPitches(page = 1, pageSize = 20) {
  const { data } = await api.get('/api/admin/pitches', { params: { page, pageSize } })
  return data
}

export async function approvePitch(id) {
  await api.patch(`/api/admin/pitches/${id}/approve`)
}

export async function rejectPitch(id, reason) {
  await api.patch(`/api/admin/pitches/${id}/reject`, { reason: reason ?? null })
}
