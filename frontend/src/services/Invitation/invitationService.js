import api from "../api";

// SPDBTCP-76 — POST /api/matches/{matchId}/invitations
export async function inviteByUsername(matchId, username) {
  const { data } = await api.post(`/api/matches/${matchId}/invitations`, {
    username,
  });
  return data;
}
