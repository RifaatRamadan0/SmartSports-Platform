import { useState, useEffect } from 'react'
import { AuthContext } from './AuthContext'
import api, { setAccessToken } from '../services/api'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [roles, setRoles] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // on mount: restore session from httpOnly cookie
  useEffect(() => {
    async function restoreSession() {
      try {
        const data = await api.get('/api/auth/refresh')
        setAccessToken(data.accessToken)
        setToken(data.accessToken)
        setRoles(data.roles ?? [])
      } catch {
        // no valid refresh token, user is not logged in
        setAccessToken(null)
      } finally {
        setIsLoading(false) // unblock the UI
      }
    }
    restoreSession()
  }, [])

  // called after successful login api response to save token and roles
  function login(response) {
    setAccessToken(response.accessToken)
    setToken(response.accessToken)
    setRoles(response.roles ?? [])
  }

  // clear everything, server revoke token and cookie
  async function logout() {
    try {
      await api.post('/api/auth/logout')
    } catch {
      // Proceed with client-side logout even if the server call fails
    } finally {
      setAccessToken(null)
      setToken(null)
      setRoles([])
    }
  }

  return (
    <AuthContext.Provider value={{ token, roles, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}
