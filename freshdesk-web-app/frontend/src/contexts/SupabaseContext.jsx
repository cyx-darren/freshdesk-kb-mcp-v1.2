import React, { createContext, useContext, useState } from 'react'

// Create context
const SupabaseContext = createContext({})

export const useSupabase = () => {
  const context = useContext(SupabaseContext)
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context
}

export const SupabaseProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(false)

  // Mock functions for now (will be replaced with real Supabase integration later)
  const signUp = async (email, password, options = {}) => {
    console.log('Mock signUp called with:', email)
    return { success: false, error: 'Authentication not configured - using mock' }
  }

  const signIn = async (email, password) => {
    console.log('Mock signIn called with:', email)
    return { success: false, error: 'Authentication not configured - using mock' }
  }

  const signInWithMagicLink = async (email, options = {}) => {
    console.log('Mock signInWithMagicLink called with:', email)
    return { success: false, error: 'Authentication not configured - using mock' }
  }

  const signOut = async () => {
    console.log('Mock signOut called')
    setUser(null)
    setSession(null)
    return { success: true }
  }

  const resetPassword = async (email) => {
    console.log('Mock resetPassword called with:', email)
    return { success: false, error: 'Authentication not configured - using mock' }
  }

  const updatePassword = async (newPassword) => {
    console.log('Mock updatePassword called')
    return { success: false, error: 'Authentication not configured - using mock' }
  }

  const updateProfile = async (updates) => {
    console.log('Mock updateProfile called with:', updates)
    return { success: false, error: 'Authentication not configured - using mock' }
  }

  const getUserProfile = async (userId = user?.id) => {
    console.log('Mock getUserProfile called with:', userId)
    return { success: false, error: 'Authentication not configured - using mock' }
  }

  const getAccessToken = () => null

  const refreshSession = async () => {
    console.log('Mock refreshSession called')
    return { success: false, error: 'Authentication not configured - using mock' }
  }

  const value = {
    user,
    session,
    loading,
    initializing,
    signUp,
    signIn,
    signInWithMagicLink,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    getUserProfile,
    getAccessToken,
    refreshSession,
    supabase: null
  }

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  )
}

export const supabase = null 