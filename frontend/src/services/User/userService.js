import api from '../api'

export async function getMyProfile() {
  const { data } = await api.get('/api/users/me')
  return data
}

export async function updateMyProfile(payload) {
  const { data } = await api.put('/api/users/me', payload)
  return data
}

export async function changeMyPassword(payload) {
  // Returns a fresh { accessToken, expiresIn, roles } so the current device stays
  // signed in after the server revokes every other session.
  const { data } = await api.patch('/api/users/me/password', payload)
  return data
}

export async function sendPhoneVerification() {
  await api.post('/api/users/me/phone/send-verification')
}

export async function verifyPhone(code) {
  await api.post('/api/users/me/phone/verify', { code })
}

export async function deleteMyAccount(currentPassword) {
  await api.delete('/api/users/me', { data: { currentPassword } })
}
