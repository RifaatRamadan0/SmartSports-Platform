import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Spinner from '../Spinner'
import PageWrapper from './PageWrapper'

function RoleRoute({ allowedRoles = [] }) {
  const { token, roles, isLoading } = useAuth()

  if (isLoading) return <Spinner />

  if (!token) return <Navigate to="/login" replace />

  if (!allowedRoles.some(r => roles.includes(r)))
    return <Navigate to="/forbidden" replace />

  return <PageWrapper><Outlet /></PageWrapper>
}

export default RoleRoute
