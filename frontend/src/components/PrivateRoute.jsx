import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function PrivateRoute() {
  const { token } = useAuth()

  if (!token) return <Navigate to="/login" replace />

  return <Outlet />
}

export default PrivateRoute
