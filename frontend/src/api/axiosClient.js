import axios from 'axios'
import { getApiErrorMessage, getValidationErrors } from '../utils/apiError.js'

/**
 * SmartMaintainAI — Dynamic Base URL Determination
 * When running in the browser, aligns backend host with current window.location.hostname
 * so that both frontend and backend use 'localhost' (or both use '127.0.0.1').
 * This ensures cookies are treated as same-site and never blocked by browser policies.
 */
export const getBaseURL = () => {
  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || ''
  if (typeof window !== 'undefined' && window.location) {
    const currentHost = window.location.hostname
    if (currentHost === 'localhost') {
      return 'http://localhost:5000'
    } else if (currentHost === '127.0.0.1') {
      return 'http://127.0.0.1:5000'
    }
  }
  return envUrl || 'http://localhost:5000'
}

export const axiosClient = axios.create({
  baseURL: getBaseURL(),
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

/**
 * Health check helper to verify Flask connectivity and ML model status
 * @returns {Promise<{ status: string, model_loaded: boolean, service: string, model_type: string }>}
 */
export const checkHealth = async () => {
  const response = await axiosClient.get('/api/health')
  return response.data
}

/**
 * Request Interceptor
 * 1. Synchronizes host alignment so requests never cross between localhost and 127.0.0.1
 * 2. Attaches Authorization Bearer token, X-Auth-Token, and X-User-Id headers for authentication
 */
axiosClient.interceptors.request.use(
  (config) => {
    // Dynamic host alignment
    if (typeof window !== 'undefined' && window.location) {
      const currentHost = window.location.hostname
      if (currentHost === 'localhost' && config.baseURL?.includes('127.0.0.1:5000')) {
        config.baseURL = 'http://localhost:5000'
      } else if (currentHost === '127.0.0.1' && config.baseURL?.includes('localhost:5000')) {
        config.baseURL = 'http://127.0.0.1:5000'
      }
    }

    try {
      // 1. Attach signed token if available
      const token = localStorage.getItem('smartmaintain_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
        config.headers['X-Auth-Token'] = token
      }

      // 2. Attach authenticated user id header
      const storedUser = localStorage.getItem('smartmaintain_user')
      if (storedUser) {
        const parsed = JSON.parse(storedUser)
        if (parsed?.id) {
          config.headers['X-User-Id'] = String(parsed.id)
        }
      }
    } catch {
      // Ignore JSON parse errors
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

/**
 * Response Interceptor
 * Normalizes FastAPI responses and standardizes errors (400, 401, 403, 404, 422, 500, network/timeout).
 * Preserves backend validation details without exposing raw stack traces or auto-logging out on 401.
 */
axiosClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Extract human-readable error string and structured validation details
    const normalizedMessage = getApiErrorMessage(error)
    const validationErrors = getValidationErrors(error)

    // Augment error object with clean normalized properties
    error.normalizedMessage = normalizedMessage
    error.validationErrors = validationErrors

    return Promise.reject(error)
  }
)

export default axiosClient
