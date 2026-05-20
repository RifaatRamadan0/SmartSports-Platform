import api from '../api'

export async function generateInviteLink(matchId) {
  const { data } = await api.post(`/api/matches/${matchId}/invite-link`)
  return data // { token, shareUrl }
}

export async function getJoinPreview(token) {
  const { data } = await api.get(`/api/join/${token}`)
  return data
}

export async function joinViaToken(token) {
  await api.post(`/api/join/${token}`)
}

// SPDBTCP-76 — POST /api/matches/{matchId}/invitations
export async function inviteByUsername(matchId, username) {
  const { data } = await api.post(`/api/matches/${matchId}/invitations`, {
    username,
  })
  return data
}
