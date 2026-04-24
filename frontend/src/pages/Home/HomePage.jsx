import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

function HomePage() {
  const { logout, roles } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-3xl font-bold">SmartSports</h1>
      <p className="text-sm text-gray-500">
        Roles: {roles.length ? roles.join(', ') : 'None'}
      </p>
      <button
        onClick={handleLogout}
        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
      >
        Logout
      </button>
    </div>
  )
}

export default HomePage