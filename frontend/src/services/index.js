// Main API instance
export { default as api } from './api.js'
export { createApiResponse, handleApiCall, buildQueryParams } from './api.js'

// Authentication service
export { default as authService } from './auth.js'
export {
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
} from './auth.js'

// Articles service
export { default as articleService } from './articles.js'
export {
  searchArticles,
  getArticle,
  getCategories,
  getArticlesByCategory,
  getFeaturedArticles,
  getRecentArticles,
  getRelatedArticles,
  advancedSearch,
  getArticleStats,
  recordView,
  submitFeedback,
  clearCache,
  getCacheStats,
  preloadPopularArticles
} from './articles.js'

// Combined service object for convenience
export const services = {
  auth: authService,
  articles: articleService,
  api
}

// Service health check utility
export const checkServiceHealth = async () => {
  const health = {
    timestamp: new Date().toISOString(),
    services: {}
  }

  try {
    // Check API connectivity
    const response = await api.get('/health')
    health.services.api = {
      status: 'healthy',
      responseTime: response.headers['x-response-time'] || 'unknown'
    }
  } catch (error) {
    health.services.api = {
      status: 'unhealthy',
      error: error.message
    }
  }

  try {
    // Check authentication service
    const authResult = await authService.getCurrentSession()
    health.services.auth = {
      status: 'healthy',
      authenticated: !!authResult.data
    }
  } catch (error) {
    health.services.auth = {
      status: 'unhealthy',
      error: error.message
    }
  }

  try {
    // Check articles service (cache stats)
    const cacheStats = articleService.getCacheStats()
    health.services.articles = {
      status: 'healthy',
      cache: cacheStats
    }
  } catch (error) {
    health.services.articles = {
      status: 'unhealthy',
      error: error.message
    }
  }

  return health
}

// Initialize services (call this in your app startup)
export const initializeServices = async (options = {}) => {
  console.log('🚀 Initializing services...')

  try {
    // Preload popular articles if enabled
    if (options.preloadArticles !== false) {
      await articleService.preloadPopularArticles(options.preloadLimit || 5)
    }

    // Check service health
    const health = await checkServiceHealth()
    console.log('📊 Service health check:', health)

    console.log('✅ Services initialized successfully')
    return { success: true, health }
  } catch (error) {
    console.error('❌ Service initialization failed:', error)
    return { success: false, error: error.message }
  }
}

export default services 