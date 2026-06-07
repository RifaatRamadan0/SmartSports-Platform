import axios from 'axios'

let accessToken = null

export const setAccessToken = (token) => {
  accessToken = token
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attaches JWT token to every request
api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

export const sendPhoneOtp = (phoneNumber) =>
  api.post('/api/auth/phone/send-otp', { phoneNumber })

export const verifyPhoneOtp = (phoneNumber, code) =>
  api.post('/api/auth/phone/verify-otp', { phoneNumber, code })

export default api
