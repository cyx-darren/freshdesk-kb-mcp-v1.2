import axios from 'axios'

// Base configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333/api'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Get Supabase token from localStorage
    const supabaseSession = localStorage.getItem('sb-vcpwtrdrahsghenmgtgy-auth-token')
    
    if (supabaseSession) {
      try {
        const session = JSON.parse(supabaseSession)
        const token = session?.access_token
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
      } catch (error) {
        console.warn('Failed to parse Supabase session:', error)
      }
    }
    
    // Add request timestamp for debugging
    config.metadata = { startTime: Date.now() }
    
    return config
  },
  (error) => {
    console.error('Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for error handling and logging
api.interceptors.response.use(
  (response) => {
    // Calculate request duration
    const duration = Date.now() - response.config.metadata.startTime
    console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status} (${duration}ms)`)
    
    return response
  },
  (error) => {
    // Calculate request duration if available
    const duration = error.config?.metadata?.startTime 
      ? Date.now() - error.config.metadata.startTime 
      : 0
    
    const status = error.response?.status
    const method = error.config?.method?.toUpperCase()
    const url = error.config?.url
    
    console.error(`❌ ${method} ${url} - ${status} (${duration}ms)`, {
      message: error.message,
      data: error.response?.data
    })
    
    // Handle different error scenarios
    if (status === 401) {
      console.warn('Unauthorized request - clearing session')
      localStorage.removeItem('sb-vcpwtrdrahsghenmgtgy-auth-token')
      // Don't auto-redirect here, let the Supabase context handle it
    } else if (status === 403) {
      console.warn('Forbidden request - insufficient permissions')
    } else if (status >= 500) {
      console.error('Server error - please try again later')
    } else if (error.code === 'ECONNABORTED') {
      console.error('Request timeout - server took too long to respond')
    } else if (!error.response) {
      console.error('Network error - check your connection')
    }
    
    return Promise.reject(error)
  }
)

// Helper function to create standardized API responses
export const createApiResponse = (success, data = null, error = null, message = null) => ({
  success,
  data,
  error,
  message,
  timestamp: new Date().toISOString()
})

// Helper function to handle API calls with consistent error handling
export const handleApiCall = async (apiCall, errorContext = 'API call') => {
  try {
    const response = await apiCall()
    return createApiResponse(true, response.data, null, 'Success')
  } catch (error) {
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        error.message || 
                        `${errorContext} failed`
    
    console.error(`${errorContext} error:`, error)
    
    return createApiResponse(false, null, errorMessage, errorMessage)
  }
}

// Helper function to build query parameters
export const buildQueryParams = (params) => {
  const cleanParams = {}
  
  Object.keys(params).forEach(key => {
    const value = params[key]
    if (value !== null && value !== undefined && value !== '') {
      cleanParams[key] = value
    }
  })
  
  return cleanParams
}

export default api 