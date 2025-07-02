import axios from 'axios'

// Get base URL from environment variable or fallback to localhost
const BASE_URL = import.meta.env.VITE_API_URL || 
                 import.meta.env.VITE_REACT_APP_API_URL || 
                 import.meta.env.VITE_API_BASE_URL || 
                 'http://localhost:3333'

// Debug environment variables
console.log('=== API Service Environment Debug ===')
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL)
console.log('VITE_REACT_APP_API_URL:', import.meta.env.VITE_REACT_APP_API_URL)
console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL)
console.log('MODE:', import.meta.env.MODE)
console.log('PROD:', import.meta.env.PROD)
console.log('DEV:', import.meta.env.DEV)
console.log('Final BASE_URL:', BASE_URL)
console.log('=== End API Debug ===')

// Add production warning
if (import.meta.env.PROD && BASE_URL.includes('localhost')) {
  console.error('🚨 PRODUCTION ERROR: Still using localhost backend URL!', BASE_URL)
  console.error('Expected production URL should be: https://backend-production-5f2c.up.railway.app')
}

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
})

// Auth token management
let currentUser = null
let navigate = null // Will be set by the auth context

// Set navigation function for redirects
export const setNavigationFunction = (navigateFunction) => {
  navigate = navigateFunction
}

// Set current user for token access
export const setCurrentUser = (user) => {
  currentUser = user
}

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    if (currentUser?.access_token) {
      config.headers.Authorization = `Bearer ${currentUser.access_token}`
      
      // Log token info in development (but not the full token for security)
      if (import.meta.env.DEV) {
        const tokenStart = currentUser.access_token.substring(0, 20)
        console.log(`🔐 API Request with token: ${tokenStart}...`)
      }
    } else {
      console.warn('⚠️ API Request without token - user may not be authenticated')
    }
    
    // Log request in development
    if (import.meta.env.DEV) {
      console.log(`📡 API Request: ${config.method?.toUpperCase()} ${config.url}`)
    }
    
    return config
  },
  (error) => {
    console.error('Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // Log successful response in development
    if (import.meta.env.DEV) {
      console.log(`API Response: ${response.status} ${response.config.url}`)
    }
    
    return response
  },
  (error) => {
    console.error('API Error:', error)
    
    // Handle different error types
    if (error.response) {
      const { status, data } = error.response
      
      switch (status) {
        case 401:
          // Unauthorized - redirect to login
          console.warn('Unauthorized access - redirecting to login')
          if (navigate) {
            navigate('/login')
          }
          break
          
        case 403:
          // Forbidden
          console.warn('Access forbidden')
          break
          
        case 404:
          // Not found
          console.warn('Resource not found')
          break
          
        case 429:
          // Rate limited
          console.warn('Rate limited - too many requests')
          break
          
        case 500:
          // Server error
          console.error('Internal server error')
          break
          
        default:
          console.error(`API Error ${status}:`, data?.message || error.message)
      }
      
      // Return a normalized error object
      return Promise.reject({
        status,
        message: data?.message || error.message,
        code: data?.code || 'API_ERROR',
        originalError: error
      })
    } else if (error.request) {
      // Network error
      console.error('Network error - no response received')
      return Promise.reject({
        status: 0,
        message: 'Network error - please check your connection',
        code: 'NETWORK_ERROR',
        originalError: error
      })
    } else {
      // Request setup error
      console.error('Request setup error:', error.message)
      return Promise.reject({
        status: 0,
        message: error.message,
        code: 'REQUEST_ERROR',
        originalError: error
      })
    }
  }
)

// Health check function
export const healthCheck = async () => {
  try {
    const response = await api.get('/health')
    return response.data
  } catch (error) {
    throw error
  }
}

// Authentication service functions
export const authService = {
  async register(email, password) {
    const response = await api.post('/api/auth/register', { email, password })
    return response.data
  },

  async login(email, password) {
    const response = await api.post('/api/auth/login', { email, password })
    return response.data
  },

  async logout() {
    const response = await api.post('/api/auth/logout')
    return response.data
  },

  async getProfile() {
    const response = await api.get('/api/auth/profile')
    return response.data
  },

  async updateProfile(updates) {
    const response = await api.put('/api/auth/profile', updates)
    return response.data
  }
}

