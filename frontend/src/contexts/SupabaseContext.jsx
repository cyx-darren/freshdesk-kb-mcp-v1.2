import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'
import { setNavigationFunction, setCurrentUser } from '../services/api.js'
import feedbackService from '../services/feedback.js'

// Initialize Supabase client using environment variables
// Debug: Check what environment variables are being loaded
console.log('=== Supabase Environment Debug ===')
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('VITE_SUPABASE_ANON_KEY length:', import.meta.env.VITE_SUPABASE_ANON_KEY?.length)
console.log('VITE_REACT_APP_SUPABASE_URL:', import.meta.env.VITE_REACT_APP_SUPABASE_URL)
console.log('VITE_REACT_APP_SUPABASE_ANON_KEY length:', import.meta.env.VITE_REACT_APP_SUPABASE_ANON_KEY?.length)

// Try both naming conventions (VITE_ and VITE_REACT_APP_)
const supabaseUrl = import.meta.env.VITE_REACT_APP_SUPABASE_URL || 
                   import.meta.env.VITE_SUPABASE_URL || 
                   'https://vcpwtrdrahsghenmgtgy.supabase.co'

const supabaseAnonKey = import.meta.env.VITE_REACT_APP_SUPABASE_ANON_KEY || 
                       import.meta.env.VITE_SUPABASE_ANON_KEY || 
                       'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjcHd0cmRyYWhzZ2hlbm1ndGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI5Nzg3MjksImV4cCI6MjA0ODU1NDcyOX0.jVOBfuGm_cK8YFiOWOBQqmC1fHgzF8F_cGxiNQJoStHw'

console.log('Final Supabase URL:', supabaseUrl)
console.log('Final Supabase Key length:', supabaseAnonKey?.length)
console.log('=== End Debug ===');

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Initialize feedback service with Supabase client
feedbackService.updateSupabaseClient(supabase)

// Create context
const SupabaseContext = createContext({})

// Custom hook to use Supabase context
export const useSupabase = () => {
  const context = useContext(SupabaseContext)
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context
}

// Supabase Provider component
export const SupabaseProvider = ({ children }) => {
  const navigate = useNavigate()
  
  // State management
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  // Set up API service integration
  useEffect(() => {
    setNavigationFunction(navigate)
  }, [navigate])

  // Update API service when user/session changes
  useEffect(() => {
    // Pass the session (which contains access_token) to API service
    if (session?.access_token) {
      setCurrentUser({ access_token: session.access_token })
      console.log('🔑 API service updated with Supabase token')
    } else {
      setCurrentUser(null)
      console.log('🚫 API service cleared (no valid session)')
    }
  }, [session])

  // Handle session persistence and auth state changes
  useEffect(() => {
    // Get initial session from localStorage/sessionStorage
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error getting session:', error)
        } else {
          setSession(session)
          setUser(session?.user ?? null)
        }
      } catch (error) {
        console.error('Session retrieval error:', error)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    // Listen for auth state changes
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)

      // Handle different auth events
      switch (event) {
        case 'SIGNED_IN':
          console.log('User signed in:', session?.user?.email)
          break
        case 'SIGNED_OUT':
          console.log('User signed out')
          break
        case 'TOKEN_REFRESHED':
          console.log('Token refreshed')
          break
        case 'USER_UPDATED':
          console.log('User updated')
          break
        default:
          break
      }
    })

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Login function
  const login = async (email, password) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      return { data, error: null }
    } catch (error) {
      console.error('Login error:', error)
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  // Logout function
  const logout = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        throw error
      }

      // Clear local state immediately
      setUser(null)
      setSession(null)
      
      return { error: null }
    } catch (error) {
      console.error('Logout error:', error)
      return { error }
    } finally {
      setLoading(false)
    }
  }

  // Additional auth functions
  const signUp = async (email, password) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        throw error
      }

      return { data, error: null }
    } catch (error) {
      console.error('Sign up error:', error)
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  // Reset password function
  const resetPassword = async (email) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        throw error
      }

      return { data, error: null }
    } catch (error) {
      console.error('Reset password error:', error)
      return { data: null, error }
    }
  }

  // Context value with all state and functions
  const value = {
    // State
    user,
    session,
    loading,
    
    // Auth functions
    login,
    logout,
    signUp,
    resetPassword,
    
    // Supabase client for direct access if needed
    supabase,
    
    // Feedback service
    feedbackService,
    
    // Helper properties
    isAuthenticated: !!user,
    isLoading: loading,
    userId: user?.id || null,
    userEmail: user?.email || null,
  }

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  )
}

// Default export
export default SupabaseProvider

// Export supabase client for direct use in services
export { supabase } 