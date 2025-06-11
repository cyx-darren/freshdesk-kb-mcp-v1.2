// API base URL from environment variable or default to localhost
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

/**
 * Submit a new feature request
 * @param {FormData} formData - Feature request form data including files
 * @returns {Promise<Object>} API response
 */
export const submitFeatureRequest = async (formData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/features`, {
      method: 'POST',
      body: formData, // FormData handles multipart/form-data automatically
      headers: {
        ...await getAuthHeaders()
        // Don't set Content-Type header for FormData - browser will set it with boundary
      }
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `HTTP ${response.status}: Failed to submit feature request`)
    }

    return await response.json()
  } catch (error) {
    console.error('Feature request submission error:', error)
    throw error
  }
}

/**
 * Get user's feature requests with optional filtering and pagination
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 10)
 * @param {string} options.status - Filter by status
 * @param {string} options.priority - Filter by priority
 * @param {string} options.category - Filter by category
 * @returns {Promise<Object>} API response with feature requests
 */
export const getFeatureRequests = async (options = {}) => {
  try {
    const params = new URLSearchParams()
    
    // Add query parameters
    if (options.page) params.append('page', options.page)
    if (options.limit) params.append('limit', options.limit)
    if (options.status) params.append('status', options.status)
    if (options.priority) params.append('priority', options.priority)
    if (options.category) params.append('category', options.category)

    const response = await fetch(`${API_BASE_URL}/api/features?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...await getAuthHeaders()
      }
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch feature requests`)
    }

    return await response.json()
  } catch (error) {
    console.error('Fetch feature requests error:', error)
    throw error
  }
}

/**
 * Get a specific feature request by ticket number
 * @param {string} ticketNumber - Ticket number (e.g., FEAT-20241111-0001)
 * @returns {Promise<Object>} API response with feature request details
 */
export const getFeatureRequest = async (ticketNumber) => {
  try {
    if (!ticketNumber) {
      throw new Error('Ticket number is required')
    }

    const authHeaders = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/api/features/${ticketNumber}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Feature request not found')
      }
      const errorData = await response.json()
      throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch feature request`)
    }

    return await response.json()
  } catch (error) {
    console.error('Fetch feature request error:', error)
    throw error
  }
}

/**
 * Download an attachment file
 * @param {string} fileUrl - File URL from the attachment record
 * @returns {Promise<Blob>} File blob
 */
