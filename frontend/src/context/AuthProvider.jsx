import { useState, useEffect } from 'react'
import { AuthContext } from './AuthContext'
import api, { setAccessToken } from '../services/api'
import { refreshSession } from '../services/authInterceptor'

function parseUserId(accessToken) {
  try {
    const payload = accessToken.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return parseInt(JSON.parse(json).sub, 10) || null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [roles, setRoles] = useState([])
  const [userId, setUserId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // on mount: restore session from httpOnly cookie
  // refreshSession() owns setAccessToken + draining the failed-request queue;
  // we only mirror the token/roles into React state here.
  useEffect(() => {
    async function restoreSession() {
      try {
        const { data } = await refreshSession()
        setToken(data.accessToken)
        setRoles(data.roles ?? [])
        setUserId(parseUserId(data.accessToken))
      } catch {
        setAccessToken(null)
      } finally {
        setIsLoading(false)
      }
    }
    restoreSession()
  }, [])

  // called after successful login api response to save token and roles
  function login(response) {
    setAccessToken(response.accessToken)
    setToken(response.accessToken)
    setRoles(response.roles ?? [])
    setUserId(parseUserId(response.accessToken))
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
      setUserId(null)
    }
  }

  return (
    <AuthContext.Provider value={{ token, roles, userId, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}
