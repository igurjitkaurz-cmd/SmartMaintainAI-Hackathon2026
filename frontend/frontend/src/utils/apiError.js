/**
 * Extracts a user-friendly error message from an Axios error or generic error object
 * Formatted specifically for FastAPI error conventions (string details, Pydantic arrays)
 *
 * @param {any} error - The caught Axios or runtime error
 * @param {string} fallback - Fallback message if extraction fails
 * @returns {string} Human-readable error message
 */
export const getApiErrorMessage = (error, fallback = 'An unexpected server error occurred.') => {
  if (!error) return fallback

  // 1. Check for request timeout (ECONNABORTED or timeout in message)
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return 'The request timed out. The CNCGuard backend server took too long to respond.'
  }

  // 2. Check for network failure (backend server unreachable / CORS / offline)
  const envBaseUrl =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
    'http://127.0.0.1:5000'

  if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
    return `Unable to reach the SmartMaintainAI backend server. Please verify the Flask service is running at ${envBaseUrl}.`
  }

  // 3. Inspect Axios response payload
  const response = error.response
  if (response) {
    const data = response.data
    const status = response.status

    if (data) {
      // 3.1 FastAPI string detail (e.g. { detail: "Machine not found" })
      if (typeof data.detail === 'string' && data.detail.trim().length > 0) {
        return data.detail
      }

      // 3.2 FastAPI Pydantic validation errors array (HTTP 422)
      // e.g. { detail: [{ loc: ['body', 'spindle_speed'], msg: 'field required' }] }
      if (Array.isArray(data.detail) && data.detail.length > 0) {
        return data.detail
          .map((item) => {
            const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : item.loc
            return field ? `${field}: ${item.msg}` : item.msg
          })
          .filter(Boolean)
          .join(', ')
      }

      // 3.3 General message or title fields in response
      if (typeof data.message === 'string' && data.message.trim().length > 0) {
        return data.message
      }
      if (typeof data.error === 'string' && data.error.trim().length > 0) {
        return data.error
      }
    }

    // 3.4 Fallback based on HTTP status code if body does not contain details
    switch (status) {
      case 400:
        return 'Bad request. Please verify the submitted telemetry or machine parameters.'
      case 401:
        return 'Unauthorized access. Authentication is required to view this resource.'
      case 403:
        return 'Forbidden. You do not have permission to perform this machine operation.'
      case 404:
        return 'The requested SmartMaintainAI endpoint or machine resource was not found (404).'
      case 409:
        return 'A data conflict occurred on the server.'
      case 422:
        return 'Validation error. Please verify input data types and values.'
      case 500:
        return 'Internal server error. The backend encountered an unexpected condition.'
      case 502:
      case 503:
      case 504:
        return 'SmartMaintainAI backend service is temporarily unavailable or restarting.'
      default:
        break
    }
  }

  // 4. Standard error message
  if (typeof error.message === 'string' && error.message.trim().length > 0) {
    return error.message
  }

  return fallback
}

/**
 * Extracts structured validation errors from FastAPI 422 response
 * @param {any} error
 * @returns {Record<string, string>} Map of field name to error message
 */
export const getValidationErrors = (error) => {
  const result = {}
  const details = error?.response?.data?.detail
  if (Array.isArray(details)) {
    details.forEach((item) => {
      if (item && item.loc && item.msg) {
        const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : item.loc
        if (field) {
          result[field] = item.msg
        }
      }
    })
  }
  return result
}

export default {
  getApiErrorMessage,
  getValidationErrors,
}

