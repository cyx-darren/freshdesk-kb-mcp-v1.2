import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Get Supabase configuration from environment variables
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

// Validate required environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  const missingVars = []
  if (!supabaseUrl) missingVars.push('SUPABASE_URL')
  if (!supabaseServiceKey) missingVars.push('SUPABASE_SERVICE_KEY')
  
  console.error('❌ Missing required Supabase environment variables:', missingVars.join(', '))
  console.error('📝 Please check your .env file and ensure these variables are set:')
  console.error('   SUPABASE_URL=your_supabase_project_url')
  console.error('   SUPABASE_SERVICE_KEY=your_service_role_key')
  console.error('\n💡 You can find these values in your Supabase project dashboard:')
  console.error('   1. Go to https://supabase.com/dashboard')
  console.error('   2. Select your project')
  console.error('   3. Go to Settings > API')
  console.error('   4. Copy the URL and service_role key')
  
  throw new Error(`Missing Supabase configuration: ${missingVars.join(', ')}`)
}

// Validate URL format
try {
  new URL(supabaseUrl)
} catch (error) {
  console.error('❌ Invalid SUPABASE_URL format:', supabaseUrl)
  console.error('📝 Expected format: https://your-project.supabase.co')
  throw new Error('Invalid SUPABASE_URL format')
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      'x-application-name': 'freshdesk-web-app-backend'
    }
  }
})

/**
 * Test Supabase connection and basic functionality
 * @returns {Promise<{success: boolean, error?: string, details?: object}>}
 */
export async function checkConnection() {
  try {
    console.log('🔍 Testing Supabase connection...')
    
    // Test 1: Basic connection with a simple query
    const { data, error, count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      console.error('❌ Supabase connection failed:', error.message)
      return {
        success: false,
        error: error.message,
        details: {
          hint: error.hint,
          code: error.code,
          details: error.details
        }
      }
    }
    
    console.log('✅ Supabase connection successful!')
    console.log(`📊 Profiles table accessible (${count || 0} records)`)
    
    // Test 2: Check if we can access auth users (service key required)
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers()
      
      if (authError) {
        console.warn('⚠️  Auth admin access limited:', authError.message)
      } else {
        console.log(`🔐 Auth admin access confirmed (${authData.users?.length || 0} users)`)
      }
    } catch (authError) {
      console.warn('⚠️  Auth admin test skipped:', authError.message)
    }
    
    return {
      success: true,
      details: {
        url: supabaseUrl,
        profilesCount: count,
        timestamp: new Date().toISOString()
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error during connection test:', error.message)
    return {
      success: false,
      error: error.message,
      details: {
        type: 'unexpected_error',
        timestamp: new Date().toISOString()
      }
    }
  }
}

/**
 * Get Supabase client health status
 * @returns {object} Health information
 */
export function getHealthStatus() {
  return {
    configured: !!(supabaseUrl && supabaseServiceKey),
    url: supabaseUrl ? `${supabaseUrl.split('/')[2]}` : null, // Show domain only
    hasServiceKey: !!supabaseServiceKey,
    timestamp: new Date().toISOString()
  }
}

/**
 * Initialize Supabase connection with validation
 * @returns {Promise<boolean>} Success status
 */
export async function initializeSupabase() {
  try {
    console.log('\n🔧 Initializing Supabase connection...')
    console.log(`📡 URL: ${supabaseUrl}`)
    console.log(`🔑 Service Key: ${'*'.repeat(20)}${supabaseServiceKey.slice(-4)}`)
    
    const connectionResult = await checkConnection()
    
    if (connectionResult.success) {
      console.log('✅ Supabase initialization successful!')
      return true
    } else {
      console.error('❌ Supabase initialization failed:', connectionResult.error)
      return false
    }
  } catch (error) {
    console.error('❌ Supabase initialization error:', error.message)
    return false
  }
}

// Log configuration on module load (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('\n📋 Supabase Configuration Loaded:')
  console.log(`   URL: ${supabaseUrl}`)
  console.log(`   Service Key: Configured (${supabaseServiceKey ? '✅' : '❌'})`)
  console.log(`   Environment: ${process.env.NODE_ENV}`)
}

// Export the configured client and utilities
export default supabase
export { supabase } 