import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Spinner from '../Spinner'
import PageWrapper from './PageWrapper'

function PrivateRoute() {
  const { token, isLoading } = useAuth()

  if (isLoading) return <Spinner />

  if (!token) return <Navigate to="/login" replace />

  return <PageWrapper><Outlet /></PageWrapper>
}

export default PrivateRoute
