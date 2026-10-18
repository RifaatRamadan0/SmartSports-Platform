import api from '../api'

export async function listAdminUsers(page = 1, pageSize = 20, role = null, isBanned = null) {
  const params = { page, pageSize }
  if (role !== null) params.role = role
  if (isBanned !== null) params.isBanned = isBanned
  const { data } = await api.get('/api/admin/users', { params })
  return data
}

export async function getAdminUser(id) {
  const { data } = await api.get(`/api/admin/users/${id}`)
  return data
}

export async function banUser(id) {
  await api.patch(`/api/admin/users/${id}/ban`)
}

export async function unbanUser(id) {
  await api.patch(`/api/admin/users/${id}/unban`)
}

export async function deleteUser(id) {
  await api.delete(`/api/admin/users/${id}`)
}
