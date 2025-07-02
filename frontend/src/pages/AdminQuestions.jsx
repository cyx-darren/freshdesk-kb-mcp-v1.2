import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSupabase } from '../contexts/SupabaseContext.jsx'
import { useFeedback } from '../hooks/useFeedback.js'
import { useAdminHelpers, formatFeedbackType, formatFeedbackStatus, getFeedbackTypeColor, getFeedbackStatusColor } from '../utils/adminHelpers.js'
import AdminNavigation from '../components/AdminNavigation.jsx'
import { MessageSquare, RefreshCw } from 'lucide-react'

const AdminQuestions = () => {
  // Hooks
  const { user, logout } = useSupabase()
  const navigate = useNavigate()
  const { 
    feedback, 
    loading, 
    error, 
    loadFeedback, 
    assignFeedback, 
    updateFeedbackStatus,
    subscribeToFeedback,
    unsubscribeFromFeedback,
    clearError 
  } = useFeedback()
  const { isAdmin, hasAdminAccess, userId } = useAdminHelpers()

  // State
  const [selectedFeedback, setSelectedFeedback] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  const [filters, setFilters] = useState({
    feedbackType: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  })

  // Check admin access
  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    
    // Temporarily disabled for testing - allow all users to access admin dashboard
    // if (!hasAdminAccess) {
    //   navigate('/chat') // Redirect non-admin users
    //   return
    // }
  }, [user, hasAdminAccess, navigate])

  // Load feedback data with pagination
  const loadFeedbackData = useCallback(async () => {
    try {
      const options = {
        page: pagination.page,
        limit: pagination.limit,
        status: filters.status || null,
        feedbackType: filters.feedbackType || null,
        sortBy: 'created_at',
        sortOrder: 'desc'
      }

      const result = await loadFeedback(options)
      if (result && result.total !== undefined) {
        setPagination(prev => ({
          ...prev,
          total: result.total,
          totalPages: Math.ceil(result.total / prev.limit)
        }))
      }
    } catch (error) {
      console.error('Error loading feedback data:', error)
    }
  }, [pagination.page, pagination.limit, filters, loadFeedback])

  // Load initial data and setup subscriptions
  useEffect(() => {
    if (user) {
      loadFeedbackData()
    }
  }, [user, loadFeedbackData])

  // Load data when pagination or filters change
  useEffect(() => {
    if (user) {
      loadFeedbackData()
    }
  }, [pagination.page, pagination.limit, filters])

  // Set up real-time subscriptions
  useEffect(() => {
    const subscription = subscribeToFeedback(
      (payload) => {
        console.log('📬 Real-time feedback update:', payload)
        loadFeedbackData() // Refresh data on any changes
      }
    )

    return () => {
      unsubscribeFromFeedback()
    }
  }, [loadFeedbackData])

  // Refresh data when page comes back into focus (e.g., after publishing an article)
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔄 Page focused, refreshing feedback data...')
      loadFeedbackData()
    }

    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [loadFeedbackData])

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Handle row click
  const handleRowClick = (feedbackItem) => {
    setSelectedFeedback(feedbackItem)
    setShowDetailModal(true)
  }

  // Handle claim question
  const handleClaimQuestion = async (feedbackId) => {
    try {
      await assignFeedback(feedbackId, userId)
    } catch (err) {
      console.error('Failed to claim question:', err)
    }
  }

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to page 1 when filtering
  }

  // Handle pagination
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  // Handle page size change
  const handlePageSizeChange = (newLimit) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }))
  }

  // Handle refresh
  const handleRefresh = () => {
    console.log('🔄 Manual refresh triggered')
    loadFeedbackData()
  }

  // Handle create article
  const handleCreateArticle = (feedbackItem) => {
    // Navigate to article editor with the question data
    navigate('/article-editor', {
      state: {
        originalQuestion: feedbackItem.question,
        aiResponse: feedbackItem.ai_response,
        feedbackType: feedbackItem.feedback_type,
        feedbackId: feedbackItem.id
      }
    })
  }

  // Handle view drafts
  const handleViewDrafts = (feedbackItem) => {
    console.log('Viewing drafts for feedback:', feedbackItem.id)
    navigate('/article-editor', {
      state: {
        fromAdminQuestions: true,
        feedbackId: feedbackItem.id,
        originalQuestion: feedbackItem.question,
        aiResponse: feedbackItem.ai_response,
        feedbackType: feedbackItem.feedback_type,
        showDrafts: true
      }
    })
  }

  // Handle view published article
  const handleViewArticle = (feedbackItem) => {
    if (feedbackItem.published_article_id) {
      // Open Freshdesk article in new tab
      window.open(`https://easyprint.freshdesk.com/a/solutions/articles/${feedbackItem.published_article_id}`, '_blank')
    }
  }

  // Truncate text
  const truncateText = (text, maxLength = 60) => {
    if (!text) return ''
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
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

  // Format draft count display
  const formatDraftCount = (count, drafts = []) => {
    if (count === 0) return ''
    const draftTitles = drafts.map(draft => draft.title || 'Untitled').join(', ')
    return {
      display: count === 1 ? '1 draft' : `${count} drafts`,
      title: `Drafts: ${draftTitles}`
    }
  }

  // Get enhanced status display
  const getEnhancedStatus = (item) => {
    // Debug logging to see what data we're getting
    if (item.question && item.question.toLowerCase().includes('minimum order') && item.question.toLowerCase().includes('fridge magnet')) {
      console.log('[DEBUG] Fridge magnet question data:', {
        id: item.id,
        question: item.question,
        status: item.status,
        has_published: item.has_published,
        published_article_id: item.published_article_id
      })
    }
    
    // Check if article has been published (either by has_published flag or by having a published_article_id and completed status)
    if (item.has_published || (item.published_article_id && item.status === 'completed')) {
      return {
        display: '✅ Published',
        className: 'bg-green-100 text-green-800',
        tooltip: `Article published${item.published_article_id ? ` (ID: ${item.published_article_id})` : ''}`
      }
    }
    
    // If feedback type is "correct", no action needed
    if (item.feedback_type === 'correct') {
      return {
        display: '', // Empty status for correct responses
        className: '',
        tooltip: 'AI response was marked as correct - no article needed'
      }
    }
    
    // Default status for incorrect and needs_improvement
    return {
      display: formatFeedbackStatus(item.status),
      className: getFeedbackStatusColor(item.status),
      tooltip: null
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Temporarily disabled for testing - allow all users to access admin dashboard
  // if (!hasAdminAccess) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-gray-50">
  //       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  //     </div>
  //   )
  // }

  // Define right actions for navigation
  const rightActions = [
    {
      label: 'Refresh',
      icon: RefreshCw,
      onClick: handleRefresh,
      variant: 'default',
      title: 'Refresh feedback data',
      hideTextOnMobile: true
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Unified Admin Navigation */}
      <AdminNavigation
        title="ELSA Admin Dashboard"
        subtitle="Manage AI feedback submissions"
        logoIcon={MessageSquare}
        rightActions={rightActions}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Feedback Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Feedback Type
              </label>
              <select
                value={filters.feedbackType}
                onChange={(e) => handleFilterChange('feedbackType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="correct">Correct</option>
                <option value="incorrect">Incorrect</option>
                <option value="needs_improvement">Needs Improvement</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Platform Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Platform
              </label>
              <select
                value={filters.platform || ''}
                onChange={(e) => handleFilterChange('platform', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Platforms</option>
                <option value="web">Web</option>
                <option value="discord">Discord</option>
              </select>
            </div>

            {/* Date To Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date To
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <button
              onClick={() => {
                setFilters({ feedbackType: '', status: '', platform: '', dateTo: '' })
                setPagination(prev => ({ ...prev, page: 1 }))
              }}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">!</span>
                </div>
                <p className="text-red-800 text-sm font-medium">Error loading feedback</p>
              </div>
              <button
                onClick={clearError}
                className="text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              Feedback Submissions ({pagination.total})
            </h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Show:</label>
                <select
                  value={pagination.limit}
                  onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                  className="pl-3 pr-8 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-700">per page</span>
              </div>
              {pagination.totalPages > 1 && (
                <div className="text-sm text-gray-700">
                  Page {pagination.page} of {pagination.totalPages}
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading feedback submissions...</p>
            </div>
          ) : feedback.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No feedback submissions found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Question
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Platform
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Drafts
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned To
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {feedback.map((item) => {
                    const statusInfo = getEnhancedStatus(item)
                    const draftInfo = formatDraftCount(item.draft_count || 0, item.drafts || [])
                    const hasPublished = item.has_published || (item.published_article_id && item.status === 'completed')
                    
                    return (
                      <tr 
                        key={item.id}
                        className={`hover:bg-gray-50 cursor-pointer ${hasPublished ? 'bg-green-50' : ''}`}
                        onClick={() => handleRowClick(item)}
                      >
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {truncateText(item.question)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {formatDate(item.created_at)}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getFeedbackTypeColor(item.feedback_type)}`}>
                            {formatFeedbackType(item.feedback_type)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            item.platform === 'discord' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {item.platform === 'discord' ? '💬 Discord' : '🌐 Web'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span 
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusInfo.className}`}
                            title={statusInfo.tooltip}
                          >
                            {statusInfo.display}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {draftInfo && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewDrafts(item)
                              }}
                              className="inline-flex items-center space-x-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                              title={draftInfo.title}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span>{draftInfo.display}</span>
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500">
                          {item.assigned_to_email || 'Unassigned'}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex space-x-2">
                            {!item.assigned_to && item.feedback_type !== 'correct' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleClaimQuestion(item.id)
                                }}
                                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                              >
                                Claim
                              </button>
                            )}
                            
                            {/* Show different actions based on status */}
                            {hasPublished ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleViewArticle(item)
                                }}
                                className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors flex items-center space-x-1"
                                title={`View article: ${item.published_article_title || 'Untitled'}`}
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                <span>View Article</span>
                              </button>
                            ) : item.draft_count > 0 ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleViewDrafts(item)
                                }}
                                className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors flex items-center space-x-1"
                                title="Edit existing drafts"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span>Edit Draft ({item.draft_count})</span>
                              </button>
                            ) : (item.feedback_type === 'needs_improvement' || item.feedback_type === 'incorrect') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCreateArticle(item)
                                }}
                                className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors flex items-center space-x-1"
                                title="Create Knowledge Base Article"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                <span>Create Article</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const pageNum = pagination.page <= 3 
                    ? i + 1 
                    : pagination.page >= pagination.totalPages - 2
                      ? pagination.totalPages - 4 + i
                      : pagination.page - 2 + i
                  
                  if (pageNum < 1 || pageNum > pagination.totalPages) return null
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-1 text-sm border rounded-md ${
                        pageNum === pagination.page
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Feedback Details</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-800">{selectedFeedback.question}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">AI Response</label>
                  <div className="p-3 bg-blue-50 rounded-md max-h-32 overflow-y-auto">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedFeedback.ai_response}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Feedback Type</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getFeedbackTypeColor(selectedFeedback.feedback_type)}`}>
                      {formatFeedbackType(selectedFeedback.feedback_type)}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      selectedFeedback.platform === 'discord' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {selectedFeedback.platform === 'discord' ? '💬 Discord' : '🌐 Web'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getFeedbackStatusColor(selectedFeedback.status)}`}>
                      {formatFeedbackStatus(selectedFeedback.status)}
                    </span>
                  </div>
                </div>

                {/* Discord-specific information */}
                {selectedFeedback.platform === 'discord' && (
                  <div className="bg-purple-50 p-3 rounded-md">
                    <label className="block text-sm font-medium text-purple-700 mb-2">Discord Information</label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {selectedFeedback.username && (
                        <div>
                          <span className="text-purple-600 font-medium">User:</span> {selectedFeedback.username}
                        </div>
                      )}
                      {selectedFeedback.discord_user_id && (
                        <div>
                          <span className="text-purple-600 font-medium">User ID:</span> {selectedFeedback.discord_user_id}
                        </div>
                      )}
                      {selectedFeedback.discord_channel_id && (
                        <div>
                          <span className="text-purple-600 font-medium">Channel ID:</span> {selectedFeedback.discord_channel_id}
                        </div>
                      )}
                      {selectedFeedback.message_id && (
                        <div>
                          <span className="text-purple-600 font-medium">Message ID:</span> {selectedFeedback.message_id}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminQuestions 