import supabase from '../config/supabase.js'

/**
 * Extract Bearer token from Authorization header
 * @param {Request} req - Express request object
 * @returns {string|null} - JWT token or null if not found
 */
function extractBearerToken(req) {
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return null
  }
  
  // Check if header starts with 'Bearer '
  if (!authHeader.startsWith('Bearer ')) {
    return null
  }
  
  // Extract token after 'Bearer '
  const token = authHeader.substring(7)
  
  // Validate token format (basic check)
  if (!token || token.trim() === '') {
    return null
  }
  
  return token.trim()
}

/**
 * Required authentication middleware
 * Validates JWT token and attaches user to req.user
 * Returns 401 if authentication fails
 */
export async function requireAuth(req, res, next) {
  try {
    // Extract token from Authorization header
    const token = extractBearerToken(req)
    
    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No valid authorization token provided',
        code: 'MISSING_TOKEN',
        hint: 'Include Authorization header with Bearer token'
      })
    }
    
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error) {
      console.warn('Authentication failed:', {
        error: error.message,
        code: error.name,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      })
      
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid or expired token',
        code: error.name || 'INVALID_TOKEN',
        hint: 'Please login again to get a fresh token'
      })
    }
    
    if (!user) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'User not found',
        code: 'USER_NOT_FOUND',
        hint: 'Token is valid but user does not exist'
      })
    }
    
    // Get user profile from database
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.warn('Profile fetch error:', profileError.message)
      }
      
      // Attach user and profile to request
      req.user = {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        last_sign_in_at: user.last_sign_in_at,
        created_at: user.created_at,
        profile: profile || null
      }
      
      // Add user info to request for logging
      req.authenticatedUser = {
        id: user.id,
        email: user.email
      }
      
      console.log(`[AUTH] User authenticated: ${user.email} (${user.id})`)
      
    } catch (profileError) {
      console.error('Error fetching user profile:', profileError.message)
      // Continue without profile - authentication still successful
      req.user = {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        last_sign_in_at: user.last_sign_in_at,
        created_at: user.created_at,
        profile: null
      }
    }
    
    next()
    
  } catch (error) {
    console.error('Authentication middleware error:', {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    })
    
    return res.status(500).json({
      error: 'Authentication error',
      message: 'Internal server error during authentication',
      code: 'AUTH_ERROR'
    })
  }
}

/**
 * Optional authentication middleware
 * Validates token if present, but allows request to continue without authentication
 * Useful for public endpoints that may have different behavior for authenticated users
 */
export async function optionalAuth(req, res, next) {
  try {
    // Extract token from Authorization header
    const token = extractBearerToken(req)
    
    // If no token, continue without authentication
    if (!token) {
      req.user = null
      req.isAuthenticated = false
      return next()
    }
    
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      // Log warning but don't block request
      if (error) {
        console.warn('Optional auth failed:', {
          error: error.message,
          path: req.path,
          method: req.method,
          timestamp: new Date().toISOString()
        })
      }
      
      req.user = null
      req.isAuthenticated = false
      return next()
    }
    
    // Get user profile from database
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.warn('Profile fetch error in optional auth:', profileError.message)
      }
      
      // Attach user and profile to request
      req.user = {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        last_sign_in_at: user.last_sign_in_at,
        created_at: user.created_at,
        profile: profile || null
      }
      
      req.isAuthenticated = true
      
      console.log(`[OPTIONAL AUTH] User authenticated: ${user.email} (${user.id})`)
      
    } catch (profileError) {
      console.error('Error fetching user profile in optional auth:', profileError.message)
      // Continue with basic user info
      req.user = {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        last_sign_in_at: user.last_sign_in_at,
        created_at: user.created_at,
        profile: null
      }
      req.isAuthenticated = true
    }
    
    next()
    
  } catch (error) {
    console.error('Optional authentication middleware error:', {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    })
    
    // For optional auth, continue without authentication on error
    req.user = null
    req.isAuthenticated = false
    next()
  }
}

/**
 * Role-based authorization middleware
 * Requires authentication and checks for specific roles
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {Function} Express middleware function
 */
export function requireRole(allowedRoles = []) {
  return async (req, res, next) => {
    // First check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource',
        code: 'AUTH_REQUIRED'
      })
    }
    
    // Check if user has a profile with role information
    if (!req.user.profile || !req.user.profile.role) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'User role not found',
        code: 'ROLE_NOT_FOUND'
      })
    }
    
    // Check if user's role is in allowed roles
    const userRole = req.user.profile.role
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'Access denied',
        message: `Insufficient permissions. Required roles: ${allowedRoles.join(', ')}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        userRole: userRole,
        requiredRoles: allowedRoles
      })
    }
    
    console.log(`[ROLE AUTH] User ${req.user.email} authorized with role: ${userRole}`)
    next()
  }
}

/**
 * Middleware to require admin role
 */
export const requireAdmin = requireRole(['admin'])

/**
 * Helper function to check if current user can access resource
 * @param {object} req - Express request object
 * @param {string} resourceUserId - User ID that owns the resource
 * @returns {boolean} - True if user can access resource
 */
export function canAccessResource(req, resourceUserId) {
  if (!req.user) return false
  
  // User can access their own resources
  if (req.user.id === resourceUserId) return true
  
  // Admins can access all resources
  if (req.user.profile?.role === 'admin') return true
  
  return false
}

export default {
  requireAuth,
  optionalAuth,
  requireRole,
  requireAdmin,
  canAccessResource
} 