import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSupabase } from '../contexts/SupabaseContext.jsx'
import { useAdminHelpers } from '../utils/adminHelpers.js'
import { getAllBugReports, updateBugReport, exportBugReportsCSV } from '../services/bugService.js'
import AdminNavigation from '../components/AdminNavigation.jsx'
import { Bug, Download } from 'lucide-react'

const AdminBugReports = () => {
  // Hooks
  const { user, logout } = useSupabase()
  const navigate = useNavigate()
  const { hasAdminAccess } = useAdminHelpers()

  // State
  const [bugReports, setBugReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedBugReport, setSelectedBugReport] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [filters, setFilters] = useState({
    status: 'all',
    severity: 'all',
    search: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  })
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Check admin access
  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
  }, [user, navigate])

  // Load bug reports
  const loadBugReports = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
        status: filters.status === 'all' ? undefined : filters.status,
        severity: filters.severity === 'all' ? undefined : filters.severity,
        search: filters.search || undefined
      }

      const response = await getAllBugReports(params)
      
      if (response.success) {
        setBugReports(response.data)
        setPagination(prev => ({
          ...prev,
          total: response.pagination.total,
          totalPages: response.pagination.totalPages
        }))
      } else {
        setError(response.error || 'Failed to load bug reports')
      }
    } catch (err) {
      console.error('Error loading bug reports:', err)
      setError('Failed to load bug reports')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, filters])

  // Load initial data
  useEffect(() => {
    loadBugReports()
  }, [loadBugReports])

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to page 1 when filtering
  }

  // Handle sorting
  const handleSort = (field) => {
    const isAsc = filters.sortBy === field && filters.sortOrder === 'asc'
    setFilters(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: isAsc ? 'desc' : 'asc'
    }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  // Handle pagination
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  // Handle row click
  const handleRowClick = (bugReport) => {
    setSelectedBugReport(bugReport)
    setShowDetailModal(true)
  }

  // Handle status update
  const handleStatusUpdate = async (id, newStatus, adminNotes) => {
    try {
      setUpdatingStatus(true)
      
      const response = await updateBugReport(id, {
        status: newStatus,
        admin_notes: adminNotes
      })

      if (response.success) {
        // Update the bug report in the list
        setBugReports(prev => prev.map(bug => 
          bug.id === id ? response.data : bug
        ))
        
        // Update selected bug report if it's the same one
        if (selectedBugReport?.id === id) {
          setSelectedBugReport(response.data)
        }

        return { success: true }
      } else {
        return { success: false, error: response.error }
      }
    } catch (err) {
      console.error('Error updating bug report:', err)
      return { success: false, error: 'Failed to update bug report' }
    } finally {
      setUpdatingStatus(false)
    }
  }

  // Handle CSV export
  const handleExportCSV = async () => {
    try {
      const appliedFilters = {
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.severity !== 'all' && { severity: filters.severity }),
        ...(filters.search && { search: filters.search })
      }

      await exportBugReportsCSV(appliedFilters)
    } catch (err) {
      console.error('Error exporting bug reports:', err)
      setError(err.message)
    }
  }

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get severity color
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'under_review': return 'bg-purple-100 text-purple-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      case 'closed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Format status display
  const formatStatus = (status) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
      title: 'Export filtered bug reports to CSV',
      hideTextOnMobile: false
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Unified Admin Navigation */}
      <AdminNavigation
        title="Bug Reports Management"
        subtitle="Manage and track all bug reports"
        logoIcon={Bug}
        rightActions={rightActions}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                placeholder="Search title, description, or email..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="in_progress">In Progress</option>
                <option value="under_review">Under Review</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Severity
              </label>
              <select
                value={filters.severity}
                onChange={(e) => handleFilterChange('severity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({
                    status: 'all',
                    severity: 'all',
                    search: '',
                    sortBy: 'created_at',
                    sortOrder: 'desc'
                  })
                  setPagination(prev => ({ ...prev, page: 1 }))
                }}
                className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            {loading ? 'Loading...' : `Showing ${bugReports.length} of ${pagination.total} bug reports`}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Bug Reports Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('id')}
                  >
                    <div className="flex items-center">
                      ID
                      {filters.sortBy === 'id' && (
                        <svg className={`w-4 h-4 ml-1 ${filters.sortOrder === 'asc' ? 'transform rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center">
                      Title
                      {filters.sortBy === 'title' && (
                        <svg className={`w-4 h-4 ml-1 ${filters.sortOrder === 'asc' ? 'transform rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('severity')}
                  >
                    <div className="flex items-center">
                      Severity
                      {filters.sortBy === 'severity' && (
                        <svg className={`w-4 h-4 ml-1 ${filters.sortOrder === 'asc' ? 'transform rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      Status
                      {filters.sortBy === 'status' && (
                        <svg className={`w-4 h-4 ml-1 ${filters.sortOrder === 'asc' ? 'transform rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center">
                      Date
                      {filters.sortBy === 'created_at' && (
                        <svg className={`w-4 h-4 ml-1 ${filters.sortOrder === 'asc' ? 'transform rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('user_email')}
                  >
                    <div className="flex items-center">
                      Reporter Email
                      {filters.sortBy === 'user_email' && (
                        <svg className={`w-4 h-4 ml-1 ${filters.sortOrder === 'asc' ? 'transform rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : bugReports.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No bug reports found
                    </td>
                  </tr>
                ) : (
                  bugReports.map((bugReport) => (
                    <tr 
                      key={bugReport.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleRowClick(bugReport)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        #{bugReport.id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-xs truncate">
                          {bugReport.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(bugReport.severity)}`}>
                          {bugReport.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(bugReport.status)}`}>
                          {formatStatus(bugReport.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(bugReport.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {bugReport.user_email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRowClick(bugReport)
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-6 rounded-lg shadow-sm">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span>
                  {' '}to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>
                  {' '}of{' '}
                  <span className="font-medium">{pagination.total}</span>
                  {' '}results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const pageNum = pagination.page <= 3 ? i + 1 : pagination.page - 2 + i
                    if (pageNum > pagination.totalPages) return null
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pageNum === pagination.page
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bug Report Detail Modal */}
      {showDetailModal && selectedBugReport && (
        <BugReportDetailModal
          bugReport={selectedBugReport}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedBugReport(null)
          }}
          onStatusUpdate={handleStatusUpdate}
          updatingStatus={updatingStatus}
        />
      )}
    </div>
  )
}

// Bug Report Detail Modal Component
const BugReportDetailModal = ({ bugReport, onClose, onStatusUpdate, updatingStatus }) => {
  const [newStatus, setNewStatus] = useState(bugReport.status)
  const [adminNotes, setAdminNotes] = useState(bugReport.admin_notes || '')
  const [hasChanges, setHasChanges] = useState(false)
  const [updateError, setUpdateError] = useState('')

  useEffect(() => {
    const hasStatusChange = newStatus !== bugReport.status
    const hasNotesChange = adminNotes !== (bugReport.admin_notes || '')
    setHasChanges(hasStatusChange || hasNotesChange)
  }, [newStatus, adminNotes, bugReport])

  const handleSave = async () => {
    try {
      setUpdateError('')
      
      const result = await onStatusUpdate(bugReport.id, newStatus, adminNotes)
      
      if (result.success) {
        // Update completed successfully
        setHasChanges(false)
      } else {
        setUpdateError(result.error || 'Failed to update bug report')
      }
    } catch (err) {
      setUpdateError('Failed to update bug report')
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Bug Report #{bugReport.id} - {bugReport.ticket_number}
            </h3>
            <p className="text-sm text-gray-500">
              Reported by {bugReport.user_email} on {formatDate(bugReport.created_at)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Title</h4>
              <p className="text-gray-900">{bugReport.title}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Severity</h4>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(bugReport.severity)}`}>
                {bugReport.severity}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Description</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-900 whitespace-pre-wrap">{bugReport.description}</p>
            </div>
          </div>

          {/* Attachments */}
          {bugReport.bug_attachments && bugReport.bug_attachments.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Attachments</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {bugReport.bug_attachments.map((attachment) => (
                  <div key={attachment.id} className="border rounded-lg p-3">
                    <img
                      src={`http://localhost:3333${attachment.file_url}`}
                      alt={attachment.file_name}
                      className="w-full h-32 object-cover rounded mb-2"
                    />
                    <p className="text-xs text-gray-600 truncate">{attachment.file_name}</p>
                    <p className="text-xs text-gray-400">{(attachment.file_size / 1024).toFixed(1)} KB</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Management */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Status</h4>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="new">New</option>
                <option value="in_progress">In Progress</option>
                <option value="under_review">Under Review</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Reporter Name</h4>
              <p className="text-gray-900">{bugReport.user_name || 'Not provided'}</p>
            </div>
          </div>

          {/* Admin Notes */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Admin Notes</h4>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add internal notes about this bug report..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Created</h4>
              <p className="text-gray-600">{formatDate(bugReport.created_at)}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Last Updated</h4>
              <p className="text-gray-600">{formatDate(bugReport.updated_at)}</p>
            </div>
          </div>

          {/* Error Message */}
          {updateError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{updateError}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-4 border-t space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || updatingStatus}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updatingStatus ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminBugReports 