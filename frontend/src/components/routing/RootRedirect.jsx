import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getRoleHomePath } from '../../utils/roleUtils'
import Spinner from '../Spinner'

function RootRedirect() {
  const { token, roles, isLoading } = useAuth()

  if (isLoading) return <Spinner />

  return <Navigate to={token ? getRoleHomePath(roles) : '/login'} replace />
}

export default RootRedirect
