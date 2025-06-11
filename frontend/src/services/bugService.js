import axios from 'axios'
import { supabase } from '../contexts/SupabaseContext.jsx'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333'

/**
 * Get authentication token from Supabase session
 */
const getAuthToken = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw error
    return session?.access_token || null
  } catch (error) {
    console.error('Error getting auth token:', error)
    return null
  }
}

/**
 * Create authenticated request headers
 */
const getAuthHeaders = async () => {
  const token = await getAuthToken()
  return {
    'Authorization': token ? `Bearer ${token}` : ''
  }
}

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds for file uploads
})

// Add auth token to requests
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await getAuthToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch (error) {
      console.error('Error adding auth token to request:', error)
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

/**
 * Submit a new bug report
 * @param {FormData} formData - Form data including files
 * @returns {Promise<Object>} API response
 */
export const submitBugReport = async (formData) => {
  try {
    const response = await api.post('/api/bugs', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  } catch (error) {
    if (error.response?.data) {
      return {
        success: false,
        error: error.response.data.error || 'Failed to submit bug report',
        details: error.response.data.details
      }
    }
    return {
      success: false,
      error: 'Network error. Please check your connection and try again.'
    }
  }
}

/**
 * Get user's bug reports
 * @param {Object} params - Query parameters (page, limit, status, severity)
 * @returns {Promise<Object>} API response
 */
export const getBugReports = async (params = {}) => {
  try {
    const response = await api.get('/api/bugs', { params })
    return response.data
  } catch (error) {
    if (error.response?.data) {
      return {
        success: false,
        error: error.response.data.error || 'Failed to fetch bug reports'
      }
    }
    return {
      success: false,
      error: 'Network error. Please check your connection and try again.'
    }
  }
}

/**
 * Get a specific bug report by ticket number
 * @param {string} ticketNumber - Bug report ticket number
 * @returns {Promise<Object>} API response
 */
export const getBugReport = async (ticketNumber) => {
  try {
    const response = await api.get(`/api/bugs/${ticketNumber}`)
    return response.data
  } catch (error) {
    if (error.response?.data) {
      return {
        success: false,
        error: error.response.data.error || 'Failed to fetch bug report'
      }
    }
    return {
      success: false,
      error: 'Network error. Please check your connection and try again.'
    }
  }
}

/**
 * Admin: Get all bug reports with filtering and pagination
 * @param {Object} params - Query parameters (page, limit, status, severity, search, sortBy, sortOrder)
 * @returns {Promise<Object>} API response
 */
export const getAllBugReports = async (params = {}) => {
  try {
    const response = await api.get('/api/bugs/admin/all', { params })
    return response.data
  } catch (error) {
    if (error.response?.data) {
      return {
        success: false,
        error: error.response.data.error || 'Failed to fetch bug reports'
      }
    }
    return {
      success: false,
      error: 'Network error. Please check your connection and try again.'
    }
  }
}

/**
 * Admin: Update bug report status and notes
 * @param {number} id - Bug report ID
 * @param {Object} updateData - Update data (status, admin_notes)
 * @returns {Promise<Object>} API response
 */
export const updateBugReport = async (id, updateData) => {
  try {
    const response = await api.put(`/api/bugs/admin/${id}`, updateData)
    return response.data
  } catch (error) {
    if (error.response?.data) {
      return {
        success: false,
        error: error.response.data.error || 'Failed to update bug report'
      }
    }
    return {
      success: false,
      error: 'Network error. Please check your connection and try again.'
    }
  }
}

/**
 * Export bug reports to CSV (admin only)
 * @param {Object} filters - Export filters
 * @returns {Promise<void>} Downloads CSV file
 */
export const exportBugReportsCSV = async (filters = {}) => {
  try {
    const params = new URLSearchParams()
    
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params.append(key, filters[key])
      }
    })
    
    params.append('format', 'csv')

    const authHeaders = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/api/bugs/admin/export?${params}`, {
      method: 'GET',
      headers: {
        ...authHeaders
      }
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `HTTP ${response.status}: Failed to export bug reports`)
    }

    const blob = await response.blob()
    
    // Create download link and trigger download
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = `bug_reports_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  } catch (error) {
    console.error('Export bug reports error:', error)
    throw error
  }
}

/**
 * Get bug report analytics data
 * @param {Object} options - Query options
 * @returns {Promise<Object>} API response with analytics data
 */
export const getBugAnalytics = async (options = {}) => {
  try {
    const params = new URLSearchParams()
    
    if (options.days) params.append('days', options.days)

    const authHeaders = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/api/bugs/admin/analytics?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      }
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch analytics`)
    }

    return await response.json()
  } catch (error) {
    console.error('Fetch bug analytics error:', error)
    throw error
  }
}

export default {
  submitBugReport,
  getBugReports,
  getBugReport,
  getAllBugReports,
  updateBugReport,
  exportBugReportsCSV,
  getBugAnalytics
} 