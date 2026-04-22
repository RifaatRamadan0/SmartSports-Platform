import { createContext, useContext, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [roles, setRoles] = useState(() => {
    const stored = localStorage.getItem('roles')
    return stored ? JSON.parse(stored) : []
  })

  function login(response) {
    localStorage.setItem('token', response.accessToken)
    localStorage.setItem('roles', JSON.stringify(response.roles))
    setToken(response.accessToken)
    setRoles(response.roles)
  }

  async function logout() {
    try {
      await api.post('/api/auth/logout')
    } catch {
      // Proceed with client-side logout even if the server call fails
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('roles')
      setToken(null)
      setRoles([])
    }
  }

  return (
    <AuthContext.Provider value={{ token, roles, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
