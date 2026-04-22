import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function RoleRoute({ allowedRoles = [] }) {
  const { token, roles } = useAuth()

  if (!token) return <Navigate to="/login" replace />

  if (!allowedRoles.some(r => roles.includes(r)))
    return <Navigate to="/forbidden" replace />

  return <Outlet />
}

export default RoleRoute
