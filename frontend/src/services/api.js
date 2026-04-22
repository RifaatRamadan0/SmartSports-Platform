import axios from 'axios'

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
    // Get token from localStorage if it exists
    const token = localStorage.getItem('token')
    if (token) {
      // Add it to the Authorization header
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — handles token expiry globally
api.interceptors.response.use(
  // If response is successful just return it
  (response) => response,
  (error) => {
    // If server returns 401 (Unauthorized) token has expired
    if (error.response?.status === 401) {
      // Clear the stored token
      localStorage.removeItem('token')
      // Redirect to login page
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api