export const downloadAttachment = async (fileUrl) => {
  try {
    if (!fileUrl) {
      throw new Error('File URL is required')
    }

    // If fileUrl is relative, prepend base URL
    const url = fileUrl.startsWith('http') ? fileUrl : `${API_BASE_URL}${fileUrl}`

    const authHeaders = await getAuthHeaders()
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...authHeaders
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to download file`)
    }

    return await response.blob()
  } catch (error) {
    console.error('Download attachment error:', error)
    throw error
  }
}

/**
 * Check if user is authenticated
 * @returns {boolean} Authentication status
 */
export const isAuthenticated = async () => {
  const token = await getAuthToken()
  return !!token
}

/**
 * Validate feature request data before submission
 * @param {Object} data - Feature request data
 * @returns {Object} Validation result with isValid and errors
 */
export const validateFeatureRequest = (data) => {
  const errors = {}

  // Required fields
  if (!data.title?.trim()) {
    errors.title = 'Title is required'
  } else if (data.title.trim().length < 5) {
    errors.title = 'Title must be at least 5 characters'
  } else if (data.title.trim().length > 255) {
    errors.title = 'Title must be less than 255 characters'
  }

  if (!data.description?.trim()) {
    errors.description = 'Description is required'
  } else if (data.description.trim().length < 20) {
    errors.description = 'Description must be at least 20 characters'
  }

  if (!data.use_case?.trim()) {
    errors.use_case = 'Use case is required'
  } else if (data.use_case.trim().length < 10) {
    errors.use_case = 'Use case must be at least 10 characters'
  }

  if (!data.priority) {
    errors.priority = 'Priority is required'
  } else if (!['must_have', 'nice_to_have', 'future'].includes(data.priority)) {
    errors.priority = 'Invalid priority value'
  }

  // Optional field validation
  if (data.category && !['ui_ux', 'functionality', 'integration', 'performance', 'mobile', 'reporting', 'other'].includes(data.category)) {
    errors.category = 'Invalid category value'
  }

  if (data.user_name && data.user_name.length > 255) {
    errors.user_name = 'Name must be less than 255 characters'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Format feature request data for display
 * @param {Object} featureRequest - Raw feature request data
 * @returns {Object} Formatted feature request
 */
export const formatFeatureRequest = (featureRequest) => {
  if (!featureRequest) return null

  return {
    ...featureRequest,
    priority_label: {
      'must_have': 'Must Have',
      'nice_to_have': 'Nice to Have',
      'future': 'Future Enhancement'
    }[featureRequest.priority] || featureRequest.priority,
    
    category_label: {
      'ui_ux': 'UI/UX Design',
      'functionality': 'New Functionality',
      'integration': 'Integration',
      'performance': 'Performance',
      'mobile': 'Mobile',
      'reporting': 'Reporting',
      'other': 'Other'
    }[featureRequest.category] || featureRequest.category,
    
    status_label: {
      'submitted': 'Submitted',
      'under_review': 'Under Review',
      'planned': 'Planned',
      'in_development': 'In Development',
      'completed': 'Completed',
      'rejected': 'Rejected'
    }[featureRequest.status] || featureRequest.status,
    
    created_at_formatted: new Date(featureRequest.created_at).toLocaleDateString(),
    updated_at_formatted: new Date(featureRequest.updated_at).toLocaleDateString()
  }
}

/**
 * Get available filter options for feature requests
 * @returns {Object} Filter options
 */
export const getFilterOptions = () => {
  return {
    status: [
      { value: 'submitted', label: 'Submitted' },
      { value: 'under_review', label: 'Under Review' },
      { value: 'approved', label: 'Approved' },
      { value: 'in_development', label: 'In Development' },
      { value: 'released', label: 'Released' },
      { value: 'rejected', label: 'Rejected' }
    ],
    priority: [
      { value: 'must_have', label: 'Must Have' },
      { value: 'nice_to_have', label: 'Nice to Have' },
      { value: 'future', label: 'Future' }
    ],
    category: [
      { value: 'ui_ux', label: 'UI/UX' },
      { value: 'functionality', label: 'Functionality' },
      { value: 'performance', label: 'Performance' },
      { value: 'integration', label: 'Integration' },
      { value: 'mobile', label: 'Mobile' },
      { value: 'other', label: 'Other' }
    ]
  }
}

// ===== ADMIN METHODS =====

/**
 * Get all feature requests for admin with advanced filtering
 * @param {Object} options - Query options
 * @returns {Promise<Object>} API response with feature requests and pagination
 */
export const getAllFeatureRequests = async (options = {}) => {
  try {
    const params = new URLSearchParams()
    
    // Add query parameters
    Object.keys(options).forEach(key => {
      if (options[key] !== undefined && options[key] !== null && options[key] !== '') {
        params.append(key, options[key])
      }
    })

    const response = await fetch(`${API_BASE_URL}/api/features/admin/all?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...await getAuthHeaders()
      }
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch feature requests`)
    }

    return await response.json()
  } catch (error) {
    console.error('Fetch admin feature requests error:', error)
    throw error
  }
}

/**
 * Update a feature request (admin only)
 * @param {string} id - Feature request ID
 * @param {Object} updates - Update data
 * @returns {Promise<Object>} API response
 */
export const updateFeatureRequest = async (id, updates) => {
  try {
    if (!id) {
      throw new Error('Feature request ID is required')
    }

    const response = await fetch(`${API_BASE_URL}/api/features/admin/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...await getAuthHeaders()
      },
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `HTTP ${response.status}: Failed to update feature request`)
    }

    return await response.json()
  } catch (error) {
    console.error('Update feature request error:', error)
    throw error
  }
}

