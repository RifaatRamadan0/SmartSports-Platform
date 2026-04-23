import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

function RoleRoute({ allowedRoles = [] }) {
  const { token, roles, isLoading } = useAuth()

  if (isLoading) return null

  if (!token) return <Navigate to="/login" replace />

  if (!allowedRoles.some(r => roles.includes(r)))
    return <Navigate to="/forbidden" replace />

  return <Outlet />
}

export default RoleRoute
