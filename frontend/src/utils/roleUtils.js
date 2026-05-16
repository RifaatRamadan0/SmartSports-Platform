import { ROLES } from '../constants/roles'

export function getRoleHomePath(roles = []) {
  if (roles.includes(ROLES.ADMIN))       return '/admin/pitches'
  if (roles.includes(ROLES.PITCH_OWNER)) return '/dashboard/owner'
  return '/dashboard'
}