/**
 * Bulk update feature requests (admin only)
 * @param {Array} ids - Array of feature request IDs
 * @param {Object} updates - Update data to apply to all
 * @returns {Promise<Object>} API response
 */
export const bulkUpdateFeatureRequests = async (ids, updates) => {
  try {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new Error('Feature request IDs are required')
    }

    const response = await fetch(`${API_BASE_URL}/api/features/admin/bulk`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...await getAuthHeaders()
      },
      body: JSON.stringify({ ids, updates })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `HTTP ${response.status}: Failed to bulk update feature requests`)
    }

    return await response.json()
  } catch (error) {
    console.error('Bulk update feature requests error:', error)
    throw error
  }
}

/**
 * Get feature request analytics data
 * @param {Object} options - Query options
 * @returns {Promise<Object>} API response with analytics data
 */
export const getFeatureAnalytics = async (options = {}) => {
  try {
    const params = new URLSearchParams()
    
    if (options.days) params.append('days', options.days)

    const response = await fetch(`${API_BASE_URL}/api/features/admin/analytics?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...await getAuthHeaders()
      }
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch analytics`)
    }

    return await response.json()
  } catch (error) {
    console.error('Fetch feature analytics error:', error)
    throw error
  }
}

/**
 * Export feature requests to CSV
 * @param {Object} filters - Export filters
 * @returns {Promise<Blob>} CSV file blob
 */
export const exportFeatureRequestsCSV = async (filters = {}) => {
  try {
    const params = new URLSearchParams()
    
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params.append(key, filters[key])
      }
    })
    
    params.append('format', 'csv')

    const response = await fetch(`${API_BASE_URL}/api/features/admin/export?${params}`, {
      method: 'GET',
      headers: {
        ...await getAuthHeaders()
      }
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `HTTP ${response.status}: Failed to export feature requests`)
    }

    return await response.blob()
  } catch (error) {
    console.error('Export feature requests error:', error)
    throw error
  }
}

/**
 * Get status workflow options for admin
 */
export const getStatusWorkflow = () => {
  return [
    { value: 'submitted', label: 'Submitted', color: 'bg-blue-100 text-blue-800' },
    { value: 'under_review', label: 'Under Review', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'approved', label: 'Approved', color: 'bg-green-100 text-green-800' },
    { value: 'in_development', label: 'In Development', color: 'bg-purple-100 text-purple-800' },
    { value: 'released', label: 'Released', color: 'bg-gray-100 text-gray-800' },
    { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' }
  ]
}

/**
 * Get priority options with colors
 */
export const getPriorityOptions = () => {
  return [
    { value: 'must_have', label: 'Must Have', color: 'bg-red-100 text-red-800' },
    { value: 'nice_to_have', label: 'Nice to Have', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'future', label: 'Future', color: 'bg-blue-100 text-blue-800' }
  ]
}

/**
 * Format feature request data for display
 */
export const formatFeatureRequestForAdmin = (featureRequest) => {
  if (!featureRequest) return null
  
  const statusOptions = getStatusWorkflow()
  const priorityOptions = getPriorityOptions()
  
  const status = statusOptions.find(s => s.value === featureRequest.status)
  const priority = priorityOptions.find(p => p.value === featureRequest.priority)
  
  return {
    ...featureRequest,
    statusDisplay: status?.label || featureRequest.status,
    statusColor: status?.color || 'bg-gray-100 text-gray-800',
    priorityDisplay: priority?.label || featureRequest.priority,
    priorityColor: priority?.color || 'bg-gray-100 text-gray-800',
    formattedCreatedAt: new Date(featureRequest.created_at).toLocaleDateString(),
    formattedUpdatedAt: new Date(featureRequest.updated_at).toLocaleDateString(),
    hasAttachments: featureRequest.feature_attachments?.length > 0
  }
} 