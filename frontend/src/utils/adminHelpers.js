import { useSupabase } from '../contexts/SupabaseContext.jsx'

// Admin role checking utilities
export const useAdminHelpers = () => {
  const { user, session, supabase } = useSupabase()

  // Check if current user is admin (you can customize this logic)
  const isAdmin = () => {
    if (!user) return false
    
    // Option 1: Check user metadata for admin role
    const userRole = user.user_metadata?.role || user.app_metadata?.role
    if (userRole === 'admin' || userRole === 'moderator') {
      return true
    }
    
    // Option 2: Check if user email is in admin list (customize this)
    const adminEmails = [
      // Add your admin emails here
      'admin@yourcompany.com',
      'support@yourcompany.com',
      // For development/testing - you can add your email here
      'test@example.com',
      'admin@test.com'
    ]
    
    return adminEmails.includes(user.email)
  }

  // Check if user can assign feedback
  const canAssignFeedback = () => {
    return isAdmin() && !!user
  }

  // Check if user can create draft articles
  const canCreateDraftArticles = () => {
    return isAdmin() && !!user
  }

  // Check if user can publish articles
  const canPublishArticles = () => {
    return isAdmin() && !!user
  }

  // Check if user can view all feedback (not just assigned)
  const canViewAllFeedback = () => {
    return isAdmin() && !!user
  }

  // Get admin dashboard access
  const hasAdminAccess = () => {
    return isAdmin() && !!session
  }

  return {
    isAdmin: isAdmin(),
    canAssignFeedback: canAssignFeedback(),
    canCreateDraftArticles: canCreateDraftArticles(),
    canPublishArticles: canPublishArticles(),
    canViewAllFeedback: canViewAllFeedback(),
    hasAdminAccess: hasAdminAccess(),
    user,
    userId: user?.id
  }
}

// Constants for feedback types and statuses
export const FEEDBACK_TYPES = {
  CORRECT: 'correct',
  INCORRECT: 'incorrect',
  NEEDS_IMPROVEMENT: 'needs_improvement'
}

export const FEEDBACK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed'
}

// Helper functions for formatting
export const formatFeedbackType = (type) => {
  const typeMap = {
    [FEEDBACK_TYPES.CORRECT]: '✅ Correct',
    [FEEDBACK_TYPES.INCORRECT]: '❌ Incorrect', 
    [FEEDBACK_TYPES.NEEDS_IMPROVEMENT]: '⚠️ Needs Improvement'
  }
  return typeMap[type] || type
}

export const formatFeedbackStatus = (status) => {
  const statusMap = {
    [FEEDBACK_STATUS.PENDING]: '⏳ Pending',
    [FEEDBACK_STATUS.IN_PROGRESS]: '🔄 In Progress',
    [FEEDBACK_STATUS.COMPLETED]: '✅ Completed'
  }
  return statusMap[status] || status
}

// Get status color for UI
export const getFeedbackStatusColor = (status) => {
  const colorMap = {
    [FEEDBACK_STATUS.PENDING]: 'bg-yellow-100 text-yellow-800',
    [FEEDBACK_STATUS.IN_PROGRESS]: 'bg-blue-100 text-blue-800', 
    [FEEDBACK_STATUS.COMPLETED]: 'bg-green-100 text-green-800'
  }
  return colorMap[status] || 'bg-gray-100 text-gray-800'
}

// Get feedback type color for UI
export const getFeedbackTypeColor = (type) => {
  const colorMap = {
    [FEEDBACK_TYPES.CORRECT]: 'bg-green-100 text-green-800',
    [FEEDBACK_TYPES.INCORRECT]: 'bg-red-100 text-red-800',
    [FEEDBACK_TYPES.NEEDS_IMPROVEMENT]: 'bg-orange-100 text-orange-800'
  }
  return colorMap[type] || 'bg-gray-100 text-gray-800'
} 