import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Spinner from '../Spinner'
import PageWrapper from './PageWrapper'

function PrivateRoute() {
  const { token, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <Spinner />

  if (!token) return <Navigate to="/login" state={{ from: location.pathname }} replace />

  return <PageWrapper><Outlet /></PageWrapper>
}

export default PrivateRoute
