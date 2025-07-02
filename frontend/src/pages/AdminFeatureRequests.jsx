import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  Lightbulb, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  X, 
  Download, 
  Check, 
  AlertCircle,
  FileText,
  User,
  Calendar,
  Tag,
  Star,
  MessageSquare,
  ExternalLink,
  CheckSquare,
  Square
} from 'lucide-react'
import { 
  getAllFeatureRequests, 
  updateFeatureRequest, 
  bulkUpdateFeatureRequests,
  exportFeatureRequestsCSV,
  getStatusWorkflow,
  getPriorityOptions,
  formatFeatureRequestForAdmin
} from '../services/featureService'
import AdminNavigation from '../components/AdminNavigation.jsx'

const AdminFeatureRequests = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [featureRequests, setFeatureRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [selectedFeature, setSelectedFeature] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  })

  // Filters and sorting
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    priority: searchParams.get('priority') || '',
    category: searchParams.get('category') || '',
    assigned_to: searchParams.get('assigned_to') || ''
  })
  const [sorting, setSorting] = useState({
    sort_by: searchParams.get('sort_by') || 'created_at',
    sort_order: searchParams.get('sort_order') || 'desc'
  })

  const [showFilters, setShowFilters] = useState(false)
  const [notification, setNotification] = useState(null)

  const statusOptions = getStatusWorkflow()
  const priorityOptions = getPriorityOptions()

  const categoryOptions = [
    { value: 'ui_ux', label: 'UI/UX' },
    { value: 'functionality', label: 'Functionality' },
    { value: 'performance', label: 'Performance' },
    { value: 'integration', label: 'Integration' },
    { value: 'mobile', label: 'Mobile' },
    { value: 'other', label: 'Other' }
  ]

  useEffect(() => {
    loadFeatureRequests()
  }, [filters, sorting, pagination.page])

  const loadFeatureRequests = async () => {
    try {
      setLoading(true)
      setError(null)

      const queryParams = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
        ...sorting
      }

      // Remove empty filters
      Object.keys(queryParams).forEach(key => {
        if (queryParams[key] === '') {
          delete queryParams[key]
        }
      })

      const response = await getAllFeatureRequests(queryParams)
      
      const formattedRequests = response.data.map(formatFeatureRequestForAdmin)
      setFeatureRequests(formattedRequests)
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total,
        pages: response.pagination.pages
      }))

    } catch (err) {
      console.error('Error loading feature requests:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    setPagination(prev => ({ ...prev, page: 1 }))
    
    // Update URL
    const newSearchParams = new URLSearchParams()
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) newSearchParams.set(k, v)
    })
    Object.entries(sorting).forEach(([k, v]) => {
      if (v) newSearchParams.set(k, v)
    })
    setSearchParams(newSearchParams)
  }

  const handleSort = (column) => {
    const newOrder = sorting.sort_by === column && sorting.sort_order === 'asc' ? 'desc' : 'asc'
    const newSorting = { sort_by: column, sort_order: newOrder }
    setSorting(newSorting)

    // Update URL
    const newSearchParams = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => {
      if (v) newSearchParams.set(k, v)
    })
    Object.entries(newSorting).forEach(([k, v]) => {
      if (v) newSearchParams.set(k, v)
    })
    setSearchParams(newSearchParams)
  }

  const handleSelectItem = (id) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
    setShowBulkActions(newSelected.size > 0)
  }

  const handleSelectAll = () => {
    if (selectedItems.size === featureRequests.length) {
      setSelectedItems(new Set())
      setShowBulkActions(false)
    } else {
      setSelectedItems(new Set(featureRequests.map(req => req.id)))
      setShowBulkActions(true)
    }
  }

  const handleUpdateFeature = async (id, updates) => {
    try {
      setUpdating(true)
      
      // Add old status for history tracking
      const currentFeature = featureRequests.find(f => f.id === id)
      if (updates.status && currentFeature) {
        updates.old_status = currentFeature.status
      }

      await updateFeatureRequest(id, updates)
      
      showNotification('Feature request updated successfully!', 'success')
      setSelectedFeature(null)
      loadFeatureRequests()
    } catch (err) {
      console.error('Error updating feature request:', err)
      showNotification(err.message, 'error')
    } finally {
      setUpdating(false)
    }
  }

  const handleBulkUpdate = async (updates) => {
    try {
      setUpdating(true)
      const ids = Array.from(selectedItems)
      
      await bulkUpdateFeatureRequests(ids, updates)
      
      showNotification(`Updated ${ids.length} feature request(s)!`, 'success')
      setSelectedItems(new Set())
      setShowBulkActions(false)
      loadFeatureRequests()
    } catch (err) {
      console.error('Error bulk updating feature requests:', err)
      showNotification(err.message, 'error')
    } finally {
      setUpdating(false)
    }
  }

  const handleExportCSV = async () => {
    try {
      const appliedFilters = {
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.category && { category: filters.category }),
        ...(filters.assigned_to && { assigned_to: filters.assigned_to })
      }

      await exportFeatureRequestsCSV(appliedFilters)
      showNotification('Export completed successfully!', 'success')
    } catch (err) {
      console.error('Error exporting feature requests:', err)
      showNotification(err.message, 'error')
    }
  }

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 5000)
  }

  const clearFilters = () => {
    const clearedFilters = {
      search: '',
      status: '',
      priority: '',
      category: '',
      assigned_to: ''
    }
    setFilters(clearedFilters)
    setSearchParams(new URLSearchParams())
  }

  const getSortIcon = (column) => {
    if (sorting.sort_by !== column) return null
    return sorting.sort_order === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading feature requests...</p>
        </div>
      </div>
    )
  }

  // Define right actions for navigation
  const rightActions = [
    {
      label: 'Export CSV',
      icon: Download,
      onClick: handleExportCSV,
      variant: 'success',
      title: 'Export filtered feature requests to CSV',
      hideTextOnMobile: false
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Unified Admin Navigation */}
      <AdminNavigation
        title="Feature Requests"
        subtitle="Manage and track feature requests from users"
        logoIcon={Lightbulb}
        rightActions={rightActions}
      />

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg ${
          notification.type === 'success' ? 'bg-green-100 text-green-800' :
          notification.type === 'error' ? 'bg-red-100 text-red-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          <div className="flex items-center space-x-2">
            {notification.type === 'success' && <Check className="h-4 w-4" />}
            {notification.type === 'error' && <AlertCircle className="h-4 w-4" />}
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and Search */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search */}
            <div className="flex-1 lg:max-w-xs">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search feature requests..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
              </button>
              {(filters.status || filters.priority || filters.category || filters.assigned_to) && (
                <button
                  onClick={clearFilters}
                  className="text-gray-600 hover:text-gray-800 text-sm"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Statuses</option>
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={filters.priority}
                    onChange={(e) => handleFilterChange('priority', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Priorities</option>
                    {priorityOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Categories</option>
                    {categoryOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                  <input
                    type="text"
                    placeholder="Email address"
                    value={filters.assigned_to}
                    onChange={(e) => handleFilterChange('assigned_to', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {showBulkActions && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">
                {selectedItems.size} item(s) selected
              </span>
              <div className="flex space-x-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkUpdate({ status: e.target.value })
                      e.target.value = ''
                    }
                  }}
                  className="text-sm border border-blue-300 rounded px-2 py-1"
                  disabled={updating}
                >
                  <option value="">Change Status</option>
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkUpdate({ priority: e.target.value })
                      e.target.value = ''
                    }
                  }}
                  className="text-sm border border-blue-300 rounded px-2 py-1"
                  disabled={updating}
                >
                  <option value="">Change Priority</option>
                  {priorityOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    setSelectedItems(new Set())
                    setShowBulkActions(false)
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={handleSelectAll}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {selectedItems.size === featureRequests.length && featureRequests.length > 0 ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('ticket_number')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>ID</span>
                      {getSortIcon('ticket_number')}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Title</span>
                      {getSortIcon('title')}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('priority')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Priority</span>
                      {getSortIcon('priority')}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('category')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Category</span>
                      {getSortIcon('category')}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Status</span>
                      {getSortIcon('status')}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('user_email')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Reporter</span>
                      {getSortIcon('user_email')}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Date</span>
                      {getSortIcon('created_at')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Votes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {featureRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleSelectItem(request.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {selectedItems.has(request.id) ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {request.ticket_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                      <div className="truncate" title={request.title}>
                        {request.title}
                      </div>
                      {request.hasAttachments && (
                        <FileText className="h-3 w-3 text-gray-400 inline ml-2" />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${request.priorityColor}`}>
                        {request.priorityDisplay}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.category || 'Uncategorized'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${request.statusColor}`}>
                        {request.statusDisplay}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.user_email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.formattedCreatedAt}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Star className="h-3 w-3 text-yellow-400" />
                        <span>{request.vote_count || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedFeature(request)}
                        className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View Details</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {featureRequests.length === 0 && !loading && (
            <div className="text-center py-12">
              <Lightbulb className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No feature requests found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filters.search || filters.status || filters.priority || filters.category
                  ? 'Try adjusting your filters'
                  : 'No feature requests have been submitted yet'}
              </p>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                  disabled={pagination.page === pagination.pages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{' '}
                    of <span className="font-medium">{pagination.total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setPagination(prev => ({ ...prev, page }))}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === pagination.page
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Feature Details Modal */}
      {selectedFeature && (
        <FeatureDetailsModal
          feature={selectedFeature}
          onClose={() => setSelectedFeature(null)}
          onUpdate={handleUpdateFeature}
          updating={updating}
          statusOptions={statusOptions}
          priorityOptions={priorityOptions}
          categoryOptions={categoryOptions}
        />
      )}
    </div>
  )
}

// Feature Details Modal Component
const FeatureDetailsModal = ({ feature, onClose, onUpdate, updating, statusOptions, priorityOptions, categoryOptions }) => {
  const [formData, setFormData] = useState({
    status: feature.status,
    priority: feature.priority,
    category: feature.category || '',
    assigned_to: feature.assigned_to || '',
    admin_notes: feature.admin_notes || '',
    duplicate_of: feature.duplicate_of || '',
    resolution_notes: feature.resolution_notes || ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onUpdate(feature.id, formData)
  }

  const handleStatusChange = (newStatus) => {
    setFormData(prev => ({ ...prev, status: newStatus }))
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Feature Request Details</h3>
            <p className="text-sm text-gray-500">{feature.ticket_number}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Details */}
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Title</h4>
                <p className="text-sm text-gray-700">{feature.title}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
                <div 
                  className="text-sm text-gray-700 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: feature.description }}
                />
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Use Case</h4>
                <div 
                  className="text-sm text-gray-700 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: feature.use_case }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Reporter</h4>
                  <p className="text-sm text-gray-700">{feature.user_name || feature.user_email}</p>
                  <p className="text-xs text-gray-500">{feature.user_email}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Created</h4>
                  <p className="text-sm text-gray-700">{feature.formattedCreatedAt}</p>
                </div>
              </div>

              {feature.feature_attachments && feature.feature_attachments.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Attachments</h4>
                  <div className="space-y-2">
                    {feature.feature_attachments.map(attachment => (
                      <div key={attachment.id} className="flex items-center space-x-2 text-sm">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <a
                          href={attachment.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {attachment.file_name}
                        </a>
                        <span className="text-gray-500">
                          ({Math.round(attachment.file_size / 1024)} KB)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Admin Form */}
            <div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {priorityOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Category</option>
                    {categoryOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assign To
                  </label>
                  <input
                    type="email"
                    placeholder="Email address"
                    value={formData.assigned_to}
                    onChange={(e) => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Admin Notes
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Internal notes for the team..."
                    value={formData.admin_notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, admin_notes: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {formData.status === 'rejected' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duplicate Of
                    </label>
                    <input
                      type="text"
                      placeholder="FEAT-YYYYMMDD-NNNN"
                      value={formData.duplicate_of}
                      onChange={(e) => setFormData(prev => ({ ...prev, duplicate_of: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {(formData.status === 'released' || formData.status === 'rejected') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Resolution Notes
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Resolution details..."
                      value={formData.resolution_notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, resolution_notes: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {updating ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminFeatureRequests 