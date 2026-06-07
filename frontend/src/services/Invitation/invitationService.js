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

// SPDBTCP-83 — Inbox: list pending invitations addressed to the current player.
export async function getMyPendingInvitations() {
  const { data } = await api.get('/api/invitations/me')
  return data
}

// SPDBTCP-83 — Accept a pending invitation. Server auto-joins the player to the match.
export async function acceptInvitation(invitationId) {
  await api.put(`/api/invitations/${invitationId}/accept`)
}

// SPDBTCP-83 — Decline a pending invitation.
export async function declineInvitation(invitationId) {
  await api.put(`/api/invitations/${invitationId}/decline`)
}
