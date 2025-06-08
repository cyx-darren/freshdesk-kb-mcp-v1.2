import React, { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('authToken'))

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const response = await authAPI.getProfile()
          setUser(response.data.user)
        } catch (error) {
          localStorage.removeItem('authToken')
          setToken(null)
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [token])

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials)
      const { token: newToken, user: userData } = response.data
      
      localStorage.setItem('authToken', newToken)
      setToken(newToken)
      setUser(userData)
      
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      }
    }
  }

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData)
      return { success: true, data: response.data }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Registration failed' 
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('authToken')
    setToken(null)
    setUser(null)
  }

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext 