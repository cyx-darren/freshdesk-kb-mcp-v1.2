import React, { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '../contexts/SupabaseContext.jsx'
import LoadingDots from './LoadingDots.jsx'

const DraftsManager = ({ onEditDraft, onClose, feedbackId, originalQuestion }) => {
  const { user, supabase } = useSupabase()
  const [drafts, setDrafts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [publishingId, setPublishingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  // Debug logging
  console.log('[DraftsManager] Props received:', { 
    feedbackId, 
    originalQuestion,
    hasUser: !!user 
  })

  // Load drafts from Supabase
  const loadDrafts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Always load all user's drafts first
      const { data, error: queryError } = await supabase
        .from('article_drafts')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (queryError) {
        throw new Error(queryError.message)
      }

      setDrafts(data || [])
    } catch (err) {
      console.error('Error loading drafts:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user.id, supabase])

  useEffect(() => {
    if (user) {
      loadDrafts()
    }
  }, [user, loadDrafts])

  // Filter drafts based on feedbackId/originalQuestion and search query
  const filteredDrafts = drafts.filter(draft => {
    // First, apply feedbackId/originalQuestion filter if provided
    if (feedbackId && originalQuestion) {
      console.log('[DraftsManager] FILTERING MODE: feedbackId =', feedbackId, ', originalQuestion =', originalQuestion)
      console.log('[DraftsManager] Checking draft:', { 
        id: draft.id, 
        title: draft.title, 
        original_question: draft.original_question 
      })
      
      // Check if this draft is related to the current question
      const draftQuestion = draft.original_question?.toLowerCase().trim() || ''
      const currentQuestion = originalQuestion.toLowerCase().trim()
      
      console.log('[DraftsManager] Comparing:', {
        draftQuestion: `"${draftQuestion}"`,
        currentQuestion: `"${currentQuestion}"`
      })
      
      // Use exact match or very close match only
      const exactMatch = draftQuestion === currentQuestion
      
      // For contains match, be more strict - require at least 80% of the shorter string to match
      const minLength = Math.min(draftQuestion.length, currentQuestion.length)
      const containsMatch = minLength > 10 && (
        (draftQuestion.includes(currentQuestion) && currentQuestion.length / draftQuestion.length > 0.8) ||
        (currentQuestion.includes(draftQuestion) && draftQuestion.length / currentQuestion.length > 0.8)
      )
      
      // Much stricter word matching - require exact word matches for key terms
      const wordsMatch = () => {
        // Split into words and filter out common words
        const commonWords = ['a', 'an', 'the', 'is', 'are', 'for', 'of', 'in', 'on', 'at', 'to', 'and', 'or', 'but', 'what', 'how', 'when', 'where', 'why', 'which', 'that', 'this']
        const draftWords = draftQuestion.split(/\s+/).filter(w => w.length > 2 && !commonWords.includes(w))
        const currentWords = currentQuestion.split(/\s+/).filter(w => w.length > 2 && !commonWords.includes(w))
        
        if (draftWords.length === 0 || currentWords.length === 0) return false
        
        // Require exact word matches for at least 70% of the words
        const exactWordMatches = draftWords.filter(word => currentWords.includes(word))
        const matchPercentage = exactWordMatches.length / Math.max(draftWords.length, currentWords.length)
        
        console.log('[DraftsManager] Word analysis:', {
          draftWords,
          currentWords,
          exactWordMatches,
          matchPercentage
        })
        
        return matchPercentage >= 0.7
      }
      
      const wordMatchResult = wordsMatch()
      const isMatch = exactMatch || containsMatch || wordMatchResult
      
      console.log('[DraftsManager] Match result:', { 
        exactMatch, 
        containsMatch, 
        wordMatchResult, 
        finalMatch: isMatch 
      })
      
      if (!isMatch) {
        console.log('[DraftsManager] ❌ Draft filtered out')
        return false
      } else {
        console.log('[DraftsManager] ✅ Draft included')
      }
    }
    
    // Then apply search query filter
    if (searchQuery) {
      const searchTerm = searchQuery.toLowerCase()
      return (
        draft.title?.toLowerCase().includes(searchTerm) ||
        draft.original_question?.toLowerCase().includes(searchTerm) ||
        draft.tags?.toLowerCase().includes(searchTerm)
      )
    }
    
    return true
  })

  // Debug filtered results
  console.log('[DraftsManager] FINAL RESULT: Total drafts:', drafts.length, ', Filtered drafts:', filteredDrafts.length)
  console.log('[DraftsManager] Filtered draft IDs:', filteredDrafts.map(d => ({ id: d.id, title: d.title })))

  // Handle delete draft
  const handleDelete = async (draftId) => {
    try {
      setDeletingId(draftId)
      
      const { error } = await supabase
        .from('article_drafts')
        .delete()
        .eq('id', draftId)
        .eq('user_id', user.id)

      if (error) {
        throw new Error(error.message)
      }

      // Remove from local state
      setDrafts(prev => prev.filter(draft => draft.id !== draftId))
      setDeleteConfirm(null)
    } catch (err) {
      console.error('Error deleting draft:', err)
      setError(`Failed to delete draft: ${err.message}`)
    } finally {
      setDeletingId(null)
    }
  }

  // Handle publish draft
  const handlePublish = async (draft) => {
    try {
      setPublishingId(draft.id)
      
      // TODO: Implement publish functionality
      // This would typically create the article in Freshdesk
      console.log('Publishing draft:', draft)
      
      // For now, just show success message
      alert('Publish functionality coming soon!')
      
    } catch (err) {
      console.error('Error publishing draft:', err)
      setError(`Failed to publish draft: ${err.message}`)
    } finally {
      setPublishingId(null)
    }
  }

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffTime / (1000 * 60))

    if (diffMinutes < 5) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    if (diffDays < 7) return `${diffDays} days ago`
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Truncate text
  const truncateText = (text, maxLength = 60) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <LoadingDots />
          <p className="text-gray-600 mt-2">Loading your drafts...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.804-.833-2.574 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Drafts</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadDrafts}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
        <div>
          {feedbackId && originalQuestion ? (
            <>
              <h2 className="text-xl font-semibold text-gray-900">Drafts for this Question</h2>
              <p className="text-sm text-gray-600 mt-1">
                Question: "{originalQuestion.length > 80 ? originalQuestion.substring(0, 80) + '...' : originalQuestion}"
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {filteredDrafts.length} {filteredDrafts.length === 1 ? 'draft' : 'drafts'} found
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900">ELSA Draft Manager</h2>
              <p className="text-sm text-gray-600 mt-1">
                Manage your draft articles ({filteredDrafts.length} of {drafts.length})
              </p>
            </>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search drafts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {filteredDrafts.length === 0 ? (
          // Empty state
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md mx-auto px-6">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? 'No drafts found' : (feedbackId && originalQuestion ? 'No drafts yet for this question' : 'No drafts yet')}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery 
                  ? 'Try adjusting your search terms to find what you\'re looking for.'
                  : (feedbackId && originalQuestion 
                      ? 'No drafts have been created for this question yet. Click "Create Article" to start writing.'
                      : 'Start creating articles to see your drafts here. Drafts are automatically saved as you work.'
                    )
                }
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Clear Search
                </button>
              )}
            </div>
          </div>
        ) : (
          // Drafts table
          <div className="overflow-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  {/* Only show Original Question column when not filtering by feedbackId */}
                  {!(feedbackId && originalQuestion) && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Original Question
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Article Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Folder
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Modified
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDrafts.map((draft) => (
                  <tr 
                    key={draft.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => onEditDraft(draft)}
                  >
                    {/* Only show Original Question column when not filtering by feedbackId */}
                    {!(feedbackId && originalQuestion) && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div 
                          className="max-w-xs"
                          title={draft.original_question || 'No original question'}
                        >
                          {truncateText(draft.original_question || 'No original question')}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {draft.title || 'Untitled Draft'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {draft.status || 'Draft'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {draft.folder_id ? `Folder ID: ${draft.folder_id}` : 'No folder'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(draft.updated_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onEditDraft(draft)}
                          className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                          title="Edit draft"
                        >
                          Edit
                        </button>
                        <span className="text-gray-300">•</span>
                        <button
                          onClick={() => handlePublish(draft)}
                          disabled={publishingId === draft.id}
                          className="text-green-600 hover:text-green-800 font-medium transition-colors disabled:opacity-50"
                          title="Publish draft"
                        >
                          {publishingId === draft.id ? 'Publishing...' : 'Publish'}
                        </button>
                        <span className="text-gray-300">•</span>
                        <button
                          onClick={() => setDeleteConfirm(draft.id)}
                          disabled={deletingId === draft.id}
                          className="text-red-600 hover:text-red-800 font-medium transition-colors disabled:opacity-50"
                          title="Delete draft"
                        >
                          {deletingId === draft.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Delete Draft</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this draft? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deletingId === deleteConfirm}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deletingId === deleteConfirm ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DraftsManager 