import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Spinner from '../Spinner'
import PageWrapper from './PageWrapper'

function PrivateRoute() {
  const { token, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <Spinner />

  if (!token) {
    const from = location.pathname + location.search + location.hash
    return <Navigate to="/login" state={{ from }} replace />
  }

  return <PageWrapper><Outlet /></PageWrapper>
}

export default PrivateRoute
