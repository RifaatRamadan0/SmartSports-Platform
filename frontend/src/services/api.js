import axios from 'axios'

let accessToken = null

// in-memory token store
export const setAccessToken = (token) => {
  accessToken = token
}

// Create an Axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor — attaches JWT token to every request automatically
api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Auth endpoints whose 401s represent a real failure, not an expired access token.
// These must never trigger the refresh-and-retry flow.
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
// This prevents React StrictMode's double-invoke from sending two refresh
// requests and racing against a rotated token.
let refreshPromise = null

export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = api.post('/api/auth/refresh').finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

// Response interceptor — silent refresh on 401
let failedQueue = []

function processQueue(error, token = null) {
  failedQueue.forEach((prom) => { error ? prom.reject(error) : prom.resolve(token) })
  failedQueue = []
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
      // Refresh already in flight — queue this request to retry once it resolves
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
      setAccessToken(data.accessToken)
      processQueue(null, data.accessToken)
      originalRequest.headers['Authorization'] = 'Bearer ' + data.accessToken
      return api(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      setAccessToken(null)
      window.location.href = '/login'
      return Promise.reject(refreshError)
    }
  }
)

export const sendPhoneOtp = (phoneNumber) =>
  api.post('/api/auth/phone/send-otp', { phoneNumber })

export const verifyPhoneOtp = (phoneNumber, code) =>
  api.post('/api/auth/phone/verify-otp', { phoneNumber, code })

export default api