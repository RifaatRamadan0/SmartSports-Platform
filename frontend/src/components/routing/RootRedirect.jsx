import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Spinner from '../Spinner'

function RootRedirect() {
  const { token, isLoading } = useAuth()

  if (isLoading) return <Spinner />

  return <Navigate to={token ? '/dashboard' : '/login'} replace />
}

export default RootRedirect
