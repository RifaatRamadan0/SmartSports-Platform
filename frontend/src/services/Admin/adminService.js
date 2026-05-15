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

export async function listPendingRoleRequests(page = 1, pageSize = 15) {
  const { data } = await api.get('/api/admin/role-requests', { params: { page, pageSize } })
  return data
}

export async function approveRoleRequest(id) {
  await api.patch(`/api/admin/role-requests/${id}/approve`)
}

export async function rejectRoleRequest(id, reason) {
  await api.patch(`/api/admin/role-requests/${id}/reject`, { reason: reason ?? null })
}
