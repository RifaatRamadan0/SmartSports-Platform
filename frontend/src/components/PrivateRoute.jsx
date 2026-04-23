import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

function PrivateRoute() {
  const { token, isLoading } = useAuth()

  // Wait for silent refresh to finish before deciding — prevents flash-redirect
  if (isLoading) return null

  if (!token) return <Navigate to="/login" replace />

  return <Outlet />
}

export default PrivateRoute
