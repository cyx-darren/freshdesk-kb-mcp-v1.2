import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useSupabase } from '../contexts/SupabaseContext.jsx'
import { authService } from '../services'

// Enhanced form validation utility
const validateRegistrationForm = (formData) => {
  const errors = {}
  
  // First name validation
  if (!formData.firstName) {
    errors.firstName = 'First name is required'
  } else if (formData.firstName.length < 2) {
    errors.firstName = 'First name must be at least 2 characters'
  } else if (!/^[a-zA-Z\s]+$/.test(formData.firstName)) {
    errors.firstName = 'First name can only contain letters and spaces'
  }
  
  // Last name validation
  if (!formData.lastName) {
    errors.lastName = 'Last name is required'
  } else if (formData.lastName.length < 2) {
    errors.lastName = 'Last name must be at least 2 characters'
  } else if (!/^[a-zA-Z\s]+$/.test(formData.lastName)) {
    errors.lastName = 'Last name can only contain letters and spaces'
  }
  
  // Email validation
  if (!formData.email) {
    errors.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = 'Please enter a valid email address'
  }
  
  // Password validation
  if (!formData.password) {
    errors.password = 'Password is required'
  } else {
    const passwordRequirements = []
    if (formData.password.length < 8) {
      passwordRequirements.push('at least 8 characters')
    }
    if (!/(?=.*[a-z])/.test(formData.password)) {
      passwordRequirements.push('one lowercase letter')
    }
    if (!/(?=.*[A-Z])/.test(formData.password)) {
      passwordRequirements.push('one uppercase letter')
    }
    if (!/(?=.*\d)/.test(formData.password)) {
      passwordRequirements.push('one number')
    }
    if (!/(?=.*[@$!%*?&])/.test(formData.password)) {
      passwordRequirements.push('one special character (@$!%*?&)')
    }
    
    if (passwordRequirements.length > 0) {
      errors.password = `Password must contain ${passwordRequirements.join(', ')}`
    }
  }
  
  // Confirm password validation
  if (!formData.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password'
  } else if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match'
  }
  
  // Company validation (optional but if provided, must be valid)
  if (formData.company && formData.company.length < 2) {
    errors.company = 'Company name must be at least 2 characters'
  }
  
  // Terms of service validation
  if (!formData.acceptTerms) {
    errors.acceptTerms = 'You must accept the terms of service'
  }
  
  return errors
}

// Password strength calculator
const calculatePasswordStrength = (password) => {
  if (!password) return { score: 0, text: '', color: 'gray' }
  
  let score = 0
  let feedback = []
  
  // Length check
  if (password.length >= 8) score += 20
  else feedback.push('8+ characters')
  
  // Lowercase check
  if (/(?=.*[a-z])/.test(password)) score += 20
  else feedback.push('lowercase letter')
  
  // Uppercase check
  if (/(?=.*[A-Z])/.test(password)) score += 20
  else feedback.push('uppercase letter')
  
  // Number check
  if (/(?=.*\d)/.test(password)) score += 20
  else feedback.push('number')
  
  // Special character check
  if (/(?=.*[@$!%*?&])/.test(password)) score += 20
  else feedback.push('special character')
  
  let text, color
  if (score < 40) {
    text = 'Weak'
    color = 'red'
  } else if (score < 60) {
    text = 'Fair'
    color = 'yellow'
  } else if (score < 80) {
    text = 'Good'
    color = 'blue'
  } else {
    text = 'Strong'
    color = 'green'
  }
  
  return { score, text, color, feedback }
}

