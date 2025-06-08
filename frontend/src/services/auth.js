import api, { handleApiCall, createApiResponse } from './api.js'
import { supabase } from '../contexts/SupabaseContext.jsx'

// Authentication service that combines Supabase auth with backend verification
class AuthService {
  constructor() {
    this.tokenKey = 'sb-vcpwtrdrahsghenmgtgy-auth-token'
  }

  // Get current session from Supabase
  async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      return createApiResponse(true, session, null, 'Session retrieved')
    } catch (error) {
      console.error('Get session error:', error)
      return createApiResponse(false, null, error.message, 'Failed to get session')
    }
  }

  // Sign in with email and password
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      // Verify with backend if needed
      const verificationResult = await this.verifyWithBackend(data.session)
      
      return createApiResponse(
        true, 
        { user: data.user, session: data.session }, 
        null, 
        'Successfully signed in'
      )
    } catch (error) {
      console.error('Sign in error:', error)
      return createApiResponse(
        false, 
        null, 
        error.message, 
        'Failed to sign in'
      )
    }
  }

  // Sign up with email and password
  async signUp(email, password, options = {}) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: options.metadata || {}
        }
      })

      if (error) throw error

      return createApiResponse(
        true, 
        data, 
        null, 
        data.user?.email_confirmed_at 
          ? 'Account created successfully' 
          : 'Please check your email for verification'
      )
    } catch (error) {
      console.error('Sign up error:', error)
      return createApiResponse(
        false, 
        null, 
        error.message, 
        'Failed to create account'
      )
    }
  }

  // Sign in with magic link
  async signInWithMagicLink(email, options = {}) {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          ...options
        }
      })

      if (error) throw error

      return createApiResponse(
        true, 
        data, 
        null, 
        'Magic link sent to your email'
      )
    } catch (error) {
      console.error('Magic link error:', error)
      return createApiResponse(
        false, 
        null, 
        error.message, 
        'Failed to send magic link'
      )
    }
  }

  // Sign out
  async signOut() {
    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      // Clear any backend session if exists
      try {
        await this.signOutFromBackend()
      } catch (backendError) {
        console.warn('Backend signout failed:', backendError)
        // Don't fail the entire signout if backend fails
      }

      return createApiResponse(
        true, 
        null, 
        null, 
        'Successfully signed out'
      )
    } catch (error) {
      console.error('Sign out error:', error)
      return createApiResponse(
        false, 
        null, 
        error.message, 
        'Failed to sign out'
      )
    }
  }

  // Reset password
  async resetPassword(email) {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) throw error

      return createApiResponse(
        true, 
        data, 
        null, 
        'Password reset email sent'
      )
    } catch (error) {
      console.error('Reset password error:', error)
      return createApiResponse(
        false, 
        null, 
        error.message, 
        'Failed to send reset email'
      )
    }
  }

  // Update password
  async updatePassword(newPassword) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      return createApiResponse(
        true, 
        data, 
        null, 
        'Password updated successfully'
      )
    } catch (error) {
      console.error('Update password error:', error)
      return createApiResponse(
        false, 
        null, 
        error.message, 
        'Failed to update password'
      )
    }
  }

  // Update user profile
  async updateProfile(updates) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: updates
      })

      if (error) throw error

      return createApiResponse(
        true, 
        data, 
        null, 
        'Profile updated successfully'
      )
    } catch (error) {
      console.error('Update profile error:', error)
      return createApiResponse(
        false, 
        null, 
        error.message, 
        'Failed to update profile'
      )
    }
  }

  // Verify session with backend (optional)
  async verifyWithBackend(session) {
    return handleApiCall(
      () => api.post('/auth/verify', { token: session?.access_token }),
      'Backend session verification'
    )
  }

  // Sign out from backend
  async signOutFromBackend() {
    return handleApiCall(
      () => api.post('/auth/logout'),
      'Backend logout'
    )
  }

  // Get user profile from backend
  async getBackendProfile() {
    return handleApiCall(
      () => api.get('/auth/profile'),
      'Get backend profile'
    )
  }

  // Refresh session manually
  async refreshSession() {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) throw error

      return createApiResponse(true, data, null, 'Session refreshed')
    } catch (error) {
      console.error('Refresh session error:', error)
      return createApiResponse(
        false, 
        null, 
        error.message, 
        'Failed to refresh session'
      )
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    try {
      const session = localStorage.getItem(this.tokenKey)
      if (!session) return false

      const parsed = JSON.parse(session)
      const expiresAt = parsed?.expires_at

      if (!expiresAt) return false

      // Check if token is expired (with 5 minute buffer)
      const now = Math.floor(Date.now() / 1000)
      const buffer = 5 * 60 // 5 minutes
      
      return expiresAt > (now + buffer)
    } catch (error) {
      console.error('Auth check error:', error)
      return false
    }
  }

  // Get access token
  getAccessToken() {
    try {
      const session = localStorage.getItem(this.tokenKey)
      if (!session) return null

      const parsed = JSON.parse(session)
      return parsed?.access_token || null
    } catch (error) {
      console.error('Get token error:', error)
      return null
    }
  }

  // Get current user from stored session
  getCurrentUser() {
    try {
      const session = localStorage.getItem(this.tokenKey)
      if (!session) return null

      const parsed = JSON.parse(session)
      return parsed?.user || null
    } catch (error) {
      console.error('Get user error:', error)
      return null
    }
  }
}

// Create and export singleton instance
const authService = new AuthService()
export default authService

// Export individual methods for convenience
export const {
  signIn,
  signUp,
  signInWithMagicLink,
  signOut,
  resetPassword,
  updatePassword,
  updateProfile,
  getCurrentSession,
  refreshSession,
  isAuthenticated,
  getAccessToken,
  getCurrentUser
} = authService 