// Chat service functions
export const chatService = {
  async sendMessage(message, sessionId = null, context = 'knowledge_base') {
    console.log('🌐 [chatService] Sending message:', {
      message: message.substring(0, 50) + '...',
      sessionId,
      context
    })
    
    try {
      const response = await api.post('/api/chat', {
        message,
        sessionId,
        context
      })
      
      console.log('✅ [chatService] Response received:', {
        success: response.data.success,
        sessionId: response.data.sessionId,
        hasMessage: !!response.data.message,
        articlesCount: response.data.articles?.length || 0
      })
      
      return response.data
    } catch (error) {
      console.error('❌ [chatService] Error:', error)
      throw error
    }
  },

  async getChatHistory(limit = 50) {
    try {
      const response = await api.get(`/api/chat/history?limit=${limit}`)
      return response.data
    } catch (error) {
      console.error('Get chat history error:', error)
      throw error
    }
  },

  async clearChatHistory() {
    try {
      const response = await api.delete('/api/chat/history')
      return response.data
    } catch (error) {
      console.error('Clear chat history error:', error)
      throw error
    }
  },

  // New session-based endpoints
  async getChatSessions(limit = 50, offset = 0) {
    console.log('📂 [chatService] Getting chat sessions:', { limit, offset })
    
    try {
      const response = await api.get(`/api/chat/sessions?limit=${limit}&offset=${offset}`)
      
      console.log('✅ [chatService] Sessions response:', {
        success: response.data.success,
        sessionsCount: response.data.sessions?.length || 0,
        sessions: response.data.sessions
      })
      
      return response.data
    } catch (error) {
      console.error('❌ [chatService] Get chat sessions error:', error)
      throw error
    }
  },

  async getSessionMessages(sessionId) {
    try {
      const response = await api.get(`/api/chat/sessions/${sessionId}/messages`)
      return response.data
    } catch (error) {
      console.error('Get session messages error:', error)
      throw error
    }
  },

  async createChatSession(title = null) {
    try {
      const response = await api.post('/api/chat/sessions', { title })
      return response.data
    } catch (error) {
      console.error('Create chat session error:', error)
      throw error
    }
  },

  async updateChatSession(sessionId, updates) {
    try {
      const response = await api.put(`/api/chat/sessions/${sessionId}`, updates)
      return response.data
    } catch (error) {
      console.error('Update chat session error:', error)
      throw error
    }
  },

  async deleteChatSession(sessionId) {
    try {
      const response = await api.delete(`/api/chat/sessions/${sessionId}`)
      return response.data
    } catch (error) {
      console.error('Delete chat session error:', error)
      throw error
    }
  },

  async getCategories() {
    try {
      const response = await api.get('/api/articles/categories')
      return response.data
    } catch (error) {
      console.error('Get categories error:', error)
      throw error
    }
  },

  async getFolders() {
    try {
      // Use public endpoint temporarily for testing
      const response = await api.get('/api/articles/folders-public')
      return response.data
    } catch (error) {
      console.error('Get folders error:', error)
      throw error
    }
  },

  async createArticle(articleData) {
    try {
      const response = await api.post('/api/articles/create', articleData)
      return response.data
    } catch (error) {
      console.error('Create article error:', error)
      throw error
    }
  },

  async createFolder(folderData) {
    try {
      const response = await api.post('/api/articles/folders/create', folderData)
      return response.data
    } catch (error) {
      console.error('Create folder error:', error)
      throw error
    }
  }
}

// Articles service functions
export const articlesService = {
  async search(query, limit = 10) {
    try {
      const response = await api.get(`/api/articles/search?q=${encodeURIComponent(query)}&limit=${limit}`)
      return response.data
    } catch (error) {
      console.error('Articles search error:', error)
      throw error
    }
  },

  async getArticle(id) {
    try {
      const response = await api.get(`/api/articles/${id}`)
      return response.data
    } catch (error) {
      console.error('Get article error:', error)
      throw error
    }
  },

  async getCategories() {
    try {
      const response = await api.get('/api/articles/categories')
      return response.data
    } catch (error) {
      console.error('Get categories error:', error)
      throw error
    }
  },

  async createArticle(articleData) {
    try {
      const response = await api.post('/api/articles/create', articleData)
      return response.data
    } catch (error) {
      console.error('Create article error:', error)
      throw error
    }
  }
}

// Analytics service functions
export const analyticsService = {
  async getHistory() {
    try {
      const response = await api.get('/api/analytics/history')
      return response.data
    } catch (error) {
      console.error('Get analytics history error:', error)
      throw error
    }
  },

  async getInsights() {
    try {
      const response = await api.get('/api/analytics/insights')
      return response.data
    } catch (error) {
      console.error('Get analytics insights error:', error)
      throw error
    }
  },

  async getPopular() {
    try {
      const response = await api.get('/api/analytics/popular')
      return response.data
    } catch (error) {
      console.error('Get popular content error:', error)
      throw error
    }
  }
}

// Utility functions
export const utils = {
  // Check if error is a 401 unauthorized error
  isUnauthorizedError(error) {
    return error?.status === 401 || error?.originalError?.response?.status === 401
  },

  // Check if error is a network error
  isNetworkError(error) {
    return error?.code === 'NETWORK_ERROR' || !error?.status
  },

  // Get user-friendly error message
  getErrorMessage(error) {
    if (this.isNetworkError(error)) {
      return 'Unable to connect to the server. Please check your internet connection.'
    }
    
    if (error?.status === 401) {
      return 'Your session has expired. Please log in again.'
    }
    
    if (error?.status === 403) {
      return 'You do not have permission to perform this action.'
    }
    
    if (error?.status === 404) {
      return 'The requested resource was not found.'
    }
    
    if (error?.status === 429) {
      return 'Too many requests. Please wait a moment and try again.'
    }
    
    if (error?.status >= 500) {
      return 'A server error occurred. Please try again later.'
    }
    
    return error?.message || 'An unexpected error occurred.'
  }
}

// Utility functions for API responses and error handling
export const createApiResponse = (success, data = null, error = null, message = '') => {
  return {
    success,
    data,
    error,
    message,
    timestamp: new Date().toISOString()
  }
}

export const handleApiCall = async (apiFunction, operationName = 'API call') => {
  try {
    console.log(`🔄 Starting ${operationName}...`)
    const result = await apiFunction()
    console.log(`✅ ${operationName} completed successfully`)
    return createApiResponse(true, result.data, null, `${operationName} successful`)
  } catch (error) {
    console.error(`❌ ${operationName} failed:`, error)
    
    // Use existing utils.getErrorMessage for consistent error handling
    const errorMessage = utils.getErrorMessage(error)
    return createApiResponse(false, null, errorMessage, `${operationName} failed`)
  }
}

export const buildQueryParams = (params = {}) => {
  const filteredParams = Object.entries(params)
    .filter(([key, value]) => value !== null && value !== undefined && value !== '')
    .reduce((acc, [key, value]) => {
      acc[key] = value
      return acc
    }, {})

  return new URLSearchParams(filteredParams).toString()
}

// Export the configured axios instance as default
export default api

// Export all services
export {
  api,
  BASE_URL
} 