function Register() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
    acceptMarketing: false
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: '', color: 'gray' })

  const { user, loading: authLoading } = useSupabase()
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

  // Update password strength when password changes
  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(formData.password))
  }, [formData.password])

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
    const validationErrors = validateRegistrationForm(formData)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      setLoading(false)
      return
    }

    setErrors({})

    try {
      const result = await authService.signUp(formData.email, formData.password, {
        metadata: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          company: formData.company,
          accept_marketing: formData.acceptMarketing,
          registration_date: new Date().toISOString()
        }
      })

      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: result.message || 'Account created successfully! Please check your email for verification.'
        })
        
        // Redirect to login after showing success message
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              from: location.state?.from,
              message: 'Registration successful! Please check your email to verify your account.'
            }
          })
        }, 3000)
      } else {
        setMessage({ type: 'error', text: result.error })
      }
    } catch (error) {
      console.error('Registration error:', error)
      setMessage({ type: 'error', text: 'An unexpected error occurred. Please try again.' })
    } finally {
      setLoading(false)
    }
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
      <div className="max-w-lg w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center mb-6">
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Join us to access our knowledge base
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
              Sign in here
            </Link>
          </p>
        </div>

        {/* Form */}
        <div className="bg-white shadow-xl rounded-2xl p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Global Message */}
            {message.text && (
              <div className={`p-4 rounded-lg border ${
                message.type === 'success' 
                  ? 'bg-green-50 border-green-200 text-green-800' 
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <div className="flex items-center">
                  {message.type === 'success' ? (
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <p className="text-sm font-medium">{message.text}</p>
                </div>
              </div>
            )}

            {/* Name Fields */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* First Name */}
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <div className="relative">
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    value={formData.firstName}
                    onChange={handleChange}
                    className={`input w-full pl-10 ${errors.firstName ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="John"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
              </div>

              {/* Last Name */}
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <div className="relative">
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    value={formData.lastName}
                    onChange={handleChange}
                    className={`input w-full pl-10 ${errors.lastName ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="Doe"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`input w-full pl-10 ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="john.doe@company.com"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
              </div>
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            {/* Company Field (Optional) */}
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                Company <span className="text-gray-400 text-xs">(Optional)</span>
              </label>
              <div className="relative">
                <input
                  id="company"
                  name="company"
                  type="text"
                  autoComplete="organization"
                  value={formData.company}
                  onChange={handleChange}
                  className={`input w-full pl-10 ${errors.company ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="Your company name"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
              {errors.company && <p className="mt-1 text-sm text-red-600">{errors.company}</p>}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`input w-full pl-10 pr-10 ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="Create a strong password"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('password')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Password strength:</span>
                    <span className={`font-medium text-${passwordStrength.color}-600`}>
                      {passwordStrength.text}
                    </span>
                  </div>
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full bg-${passwordStrength.color}-500 transition-all duration-300`}
                      style={{ width: `${passwordStrength.score}%` }}
                    />
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      Missing: {passwordStrength.feedback.join(', ')}
                    </p>
                  )}
                </div>
              )}
              
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>

            {/* Confirm Password Field */}
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
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`input w-full pl-10 pr-10 ${errors.confirmPassword ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="Confirm your password"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirmPassword')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
            </div>

            {/* Terms and Marketing Checkboxes */}
            <div className="space-y-4">
              {/* Terms of Service */}
              <div className="flex items-start">
                <input
                  id="acceptTerms"
                  name="acceptTerms"
                  type="checkbox"
                  checked={formData.acceptTerms}
                  onChange={handleChange}
                  className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1 ${errors.acceptTerms ? 'border-red-300' : ''}`}
                />
                <label htmlFor="acceptTerms" className="ml-3 block text-sm text-gray-700">
                  I agree to the{' '}
                  <Link to="/terms" className="text-blue-600 hover:text-blue-500 underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-blue-600 hover:text-blue-500 underline">
                    Privacy Policy
                  </Link>
                </label>
              </div>
              {errors.acceptTerms && <p className="text-sm text-red-600">{errors.acceptTerms}</p>}

              {/* Marketing Communications */}
              <div className="flex items-start">
                <input
                  id="acceptMarketing"
                  name="acceptMarketing"
                  type="checkbox"
                  checked={formData.acceptMarketing}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                />
                <label htmlFor="acceptMarketing" className="ml-3 block text-sm text-gray-700">
                  I'd like to receive updates and marketing communications (Optional)
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Creating your account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>

            {/* Sign In Link */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Register 