import axios from 'axios'

let accessToken = null

// in-memory token token store
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

// Response interceptor — silent refresh on 401
let isRefreshing = false
let failedQueue = [] // requests that failed while token is being refreshed

function processQueue(error, token = null) {
  failedQueue.forEach((prom) => {error ? prom.reject(error) : prom.resolve(token)})
  failedQueue = []
}

api.interceptors.response.use(
  // If response is successful just return it
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // only attempt refresh if we get 401 and we haven't already tried to refresh for this request
    if(error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    if(isRefreshing) {
      // another request is already refreshing the token, queue this one up to retry once it's done
      return new Promise((resolve, reject) => {
        failedQueue.push({resolve, reject})
      })
      .then((token) => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token
        return api(originalRequest)
      })
      .catch((err) => Promise.reject(err))
    }

    originalRequest._retry = true
    isRefreshing = true

    try{
      const { data } = await api.post('/api/auth/refresh')
      setAccessToken(data.accessToken)
      processQueue(null, data.accessToken)
      originalRequest.headers['Authorization'] = 'Bearer ' + data.accessToken
      return api(originalRequest) // retry the original request with new token
    }catch (refreshError) {
      processQueue(refreshError, null)
      setAccessToken(null) // clear token on refresh failure
      window.location.href = '/login' // refresh token also expired, force user to login again
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export default api