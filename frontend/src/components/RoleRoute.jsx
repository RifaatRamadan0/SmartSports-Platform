import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

function RoleRoute({ allowedRoles = [] }) {
  const { token, roles, isLoading } = useAuth()

  if (isLoading) return (
    <div role="status" aria-live="polite" className="flex items-center justify-center min-h-screen">
      <div aria-hidden="true" className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <span className="sr-only">Loading...</span>
    </div>
  )

  if (!token) return <Navigate to="/login" replace />

  if (!allowedRoles.some(r => roles.includes(r)))
    return <Navigate to="/forbidden" replace />

  return <Outlet />
}

export default RoleRoute
