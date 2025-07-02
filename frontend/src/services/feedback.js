import { handleApiCall, createApiResponse } from './api.js'

// Feedback service class
class FeedbackService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient
    this.currentSubscription = null
  }

  // Update Supabase client reference (called from context)
  updateSupabaseClient(supabaseClient) {
    this.supabase = supabaseClient
  }

  // ============================================
  // Feedback Submissions CRUD Operations
  // ============================================

  // Submit new feedback
  async submitFeedback(feedbackData) {
    if (!this.supabase) {
      return createApiResponse(false, null, 'Supabase client not initialized', 'Failed to submit feedback')
    }

    const feedbackSubmission = {
      question: feedbackData.question,
      ai_response: feedbackData.aiResponse,
      feedback_type: feedbackData.feedbackType, // 'correct', 'incorrect', 'needs_improvement'
      user_session_id: feedbackData.userSessionId,
      category_attempted: feedbackData.categoryAttempted || null,
      status: 'pending'
    }

    const result = await handleApiCall(
      async () => {
        const { data, error } = await this.supabase
          .from('feedback_submissions')
          .insert([feedbackSubmission])
          .select()
          .single()
        
        if (error) throw error
        return { data }
      },
      'Submit feedback'
    )

    return result
  }

  // Get all feedback submissions with pagination and draft/publication status
  async getFeedbackSubmissions(options = {}) {
    if (!this.supabase) {
      return createApiResponse(false, null, 'Supabase client not initialized', 'Failed to get feedback')
    }

    const {
      page = 1,
      limit = 20,
      status = null,
      feedbackType = null,
      assignedTo = null,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options

    const offset = (page - 1) * limit

    const result = await handleApiCall(
      async () => {
        // First get the main feedback data with count
        let query = this.supabase
          .from('feedback_submissions')
          .select('*', { count: 'exact' })

        // Apply filters
        if (status) {
          query = query.eq('status', status)
        }
        if (feedbackType) {
          query = query.eq('feedback_type', feedbackType)
        }
        if (assignedTo) {
          query = query.eq('assigned_to', assignedTo)
        }

        // Apply sorting and pagination
        query = query
          .order(sortBy, { ascending: sortOrder === 'asc' })
          .range(offset, offset + limit - 1)

        const { data: feedbackData, error, count } = await query

        if (error) throw error

        // Now get draft counts for each feedback item
        const feedbackIds = feedbackData?.map(item => item.id) || []
        let draftCounts = {}
        
        if (feedbackIds.length > 0) {
          try {
            // First try the kb_articles_draft table (linked by feedback_id)
            const { data: linkedDrafts, error: linkedError } = await this.supabase
              .from('kb_articles_draft')
              .select('feedback_id')
              .in('feedback_id', feedbackIds)

            if (!linkedError && linkedDrafts) {
              linkedDrafts.forEach(draft => {
                draftCounts[draft.feedback_id] = (draftCounts[draft.feedback_id] || 0) + 1
              })
            }

            // Also check article_drafts table for drafts that might be linked by original_question
            for (const feedback of feedbackData) {
              if (feedback.question) {
                const { data: questionDrafts, error: questionError } = await this.supabase
                  .from('article_drafts')
                  .select('id')
                  .ilike('original_question', `%${feedback.question}%`)

                if (!questionError && questionDrafts) {
                  draftCounts[feedback.id] = (draftCounts[feedback.id] || 0) + questionDrafts.length
                }
              }
            }
          } catch (draftError) {
            console.warn('Error fetching draft counts:', draftError)
            // Continue with zero draft counts if table doesn't exist yet
          }
        }

        // Enhance feedback data with draft information
        const processedData = feedbackData?.map(item => ({
          ...item,
          draft_count: draftCounts[item.id] || 0,
          has_published: false, // TODO: Add published article detection later
          published_article_id: null,
          published_article_title: null,
          drafts: [] // TODO: Add actual draft data if needed
        })) || []

        return { 
          data: {
            feedback: processedData,
            totalCount: count,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
          }
        }
      },
      'Get feedback submissions with draft status'
    )

    return result
  }

  // Get feedback statistics
  async getFeedbackStats() {
    if (!this.supabase) {
      return createApiResponse(false, null, 'Supabase client not initialized', 'Failed to get stats')
    }

    const result = await handleApiCall(
      async () => {
        const { data, error } = await this.supabase
          .rpc('get_feedback_stats')

        if (error) throw error
        return { data: data[0] || {} }
      },
      'Get feedback statistics'
    )

    return result
  }

  // Get user's assigned feedback
  async getMyAssignedFeedback() {
    if (!this.supabase) {
      return createApiResponse(false, null, 'Supabase client not initialized', 'Failed to get assigned feedback')
    }

    const result = await handleApiCall(
      async () => {
        const { data, error } = await this.supabase
          .rpc('get_my_assigned_feedback')

        if (error) throw error
        return { data }
      },
      'Get assigned feedback'
    )

    return result
  }

  // Assign feedback to a user
  async assignFeedback(feedbackId, userId = null) {
    if (!this.supabase) {
      return createApiResponse(false, null, 'Supabase client not initialized', 'Failed to assign feedback')
    }

    const result = await handleApiCall(
      async () => {
        const { data, error } = await this.supabase
          .rpc('assign_feedback', { 
            feedback_id: feedbackId, 
            user_id: userId 
          })

        if (error) throw error
        return { data }
      },
      'Assign feedback'
    )

    return result
  }

  // Update feedback status
  async updateFeedbackStatus(feedbackId, status, assignedTo = null, publishedArticleId = null) {
    console.log('[FEEDBACK_SERVICE] updateFeedbackStatus called with:', {
      feedbackId,
      status,
      assignedTo,
      publishedArticleId,
      supabaseExists: !!this.supabase
    })

    if (!this.supabase) {
      console.error('[FEEDBACK_SERVICE] Supabase client not initialized')
      return createApiResponse(false, null, 'Supabase client not initialized', 'Failed to update feedback')
    }

    const updates = { status }
    if (assignedTo !== null) {
      updates.assigned_to = assignedTo
    }
    if (publishedArticleId !== null) {
      updates.published_article_id = publishedArticleId
    }

    console.log('[FEEDBACK_SERVICE] Preparing to update with:', {
      feedbackId,
      updates,
      table: 'feedback_submissions'
    })

    const result = await handleApiCall(
      async () => {
        console.log('[FEEDBACK_SERVICE] Executing Supabase update...')
        const { data, error } = await this.supabase
          .from('feedback_submissions')
          .update(updates)
          .eq('id', feedbackId)
          .select()
          .single()

        console.log('[FEEDBACK_SERVICE] Supabase update result:', {
          data,
          error,
          hasError: !!error
        })

        if (error) throw error
        return { data }
      },
      'Update feedback status'
    )

    console.log('[FEEDBACK_SERVICE] Final result:', result)
    return result
  }

  // ============================================
  // Knowledge Base Draft Articles CRUD
  // ============================================

  // Create draft article from feedback
  async createDraftArticle(draftData) {
    if (!this.supabase) {
      return createApiResponse(false, null, 'Supabase client not initialized', 'Failed to create draft')
    }

    const result = await handleApiCall(
      async () => {
        const { data, error } = await this.supabase
          .from('kb_articles_draft')
          .insert([{
            feedback_id: draftData.feedbackId,
            title: draftData.title,
            content: draftData.content,
            category_id: draftData.categoryId || null,
            subcategory_id: draftData.subcategoryId || null,
            created_by: draftData.createdBy
          }])
          .select()
          .single()

        if (error) throw error
        return { data }
      },
      'Create draft article'
    )

    return result
  }

  // Get draft articles with pagination
  async getDraftArticles(options = {}) {
    if (!this.supabase) {
      return createApiResponse(false, null, 'Supabase client not initialized', 'Failed to get drafts')
    }

    const {
      page = 1,
      limit = 20,
      createdBy = null,
      publishedStatus = null, // 'published', 'unpublished', 'all'
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options

    const offset = (page - 1) * limit

    const result = await handleApiCall(
      async () => {
        let query = this.supabase
          .from('draft_articles_with_feedback')
          .select('*')

        // Apply filters
        if (createdBy) {
          query = query.eq('created_by', createdBy)
        }
        if (publishedStatus === 'published') {
          query = query.not('published_at', 'is', null)
        } else if (publishedStatus === 'unpublished') {
          query = query.is('published_at', null)
        }

        // Apply sorting and pagination
        query = query
          .order(sortBy, { ascending: sortOrder === 'asc' })
          .range(offset, offset + limit - 1)

        const { data, error, count } = await query

        if (error) throw error

        return { 
          data: {
            drafts: data,
            totalCount: count,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
          }
        }
      },
      'Get draft articles'
    )

    return result
  }

  // Update draft article
  async updateDraftArticle(draftId, updates) {
    if (!this.supabase) {
      return createApiResponse(false, null, 'Supabase client not initialized', 'Failed to update draft')
    }

    const result = await handleApiCall(
      async () => {
        const { data, error } = await this.supabase
          .from('kb_articles_draft')
          .update(updates)
          .eq('id', draftId)
          .select()
          .single()

        if (error) throw error
        return { data }
      },
      'Update draft article'
    )

    return result
  }

  // Mark draft as published
  async publishDraftArticle(draftId, freshdeskArticleId) {
    if (!this.supabase) {
      return createApiResponse(false, null, 'Supabase client not initialized', 'Failed to publish draft')
    }

    const result = await handleApiCall(
      async () => {
        const { data, error } = await this.supabase
          .from('kb_articles_draft')
          .update({
            published_at: new Date().toISOString(),
            freshdesk_article_id: freshdeskArticleId
          })
          .eq('id', draftId)
          .select()
          .single()

        if (error) throw error
        return { data }
      },
      'Publish draft article'
    )

    return result
  }

  // Delete draft article
  async deleteDraftArticle(draftId) {
    if (!this.supabase) {
      return createApiResponse(false, null, 'Supabase client not initialized', 'Failed to delete draft')
    }

    const result = await handleApiCall(
      async () => {
        const { error } = await this.supabase
          .from('kb_articles_draft')
          .delete()
          .eq('id', draftId)

        if (error) throw error
        return { data: { success: true } }
      },
      'Delete draft article'
    )

    return result
  }

  // ============================================
  // Real-time Subscriptions
  // ============================================

  // Subscribe to feedback changes
  subscribeToFeedback(callback, options = {}) {
    if (!this.supabase) {
      console.error('Supabase client not initialized for subscription')
      return null
    }

    // Unsubscribe from previous subscription if exists
    if (this.currentSubscription) {
      this.unsubscribeFromFeedback()
    }

    const { 
      status = null, 
      assignedTo = null,
      table = 'feedback_submissions' 
    } = options

    let channel = this.supabase
      .channel('feedback-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: table,
          ...(status && { filter: `status=eq.${status}` })
        }, 
        (payload) => {
          console.log('📬 Feedback change received:', payload)
          callback(payload)
        }
      )
      .subscribe()

    this.currentSubscription = channel
    return channel
  }

  // Subscribe to draft articles changes
  subscribeToDraftArticles(callback, options = {}) {
    if (!this.supabase) {
      console.error('Supabase client not initialized for subscription')
      return null
    }

    const { createdBy = null } = options

    let channel = this.supabase
      .channel('draft-articles-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'kb_articles_draft',
          ...(createdBy && { filter: `created_by=eq.${createdBy}` })
        }, 
        (payload) => {
          console.log('📝 Draft article change received:', payload)
          callback(payload)
        }
      )
      .subscribe()

    return channel
  }

  // Unsubscribe from feedback changes
  unsubscribeFromFeedback() {
    if (this.currentSubscription) {
      this.supabase.removeChannel(this.currentSubscription)
      this.currentSubscription = null
    }
  }

  // Unsubscribe from all channels
  unsubscribeFromAll() {
    if (this.supabase) {
      this.supabase.removeAllChannels()
    }
    this.currentSubscription = null
  }

  // ============================================
  // Utility Methods
  // ============================================

  // Generate session ID for anonymous users
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Get or create session ID (stored in localStorage)
  getSessionId() {
    let sessionId = localStorage.getItem('feedback_session_id')
    if (!sessionId) {
      sessionId = this.generateSessionId()
      localStorage.setItem('feedback_session_id', sessionId)
    }
    return sessionId
  }

  // Clear session ID
  clearSessionId() {
    localStorage.removeItem('feedback_session_id')
  }
}

// Create and export singleton instance
const feedbackService = new FeedbackService()
export default feedbackService

// Named exports for specific functions
export const {
  submitFeedback,
  getFeedbackSubmissions,
  getFeedbackStats,
  getMyAssignedFeedback,
  assignFeedback,
  updateFeedbackStatus,
  createDraftArticle,
  getDraftArticles,
  updateDraftArticle,
  publishDraftArticle,
  deleteDraftArticle,
  subscribeToFeedback,
  subscribeToDraftArticles,
  unsubscribeFromFeedback,
  unsubscribeFromAll,
  generateSessionId,
  getSessionId,
  clearSessionId
} = feedbackService 