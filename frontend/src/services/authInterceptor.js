import api, { setAccessToken } from './api'

const authEndpointsSkipRefresh = [
  '/api/auth/refresh',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
  '/api/auth/resend-verification',
]

// Shared refresh gate — one in-flight refresh at a time, shared between
// AuthProvider (restoreSession on mount) and the 401 interceptor.
// Prevents React StrictMode's double-invoke from racing a rotated token.
let refreshPromise = null
let failedQueue = []

function processQueue(error, token = null) {
  failedQueue.forEach((prom) => { error ? prom.reject(error) : prom.resolve(token) })
  failedQueue = []
}

export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = api.post('/api/auth/refresh')
      .then((response) => {
        setAccessToken(response.data.accessToken)
        processQueue(null, response.data.accessToken)
        return response
      })
      .catch((err) => {
        processQueue(err, null)
        throw err
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      authEndpointsSkipRefresh.some(path => originalRequest.url?.includes(path))
    ) {
      return Promise.reject(error)
    }

    if (refreshPromise) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
        .then((token) => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token
          return api(originalRequest)
        })
        .catch((err) => Promise.reject(err))
    }

    originalRequest._retry = true

    try {
      const { data } = await refreshSession()
      originalRequest.headers['Authorization'] = 'Bearer ' + data.accessToken
      return api(originalRequest)
    } catch (refreshError) {
      setAccessToken(null)
      window.location.href = '/login'
      return Promise.reject(refreshError)
    }
  }
)
