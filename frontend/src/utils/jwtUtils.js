// Extracts the `nameid` / `sub` claim from a JWT without verification.
// This is purely for client-side UX decisions (e.g. "show the owner-only toggle").
// All authorization remains server-enforced — the API rejects unauthorized requests
// regardless of what the client believes.
export function getUserIdFromToken(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const base64Url = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64Url + '==='.slice(0, (4 - (base64Url.length % 4)) % 4)
    const payload = JSON.parse(atob(padded))
    const raw = payload.nameid ?? payload.sub ?? payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']
    const id = Number(raw)
    return Number.isFinite(id) ? id : null
  } catch {
    return null
  }
}
