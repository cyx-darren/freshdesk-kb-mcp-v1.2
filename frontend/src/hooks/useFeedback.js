import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '../contexts/SupabaseContext.jsx'

export const useFeedback = () => {
  const { feedbackService, userId, isAuthenticated } = useSupabase()
  
  // State management
  const [feedback, setFeedback] = useState([])
  const [draftArticles, setDraftArticles] = useState([])
  const [feedbackStats, setFeedbackStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [realtimeSubscription, setRealtimeSubscription] = useState(null)

  // ============================================
  // Feedback Operations
  // ============================================

  // Submit feedback
  const submitFeedback = useCallback(async (feedbackData) => {
    if (!feedbackService) {
      setError('Feedback service not available')
      return { success: false, error: 'Service unavailable' }
    }

    setLoading(true)
    setError(null)

    try {
      // Get session ID for anonymous users or use user ID for authenticated users
      const sessionId = isAuthenticated && userId 
        ? `user_${userId}` 
        : feedbackService.getSessionId()

      const result = await feedbackService.submitFeedback({
        ...feedbackData,
        userSessionId: sessionId
      })

      if (result.success) {
        console.log('✅ Feedback submitted successfully:', result.data)
        // Refresh feedback list if we're showing feedback
        if (feedback.length > 0) {
          await loadFeedback()
        }
      } else {
        setError(result.error)
      }

      return result
    } catch (err) {
      const errorMessage = err.message || 'Failed to submit feedback'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [feedbackService, isAuthenticated, userId, feedback.length])

  // Load feedback with filters
  const loadFeedback = useCallback(async (options = {}) => {
    if (!feedbackService) {
      setError('Feedback service not available')
      return { success: false, error: 'Feedback service not available' }
    }

    setLoading(true)
    setError(null)

    try {
      const result = await feedbackService.getFeedbackSubmissions(options)
      
      if (result.success) {
        setFeedback(result.data.feedback || [])
        // Return the full result data including pagination info
        return {
          success: true,
          feedback: result.data.feedback || [],
          total: result.data.totalCount || 0,
          totalPages: result.data.totalPages || 0,
          page: result.data.page || 1,
          limit: result.data.limit || 20
        }
      } else {
        setError(result.error)
        setFeedback([])
        return { success: false, error: result.error }
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to load feedback'
      setError(errorMessage)
      setFeedback([])
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [feedbackService])

  // Load my assigned feedback
  const loadMyAssignedFeedback = useCallback(async () => {
    if (!feedbackService || !isAuthenticated) {
      setError('Authentication required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await feedbackService.getMyAssignedFeedback()
      
      if (result.success) {
        setFeedback(result.data || [])
        return result.data
      } else {
        setError(result.error)
        setFeedback([])
      }
    } catch (err) {
      setError(err.message || 'Failed to load assigned feedback')
      setFeedback([])
    } finally {
      setLoading(false)
    }
  }, [feedbackService, isAuthenticated])

  // Assign feedback to user
  const assignFeedback = useCallback(async (feedbackId, targetUserId = null) => {
    if (!feedbackService || !isAuthenticated) {
      setError('Authentication required')
      return { success: false, error: 'Authentication required' }
    }

    setLoading(true)
    setError(null)

    try {
      const result = await feedbackService.assignFeedback(feedbackId, targetUserId)
      
      if (result.success) {
        // Refresh feedback list
        await loadFeedback()
      } else {
        setError(result.error)
      }

      return result
    } catch (err) {
      const errorMessage = err.message || 'Failed to assign feedback'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [feedbackService, isAuthenticated, loadFeedback])

  // Update feedback status
  const updateFeedbackStatus = useCallback(async (feedbackId, status, assignedTo = null) => {
    if (!feedbackService || !isAuthenticated) {
      setError('Authentication required')
      return { success: false, error: 'Authentication required' }
    }

    setLoading(true)
    setError(null)

    try {
      const result = await feedbackService.updateFeedbackStatus(feedbackId, status, assignedTo)
      
      if (result.success) {
        // Update local state
        setFeedback(prev => prev.map(item => 
          item.id === feedbackId 
            ? { ...item, status, ...(assignedTo !== null && { assigned_to: assignedTo }) }
            : item
        ))
      } else {
        setError(result.error)
      }

      return result
    } catch (err) {
      const errorMessage = err.message || 'Failed to update feedback status'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [feedbackService, isAuthenticated])

  // ============================================
  // Draft Articles Operations
  // ============================================

  // Create draft article
  const createDraftArticle = useCallback(async (draftData) => {
    if (!feedbackService || !isAuthenticated || !userId) {
      setError('Authentication required')
      return { success: false, error: 'Authentication required' }
    }

    setLoading(true)
    setError(null)

    try {
      const result = await feedbackService.createDraftArticle({
        ...draftData,
        createdBy: userId
      })
      
      if (result.success) {
        console.log('✅ Draft article created:', result.data)
        // Refresh draft articles list if we're showing it
        if (draftArticles.length > 0) {
          await loadDraftArticles()
        }
      } else {
        setError(result.error)
      }

      return result
    } catch (err) {
      const errorMessage = err.message || 'Failed to create draft article'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [feedbackService, isAuthenticated, userId, draftArticles.length])

  // Load draft articles
  const loadDraftArticles = useCallback(async (options = {}) => {
    if (!feedbackService) {
      setError('Feedback service not available')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await feedbackService.getDraftArticles(options)
      
      if (result.success) {
        setDraftArticles(result.data.drafts || [])
        return result.data
      } else {
        setError(result.error)
        setDraftArticles([])
      }
    } catch (err) {
      setError(err.message || 'Failed to load draft articles')
      setDraftArticles([])
    } finally {
      setLoading(false)
    }
  }, [feedbackService])

  // Update draft article
  const updateDraftArticle = useCallback(async (draftId, updates) => {
    if (!feedbackService || !isAuthenticated) {
      setError('Authentication required')
      return { success: false, error: 'Authentication required' }
    }

    setLoading(true)
    setError(null)

    try {
      const result = await feedbackService.updateDraftArticle(draftId, updates)
      
      if (result.success) {
        // Update local state
        setDraftArticles(prev => prev.map(item => 
          item.id === draftId ? { ...item, ...updates } : item
        ))
      } else {
        setError(result.error)
      }

      return result
    } catch (err) {
      const errorMessage = err.message || 'Failed to update draft article'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [feedbackService, isAuthenticated])

  // Publish draft article
  const publishDraftArticle = useCallback(async (draftId, freshdeskArticleId) => {
    if (!feedbackService || !isAuthenticated) {
      setError('Authentication required')
      return { success: false, error: 'Authentication required' }
    }

    setLoading(true)
    setError(null)

    try {
      const result = await feedbackService.publishDraftArticle(draftId, freshdeskArticleId)
      
      if (result.success) {
        // Update local state
        setDraftArticles(prev => prev.map(item => 
          item.id === draftId 
            ? { 
                ...item, 
                published_at: new Date().toISOString(),
                freshdesk_article_id: freshdeskArticleId
              } 
            : item
        ))
      } else {
        setError(result.error)
      }

      return result
    } catch (err) {
      const errorMessage = err.message || 'Failed to publish draft article'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [feedbackService, isAuthenticated])

  // Delete draft article
  const deleteDraftArticle = useCallback(async (draftId) => {
    if (!feedbackService || !isAuthenticated) {
      setError('Authentication required')
      return { success: false, error: 'Authentication required' }
    }

    setLoading(true)
    setError(null)

    try {
      const result = await feedbackService.deleteDraftArticle(draftId)
      
      if (result.success) {
        // Remove from local state
        setDraftArticles(prev => prev.filter(item => item.id !== draftId))
      } else {
        setError(result.error)
      }

      return result
    } catch (err) {
      const errorMessage = err.message || 'Failed to delete draft article'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [feedbackService, isAuthenticated])

  // ============================================
  // Statistics
  // ============================================

  // Load feedback statistics
  const loadFeedbackStats = useCallback(async () => {
    if (!feedbackService) {
      setError('Feedback service not available')
      return
    }

    try {
      const result = await feedbackService.getFeedbackStats()
      
      if (result.success) {
        setFeedbackStats(result.data)
        return result.data
      } else {
        setError(result.error)
        setFeedbackStats(null)
      }
    } catch (err) {
      setError(err.message || 'Failed to load feedback statistics')
      setFeedbackStats(null)
    }
  }, [feedbackService])

  // ============================================
  // Real-time Subscriptions
  // ============================================

  // Subscribe to feedback changes
  const subscribeToFeedback = useCallback((callback, options = {}) => {
    if (!feedbackService) {
      console.error('Feedback service not available for subscription')
      return null
    }

    // Unsubscribe from existing subscription
    if (realtimeSubscription) {
      feedbackService.unsubscribeFromFeedback()
    }

    // Create new subscription
    const subscription = feedbackService.subscribeToFeedback(
      (payload) => {
        console.log('📬 Real-time feedback update:', payload)
        
        // Auto-refresh feedback list on changes
        if (feedback.length > 0) {
          loadFeedback()
        }
        
        // Call custom callback if provided
        if (callback) {
          callback(payload)
        }
      },
      options
    )

    setRealtimeSubscription(subscription)
    return subscription
  }, [feedbackService, realtimeSubscription, feedback.length, loadFeedback])

  // Unsubscribe from real-time updates
  const unsubscribeFromFeedback = useCallback(() => {
    if (feedbackService && realtimeSubscription) {
      feedbackService.unsubscribeFromFeedback()
      setRealtimeSubscription(null)
    }
  }, [feedbackService, realtimeSubscription])

  // ============================================
  // Utility Functions
  // ============================================

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Get session ID for anonymous users
  const getSessionId = useCallback(() => {
    return feedbackService?.getSessionId() || null
  }, [feedbackService])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (feedbackService && realtimeSubscription) {
        feedbackService.unsubscribeFromFeedback()
      }
    }
  }, [feedbackService, realtimeSubscription])

  return {
    // State
    feedback,
    draftArticles,
    feedbackStats,
    loading,
    error,
    
    // Feedback operations
    submitFeedback,
    loadFeedback,
    loadMyAssignedFeedback,
    assignFeedback,
    updateFeedbackStatus,
    
    // Draft article operations
    createDraftArticle,
    loadDraftArticles,
    updateDraftArticle,
    publishDraftArticle,
    deleteDraftArticle,
    
    // Statistics
    loadFeedbackStats,
    
    // Real-time
    subscribeToFeedback,
    unsubscribeFromFeedback,
    
    // Utilities
    clearError,
    getSessionId,
    
    // Status flags
    hasError: !!error,
    hasFeedback: feedback.length > 0,
    hasDraftArticles: draftArticles.length > 0,
    isAuthenticated,
    userId
  }
} 