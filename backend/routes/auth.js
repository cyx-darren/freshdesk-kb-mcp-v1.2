import express from 'express'
import supabase from '../config/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

/**
 * POST /auth/register
 * Register a new user with email, password, and username
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body

    // Validate required fields
    if (!email || !password || !username) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email, password, and username are required',
        code: 'MISSING_FIELDS',
        requiredFields: ['email', 'password', 'username']
      })
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid email format',
        code: 'INVALID_EMAIL'
      })
    }

    // Password strength validation
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Password must be at least 6 characters long',
        code: 'WEAK_PASSWORD'
      })
    }

    // Username validation
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Username must be between 3 and 30 characters',
        code: 'INVALID_USERNAME'
      })
    }

    // Check if username is already taken
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single()

    if (existingProfile) {
      return res.status(409).json({
        error: 'Username taken',
        message: 'This username is already in use',
        code: 'USERNAME_EXISTS'
      })
    }

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username
        }
      }
    })

    if (authError) {
      console.error('Registration error:', authError)
      
      let errorMessage = 'Registration failed'
      let statusCode = 400
      
      switch (authError.message) {
        case 'User already registered':
          errorMessage = 'An account with this email already exists'
          statusCode = 409
          break
        case 'Password should be at least 6 characters':
          errorMessage = 'Password must be at least 6 characters long'
          break
        default:
          errorMessage = authError.message
      }

      return res.status(statusCode).json({
        error: 'Registration failed',
        message: errorMessage,
        code: authError.name || 'REGISTRATION_ERROR'
      })
    }

    if (!authData.user) {
      return res.status(500).json({
        error: 'Registration failed',
        message: 'User creation failed',
        code: 'USER_CREATION_FAILED'
      })
    }

    // Update profile with username (the trigger should have created the profile)
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .update({ username })
      .eq('id', authData.user.id)
      .select()
      .single()

    if (profileError) {
      console.error('Profile update error:', profileError)
      // Don't fail registration if profile update fails
    }

    console.log(`[REGISTER] New user registered: ${email} (${authData.user.id})`)

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        email_confirmed_at: authData.user.email_confirmed_at,
        created_at: authData.user.created_at,
        profile: profileData || { username }
      },
      session: authData.session,
      needsEmailConfirmation: !authData.user.email_confirmed_at
    })

  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred during registration',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * POST /auth/login
 * Sign in user with email and password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      })
    }

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError) {
      console.warn('Login failed:', {
        email,
        error: authError.message,
        timestamp: new Date().toISOString()
      })

      let errorMessage = 'Login failed'
      let statusCode = 401

      switch (authError.message) {
        case 'Invalid login credentials':
          errorMessage = 'Invalid email or password'
          break
        case 'Email not confirmed':
          errorMessage = 'Please check your email and click the confirmation link'
          statusCode = 403
          break
        default:
          errorMessage = authError.message
      }

      return res.status(statusCode).json({
        error: 'Authentication failed',
        message: errorMessage,
        code: authError.name || 'LOGIN_FAILED'
      })
    }

    if (!authData.user || !authData.session) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Login failed - no user session created',
        code: 'NO_SESSION'
      })
    }

    // Update last_login in profiles table
    try {
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', authData.user.id)

      if (profileUpdateError) {
        console.warn('Failed to update last_login:', profileUpdateError.message)
      }
    } catch (updateError) {
      console.warn('Error updating last_login:', updateError.message)
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.warn('Profile fetch error:', profileError.message)
    }

    console.log(`[LOGIN] User logged in: ${email} (${authData.user.id})`)

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        email_confirmed_at: authData.user.email_confirmed_at,
        last_sign_in_at: authData.user.last_sign_in_at,
        created_at: authData.user.created_at,
        profile: profile || null
      },
      session: authData.session
    })

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred during login',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * POST /auth/logout
 * Sign out the current user
 */
router.post('/logout', async (req, res) => {
  try {
    // Extract token from Authorization header for logout
    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

    if (!token) {
      return res.status(400).json({
        error: 'No session',
        message: 'No active session to logout',
        code: 'NO_TOKEN'
      })
    }

    // Sign out from Supabase
    const { error } = await supabase.auth.signOut(token)

    if (error) {
      console.warn('Logout error:', error.message)
      // Even if logout fails, we'll return success to the client
      // since the client should invalidate their token anyway
    }

    console.log('[LOGOUT] User logged out')

    res.status(200).json({
      message: 'Logout successful'
    })

  } catch (error) {
    console.error('Logout error:', error)
    // Always return success for logout to ensure client clears token
    res.status(200).json({
      message: 'Logout completed'
    })
  }
})

/**
 * GET /auth/profile
 * Get current user's profile (protected route)
 */
router.get('/profile', requireAuth, async (req, res) => {
  try {
    // User is already attached to req.user by requireAuth middleware
    const userId = req.user.id

    // Get fresh profile data from database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        email,
        created_at,
        last_login,
        role
      `)
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      
      if (profileError.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Profile not found',
          message: 'User profile does not exist',
          code: 'PROFILE_NOT_FOUND'
        })
      }

      return res.status(500).json({
        error: 'Profile fetch failed',
        message: 'Unable to retrieve user profile',
        code: 'PROFILE_FETCH_ERROR'
      })
    }

    // Get user statistics
    const { count: searchCount } = await supabase
      .from('search_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('preferences_json')
      .eq('user_id', userId)
      .single()

    res.status(200).json({
      user: {
        ...req.user,
        profile: profile
      },
      statistics: {
        searchCount: searchCount || 0,
        hasPreferences: !!preferences
      },
      preferences: preferences?.preferences_json || {}
    })

  } catch (error) {
    console.error('Profile route error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * PUT /auth/profile
 * Update current user's profile (protected route)
 */
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const { username } = req.body

    // Validate username if provided
    if (username !== undefined) {
      if (typeof username !== 'string' || username.length < 3 || username.length > 30) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Username must be between 3 and 30 characters',
          code: 'INVALID_USERNAME'
        })
      }

      // Check if username is already taken by another user
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', userId)
        .single()

      if (existingProfile) {
        return res.status(409).json({
          error: 'Username taken',
          message: 'This username is already in use',
          code: 'USERNAME_EXISTS'
        })
      }
    }

    // Update profile
    const updateData = {}
    if (username !== undefined) updateData.username = username

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Profile update error:', updateError)
      return res.status(500).json({
        error: 'Update failed',
        message: 'Failed to update profile',
        code: 'UPDATE_ERROR'
      })
    }

    console.log(`[PROFILE UPDATE] User ${req.user.email} updated profile`)

    res.status(200).json({
      message: 'Profile updated successfully',
      profile: updatedProfile
    })

  } catch (error) {
    console.error('Profile update error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR'
    })
  }
})

export default router 