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
  await api.patch('/api/users/me/password', payload)
}

export async function sendPhoneVerification() {
  await api.post('/api/users/me/phone/send-verification')
}

export async function verifyPhone(code) {
  await api.post('/api/users/me/phone/verify', { code })
}
