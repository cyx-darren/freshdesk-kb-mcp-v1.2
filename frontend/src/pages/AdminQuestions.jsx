import React, { useState, useEffect, useCallback } from 'react'
import { useFeedback } from '../hooks/useFeedback'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import AdminNavigation from '../components/AdminNavigation.jsx'
import { MessageSquare } from 'lucide-react'

const AdminQuestions = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuth()
  const { 
    feedback, 
    loading, 
    error, 
    loadFeedback, 
    subscribeToFeedback, 
    unsubscribeFromFeedback,
    assignFeedback
  } = useFeedback()

  // State
  const [selectedFeedback, setSelectedFeedback] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [filters, setFilters] = useState({
    feedbackType: '',
    status: '',
    platform: '',
    dateTo: ''
  })

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  // Load initial data
  useEffect(() => {
    // Load feedback with pagination
    const loadData = async () => {
      const result = await loadFeedback({ 
        page: pagination.page,
        limit: pagination.limit,
        status: filters.status || undefined,
        feedbackType: filters.feedbackType || undefined,
        platform: filters.platform || undefined,
        dateTo: filters.dateTo || undefined
      })
      
      // Update pagination state with total count if available
      if (result && result.success && typeof result.total === 'number') {
        setPagination(prev => ({
          ...prev,
          total: result.total,
          totalPages: result.totalPages || Math.ceil(result.total / pagination.limit)
        }))
      }
    }
    
    loadData()
    
    // Set up real-time subscriptions
    const subscription = subscribeToFeedback(
      (payload) => {
        console.log('📬 Real-time feedback update:', payload)
        loadData()
      }
    )

    return () => {
      unsubscribeFromFeedback()
    }
  }, [user, pagination.page, pagination.limit, filters])

  // Refresh data when page comes back into focus (e.g., after publishing an article)
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔄 Page focused, refreshing feedback data...')
      loadFeedback()
    }

    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [loadFeedback])

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout()
      console.log('✅ Logged out successfully')
      navigate('/login')
    } catch (error) {
      console.error('❌ Logout error:', error)
    }
  }

  // Handle row click
  const handleRowClick = (feedbackItem) => {
    setSelectedFeedback(feedbackItem)
    setShowDetailModal(true)
    console.log('📝 Viewing feedback details:', feedbackItem)
  }

  // Handle claim question
  const handleClaimQuestion = async (feedbackId) => {
    if (!user?.id) return
    
    const result = await assignFeedback(feedbackId, user.id)
    if (result.success) {
      console.log('✅ Question claimed successfully')
    }
  }

  // Handle refresh
  const handleRefresh = async () => {
    console.log('🔄 Manual refresh triggered')
    const result = await loadFeedback({ 
      page: pagination.page,
      limit: pagination.limit,
      status: filters.status || undefined,
      feedbackType: filters.feedbackType || undefined,
      platform: filters.platform || undefined,
      dateTo: filters.dateTo || undefined
    })
    
    // Update pagination state with total count if available
    if (result && result.success && typeof result.total === 'number') {
      setPagination(prev => ({
        ...prev,
        total: result.total,
        totalPages: result.totalPages || Math.ceil(result.total / pagination.limit)
      }))
    }
  }

  // Pagination handlers
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const handlePageSizeChange = (newLimit) => {
    setPagination(prev => ({ 
      ...prev, 
      limit: newLimit, 
      page: 1  // Reset to first page when changing page size
    }))
  }

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page when filtering
  }

  // Handle create article
  const handleCreateArticle = (feedbackItem) => {
    console.log('📝 Creating article for feedback:', feedbackItem.id)
    
    // Navigate to create article page with feedback data
    navigate('/admin/create-article', {
      state: {
        feedbackId: feedbackItem.id,
        question: feedbackItem.question,
        aiResponse: feedbackItem.ai_response,
        feedbackType: feedbackItem.feedback_type,
        platform: feedbackItem.platform
      }
    })
  }

  // Handle view drafts
  const handleViewDrafts = (feedbackItem) => {
    console.log('📝 Viewing drafts for feedback:', feedbackItem.id)
    
    // Navigate to drafts page with feedback data
    navigate('/admin/drafts', {
      state: {
        feedbackId: feedbackItem.id,
        question: feedbackItem.question
      }
    })
  }

  // Handle view article
  const handleViewArticle = (feedbackItem) => {
    // For now, we'll show an alert since we don't have published article info
    alert('Article viewing functionality is not currently available')
  }

  // Helper functions
  const truncateText = (text, maxLength = 60) => {
    if (!text) return ''
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return 'Invalid Date'
    }
  }

  const formatDraftCount = (count, drafts = []) => {
    if (!count || count === 0) return ''
    
    // Find the most recent draft
    const mostRecent = drafts.reduce((latest, current) => {
      return new Date(current.created_at) > new Date(latest.created_at) ? current : latest
    }, drafts[0])
    
    return `${count} draft${count > 1 ? 's' : ''} (latest: ${formatDate(mostRecent?.created_at)})`
  }

  const getEnhancedStatus = (item) => {
    const baseStatus = item.status
    
    // Check draft counts
    if (item.draft_count && item.draft_count > 0) {
      return 'draft'
    }
    
    return baseStatus
  }

  const getFeedbackTypeColor = (type) => {
    switch (type) {
      case 'correct':
        return 'bg-green-100 text-green-800'
      case 'incorrect':
        return 'bg-red-100 text-red-800'
      case 'needs_improvement':
        return 'bg-yellow-100 text-yellow-800'
      case 'partially_correct':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatFeedbackType = (type) => {
    switch (type) {
      case 'needs_improvement':
        return 'Needs Improvement'
      case 'partially_correct':
        return 'Partially Correct'
      default:
        return type.charAt(0).toUpperCase() + type.slice(1)
    }
  }

  const getFeedbackStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'published':
        return 'bg-green-100 text-green-800'
      case 'draft':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatFeedbackStatus = (status) => {
    switch (status) {
      case 'in_progress':
        return 'In Progress'
      default:
        return status.charAt(0).toUpperCase() + status.slice(1)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600 text-center">
          <p className="text-xl mb-4">Error loading feedback</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Get enhanced feedback with status calculations
  const enhancedFeedback = feedback.map(item => ({
    ...item,
    enhanced_status: getEnhancedStatus(item)
  }))

  // Apply filters
  const filteredFeedback = enhancedFeedback.filter(item => {
    if (filters.feedbackType && item.feedback_type !== filters.feedbackType) return false
    if (filters.status && item.enhanced_status !== filters.status) return false
    if (filters.platform && item.platform !== filters.platform) return false
    if (filters.dateTo) {
      const itemDate = new Date(item.created_at).toISOString().split('T')[0]
      if (itemDate > filters.dateTo) return false
    }
    return true
  })

  // Check if published
  const hasPublished = (item) => {
    // For now, we'll use a simple check based on status or other indicators
    // This can be enhanced when proper published article tracking is implemented
    return item.status === 'published' || item.enhanced_status === 'published'
  }

  // Define right actions for navigation
  const rightActions = [
    {
      label: 'Refresh',
      onClick: handleRefresh,
      title: 'Refresh feedback data'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Unified Admin Navigation */}
      <AdminNavigation
        title="Questions & Feedback Management"
        subtitle="Manage customer feedback and questions"
        logoIcon={MessageSquare}
        rightActions={rightActions}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Feedback Type</label>
              <select
                value={filters.feedbackType}
                onChange={(e) => setFilters(prev => ({ ...prev, feedbackType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="correct">Correct</option>
                <option value="incorrect">Incorrect</option>
                <option value="needs_improvement">Needs Improvement</option>
                <option value="partially_correct">Partially Correct</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="draft">Has Drafts</option>
                <option value="published">Published</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
              <select
                value={filters.platform || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, platform: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Platforms</option>
                <option value="web">Web</option>
                <option value="discord">Discord</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setFilters({ feedbackType: '', status: '', platform: '', dateTo: '' })}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Feedback table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Feedback Submissions ({filteredFeedback.length})
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI Response</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feedback</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFeedback.map((item, index) => (
                  <tr 
                    key={item.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleRowClick(item)}
                  >
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {truncateText(item.question, 60)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {truncateText(item.ai_response, 80)}
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
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getFeedbackStatusColor(item.enhanced_status)}`}>
                        {formatFeedbackStatus(item.enhanced_status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
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
                        {hasPublished(item) ? (
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
                        ) : (item.feedback_type === 'needs_improvement' || item.feedback_type === 'incorrect') ? (
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
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between items-center">
              <div className="flex items-center">
                <span className="text-sm text-gray-700">
                  Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total results)
                </span>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Items per page selector */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">Show:</span>
                  <select
                    value={pagination.limit}
                    onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                    className="border border-gray-300 rounded px-3 pr-8 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-sm text-gray-700">per page</span>
                </div>

                {/* Page navigation */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {/* Page numbers */}
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-2 text-sm rounded-md ${
                            pagination.page === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
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
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getFeedbackStatusColor(selectedFeedback.enhanced_status)}`}>
                      {formatFeedbackStatus(selectedFeedback.enhanced_status)}
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