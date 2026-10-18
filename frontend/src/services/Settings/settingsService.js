import api from '../api'

export async function requestPitchOwnerRole() {
  await api.post('/api/roles/request', { requestedRole: 'PitchOwner' })
}

export async function addPlayerRoleInstantly() {
  await api.post('/api/roles/add-player')
}

export async function getMyRoleRequests() {
  const { data } = await api.get('/api/roles/my-requests')
  return data
}
