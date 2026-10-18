import { ROLES } from '../constants/roles'
import { MODES } from '../constants/mode'
import { getActiveMode } from '../hooks/useActiveMode'

// Single source of truth for "where does this user land". For users holding
// both Player and PitchOwner, the active mode (player/owner) decides the home;
// every other combination keeps its prior priority (Admin → Owner → Player).
export function getRoleHomePath(roles = []) {
  const isPlayer = roles.includes(ROLES.PLAYER)
  const isOwner  = roles.includes(ROLES.PITCH_OWNER)
  const isAdmin  = roles.includes(ROLES.ADMIN)

  if (isPlayer && isOwner) {
    return getActiveMode() === MODES.OWNER ? '/dashboard/owner' : '/dashboard'
  }
  if (isAdmin)  return '/admin/pitches'
  if (isOwner)  return '/dashboard/owner'
  return '/dashboard'
}
