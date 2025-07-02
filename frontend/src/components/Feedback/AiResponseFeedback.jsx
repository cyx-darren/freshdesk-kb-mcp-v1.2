import React, { useState, useEffect } from 'react'
import { useFeedback } from '../../hooks/useFeedback.js'
import { FEEDBACK_TYPES } from '../../utils/adminHelpers.js'

const AiResponseFeedback = ({ 
  question, 
  aiResponse, 
  className = '',
  onFeedbackSubmitted = null,
  showLabels = true 
}) => {
  const [selectedFeedback, setSelectedFeedback] = useState(null)
  const [showCommentForm, setShowCommentForm] = useState(false)
  const [comment, setComment] = useState('')
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { submitFeedback, loading, error, clearError } = useFeedback()

  // Auto-clear confirmation message after 3 seconds
  useEffect(() => {
    if (showConfirmation) {
      const timer = setTimeout(() => {
        setShowConfirmation(false)
      }, 3000)
      
      return () => clearTimeout(timer)
    }
  }, [showConfirmation])

  const handleFeedbackClick = async (feedbackType) => {
    clearError()

    // For incorrect/needs improvement, show comment form
    if (feedbackType === FEEDBACK_TYPES.INCORRECT || feedbackType === FEEDBACK_TYPES.NEEDS_IMPROVEMENT) {
      setSelectedFeedback(feedbackType)
      setShowCommentForm(true)
      return
    }

    // For correct feedback, submit immediately
    await submitFeedbackWithType(feedbackType, '')
  }

  const submitFeedbackWithType = async (feedbackType, userComment = '') => {
    if (!question || !aiResponse) {
      console.error('Question and AI response are required for feedback')
      return
    }

    setIsSubmitting(true)

    try {
      const feedbackData = {
        question: question.trim(),
        aiResponse: aiResponse.trim(),
        feedbackType: feedbackType,
        categoryAttempted: null
      }

      const result = await submitFeedback(feedbackData)

      if (result.success) {
        setShowConfirmation(true)
        setSelectedFeedback(null)
        setShowCommentForm(false)
        setComment('')

        if (onFeedbackSubmitted) {
          onFeedbackSubmitted(result.data, feedbackType)
        }
      }
    } catch (err) {
      console.error('Feedback submission error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCommentSubmit = async (e) => {
    e.preventDefault()
    if (selectedFeedback) {
      await submitFeedbackWithType(selectedFeedback, comment)
    }
  }

  const handleCommentCancel = () => {
    setShowCommentForm(false)
    setSelectedFeedback(null)
    setComment('')
  }

  return (
    <div className={`feedback-component ${className}`}>
      {/* Main Feedback Buttons */}
      {!showCommentForm && (
        <div className="feedback-buttons">
          <div className="flex items-center space-x-3">
            {showLabels && (
              <span className="text-gray-600 font-medium text-sm">
                Was this helpful?
              </span>
            )}
            
            {/* Correct Button */}
            <button
              onClick={() => handleFeedbackClick(FEEDBACK_TYPES.CORRECT)}
              disabled={isSubmitting || loading}
              className="w-10 h-10 bg-green-100 hover:bg-green-200 text-green-700 rounded-full transition-all duration-200 disabled:opacity-50 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center justify-center"
              title="This response was correct and helpful"
            >
              <span className="text-base">✓</span>
            </button>

            {/* Incorrect Button */}
            <button
              onClick={() => handleFeedbackClick(FEEDBACK_TYPES.INCORRECT)}
              disabled={isSubmitting || loading}
              className="w-10 h-10 bg-red-100 hover:bg-red-200 text-red-700 rounded-full transition-all duration-200 disabled:opacity-50 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center justify-center"
              title="This response was incorrect"
            >
              <span className="text-base">✕</span>
            </button>

            {/* Needs Improvement Button */}
            <button
              onClick={() => handleFeedbackClick(FEEDBACK_TYPES.NEEDS_IMPROVEMENT)}
              disabled={isSubmitting || loading}
              className="w-10 h-10 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-full transition-all duration-200 disabled:opacity-50 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 flex items-center justify-center"
              title="This response needs improvement"
            >
              <span className="text-base">😐</span>
            </button>
          </div>

          {showLabels && (
            <div className="flex items-center space-x-3 mt-1">
              <span className="text-sm text-transparent">Placeholder</span>
              <span className="text-xs text-gray-500 text-center">Correct</span>
              <span className="text-xs text-gray-500 text-center">Wrong</span>
              <span className="text-xs text-gray-500 text-center">Improve</span>
            </div>
          )}
        </div>
      )}

      {/* Comment Form */}
      {showCommentForm && (
        <div className="comment-form mt-4 p-4 bg-gray-50 rounded-lg border">
          <div className="mb-3">
            <p className="text-gray-600 text-sm">
              {selectedFeedback === FEEDBACK_TYPES.INCORRECT 
                ? "Please let us know what was wrong with this response:"
                : "Please let us know how we can improve this response:"
              }
            </p>
          </div>

          <form onSubmit={handleCommentSubmit} className="space-y-3">
            <div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Your feedback helps us improve our AI responses..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                maxLength={500}
              />
              <div className="text-right text-xs text-gray-500 mt-1">
                {comment.length}/500
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={handleCommentCancel}
                disabled={isSubmitting}
                className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-1"
              >
                {isSubmitting && (
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                <span>{isSubmitting ? 'Submitting...' : 'Submit Feedback'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirmation Message */}
      {showConfirmation && (
        <div className="confirmation-message mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
            <div>
              <p className="text-green-800 text-sm font-medium">
                Thank you for your feedback!
              </p>
              <p className="text-green-700 text-xs">
                Your response has been recorded and will help us improve our AI.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="error-message mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">!</span>
              </div>
              <div>
                <p className="text-red-800 text-sm font-medium">
                  Failed to submit feedback
                </p>
                <p className="text-red-700 text-xs">{error}</p>
              </div>
            </div>
            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AiResponseFeedback 