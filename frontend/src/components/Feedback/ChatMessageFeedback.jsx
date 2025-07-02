import React, { useState, useEffect } from 'react'
import { useFeedback } from '../../hooks/useFeedback.js'
import { FEEDBACK_TYPES } from '../../utils/adminHelpers.js'

const ChatMessageFeedback = ({ 
  question, 
  aiResponse, 
  messageId,
  onFeedbackSubmitted = null 
}) => {
  const [selectedFeedback, setSelectedFeedback] = useState(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState(false)

  const { submitFeedback, loading, error, clearError } = useFeedback()

  // Auto-clear confirmation message after 2 seconds
  useEffect(() => {
    if (showConfirmation) {
      const timer = setTimeout(() => {
        setShowConfirmation(false)
      }, 2000)
      
      return () => clearTimeout(timer)
    }
  }, [showConfirmation])

  const handleFeedbackClick = async (feedbackType) => {
    if (hasSubmittedFeedback) return // Prevent multiple submissions
    
    clearError()
    setSelectedFeedback(feedbackType)
    await submitFeedbackWithType(feedbackType)
  }

  const submitFeedbackWithType = async (feedbackType) => {
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
        setHasSubmittedFeedback(true)

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

  if (hasSubmittedFeedback && showConfirmation) {
    return (
      <div className="flex items-center justify-center py-2">
        <div className="text-xs text-green-600 font-medium flex items-center space-x-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Thank you for your feedback!</span>
        </div>
      </div>
    )
  }

  if (hasSubmittedFeedback) {
    return (
      <div className="flex items-center justify-center py-2">
        <div className="text-xs text-gray-500 flex items-center space-x-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Feedback submitted</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center space-x-2 py-2">
      <span className="text-xs text-gray-500">Was this helpful?</span>
      
      {/* Correct Button */}
      <button
        onClick={() => handleFeedbackClick(FEEDBACK_TYPES.CORRECT)}
        disabled={isSubmitting || loading}
        className="w-8 h-8 bg-green-100 hover:bg-green-200 text-green-700 rounded-full transition-all duration-200 disabled:opacity-50 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 flex items-center justify-center"
        title="This response was correct and helpful"
      >
        <span className="text-sm">✓</span>
      </button>

      {/* Incorrect Button */}
      <button
        onClick={() => handleFeedbackClick(FEEDBACK_TYPES.INCORRECT)}
        disabled={isSubmitting || loading}
        className="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-700 rounded-full transition-all duration-200 disabled:opacity-50 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 flex items-center justify-center"
        title="This response was incorrect"
      >
        <span className="text-sm">✕</span>
      </button>

      {/* Needs Improvement Button */}
      <button
        onClick={() => handleFeedbackClick(FEEDBACK_TYPES.NEEDS_IMPROVEMENT)}
        disabled={isSubmitting || loading}
        className="w-8 h-8 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-full transition-all duration-200 disabled:opacity-50 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-1 flex items-center justify-center"
        title="This response needs improvement"
      >
        <span className="text-sm">😐</span>
      </button>

      {isSubmitting && (
        <div className="w-4 h-4 border border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
      )}
    </div>
  )
}

export default ChatMessageFeedback 