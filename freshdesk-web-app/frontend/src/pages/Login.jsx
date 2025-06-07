import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useSupabase } from '../contexts/SupabaseContext.jsx'

// Form validation utility
const validateForm = (formData, isSignUp = false) => {
  const errors = {}
  
  // Email validation
  if (!formData.email) {
    errors.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = 'Please enter a valid email address'
  }
  
  // Password validation
  if (!formData.password) {
    errors.password = 'Password is required'
  } else if (formData.password.length < 6) {
    errors.password = 'Password must be at least 6 characters long'
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
    errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  }
  
  // Confirm password validation for sign up
  if (isSignUp) {
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }
  }
  
  return errors
}

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    rememberMe: false
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [isSignUp, setIsSignUp] = useState(false)

  const { user, loading: authLoading, signIn, signUp, signInWithMagicLink } = useSupabase()
  const navigate = useNavigate()
  const location = useLocation()

  // Get the intended destination from location state
  const from = location.state?.from?.pathname || '/dashboard'

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !authLoading) {
      navigate(from, { replace: true })
    }
  }, [user, authLoading, navigate, from])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    // Clear field-specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
    
    // Clear general message
    if (message.text) {
      setMessage({ type: '', text: '' })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    // Validate form
    const validationErrors = validateForm(formData, isSignUp)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      setLoading(false)
      return
    }

    setErrors({})

    try {
      let result
      
      if (isSignUp) {
        result = await signUp(formData.email, formData.password, {
          metadata: {
            remember_me: formData.rememberMe
          }
        })
      } else {
        result = await signIn(formData.email, formData.password)
      }

      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: result.message || (isSignUp ? 'Account created successfully!' : 'Welcome back!')
        })
        
        if (!isSignUp) {
          // Redirect after successful login
          setTimeout(() => {
            navigate(from, { replace: true })
          }, 1000)
        } else {
          // For sign up, show success message
          setTimeout(() => {
            setIsSignUp(false)
            setFormData({ email: formData.email, password: '', confirmPassword: '', rememberMe: false })
          }, 2000)
        }
      } else {
        setMessage({ type: 'error', text: result.error })
      }
    } catch (error) {
      console.error('Auth error:', error)
      setMessage({ type: 'error', text: 'An unexpected error occurred. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async () => {
    if (!formData.email) {
      setErrors({ email: 'Please enter your email address' })
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setErrors({ email: 'Please enter a valid email address' })
      return
    }

    setLoading(true)
    setErrors({})
    setMessage({ type: '', text: '' })

    try {
      const result = await signInWithMagicLink(formData.email)
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message })
      } else {
        setMessage({ type: 'error', text: result.error })
      }
    } catch (error) {
      console.error('Magic link error:', error)
      setMessage({ type: 'error', text: 'Failed to send magic link. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setIsSignUp(!isSignUp)
    setErrors({})
    setMessage({ type: '', text: '' })
    setFormData({
      email: formData.email,
      password: '',
      confirmPassword: '',
      rememberMe: false
    })
  }

  const togglePasswordVisibility = (field) => {
    if (field === 'password') {
      setShowPassword(!showPassword)
    } else if (field === 'confirmPassword') {
      setShowConfirmPassword(!showConfirmPassword)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="mt-2 text-gray-600">
              {isSignUp 
                ? 'Join our knowledge base community' 
                : 'Sign in to access your account'
              }
            </p>
          </div>

          {/* Message Display */}
          {message.text && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  {message.type === 'success' ? (
                    <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{message.text}</p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={`input w-full ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Enter your email"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`input w-full pr-10 ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('password')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.05 8.05M9.878 9.878a3 3 0 004.243 4.242m0 0l1.828 1.828M9.878 9.878l-1.83-1.83" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>

            {/* Confirm Password (Sign Up only) */}
            {isSignUp && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`input w-full pr-10 ${errors.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirmPassword')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.05 8.05M9.878 9.878a3 3 0 004.243 4.242m0 0l1.828 1.828M9.878 9.878l-1.83-1.83" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
              </div>
            )}

            {/* Remember Me (Sign In only) */}
            {!isSignUp && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="rememberMe"
                    name="rememberMe"
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-900">
                    Remember me
                  </label>
                </div>
                <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
                  Forgot password?
                </Link>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-base"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  {isSignUp ? 'Creating Account...' : 'Signing In...'}
                </div>
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>

            {/* Magic Link Button (Sign In only) */}
            {!isSignUp && (
              <button
                type="button"
                onClick={handleMagicLink}
                disabled={loading}
                className="w-full btn-secondary py-3 text-base"
              >
                {loading ? 'Sending...' : 'Send Magic Link'}
              </button>
            )}
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={toggleMode}
                className="font-medium text-blue-600 hover:text-blue-700"
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login 