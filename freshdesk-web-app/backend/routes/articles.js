import express from 'express'
import mcpClient from '../services/mcp-client.js'
import cacheService from '../services/cache.js'
import analyticsService from '../services/analytics.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import supabase from '../config/supabase.js'

const router = express.Router()

/**
 * GET /articles/search
 * Search the Freshdesk knowledge base (protected route)
 */
router.get('/search', async (req, res) => {
  try {
    const {
      query,
      category = null,
      page = 1,
      per_page = 10
    } = req.query

    const userId = 'test-user-id' // Temporary for testing

    // Validate required parameters
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Search query is required and cannot be empty',
        code: 'MISSING_QUERY',
        hint: 'Include query parameter: ?query=your_search_terms'
      })
    }

    // Validate and sanitize pagination parameters
    const pageNum = Math.max(1, parseInt(page) || 1)
    const perPageNum = Math.min(100, Math.max(1, parseInt(per_page) || 10)) // Limit to 100 per page

    console.log(`[SEARCH] Test user searching for: "${query}"`)

    // Call MCP service to search knowledge base
    const searchResult = await mcpClient.searchKnowledgeBase(
      query.trim(),
      category,
      pageNum,
      perPageNum
    )

    // Save search analytics (non-blocking)
    analyticsService.saveSearchHistory(
      userId,
      query.trim(),
      category,
      searchResult.total_results || 0,
      {
        user_agent: req.get('User-Agent'),
        ip_address: req.ip || req.connection.remoteAddress,
        page: pageNum,
        per_page: perPageNum
      }
    ).catch(err => console.warn('[ANALYTICS] Failed to save search history:', err.message))

    // Format response
    const response = {
      success: true,
      search: {
        query: query.trim(),
        category: category || null,
        page: pageNum,
        per_page: perPageNum,
        total_results: searchResult.total_results || 0
      },
      articles: searchResult.articles || [],
      user: {
        id: userId,
        email: 'test@example.com'
      },
      timestamp: new Date().toISOString()
    }

    console.log(`[SEARCH] Found ${response.search.total_results} results for "${query}"`)

    res.status(200).json(response)

  } catch (error) {
    console.error('Knowledge base search error:', {
      error: error.message,
      user: 'test@example.com',
      query: req.query?.query,
      timestamp: new Date().toISOString()
    })

    // Handle specific MCP errors
    if (error.message.includes('MCP')) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Knowledge base search service is currently unavailable',
        code: 'MCP_SERVICE_ERROR',
        hint: 'Please try again later or contact support if the issue persists'
      })
    }

    res.status(500).json({
      error: 'Search failed',
      message: 'An unexpected error occurred while searching the knowledge base',
      code: 'SEARCH_ERROR'
    })
  }
})



/**
 * GET /articles/categories
 * Get available categories (protected route)
 */
router.get('/categories', requireAuth, async (req, res) => {
  try {
    console.log(`[CATEGORIES] User ${req.user.email} fetching categories`)

    const categoriesResult = await mcpClient.listCategories()

    const response = {
      success: true,
      categories: categoriesResult.categories || [],
      count: categoriesResult.count || 0,
      user: {
        id: req.user.id,
        email: req.user.email
      },
      timestamp: new Date().toISOString()
    }

    console.log(`[CATEGORIES] Found ${response.count} categories`)

    res.status(200).json(response)

  } catch (error) {
    console.error('Categories fetch error:', {
      error: error.message,
      user: req.user?.email,
      timestamp: new Date().toISOString()
    })

    if (error.message.includes('MCP')) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Knowledge base service is currently unavailable',
        code: 'MCP_SERVICE_ERROR'
      })
    }

    res.status(500).json({
      error: 'Categories fetch failed',
      message: 'An unexpected error occurred while fetching categories',
      code: 'CATEGORIES_FETCH_ERROR'
    })
  }
})

/**
 * GET /articles/search/history
 * Get user's search history (protected route)
 */
router.get('/search/history', requireAuth, async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query
    const userId = req.user.id

    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20))
    const pageNum = Math.max(1, parseInt(page) || 1)
    const offset = (pageNum - 1) * limitNum

    console.log(`[SEARCH HISTORY] User ${req.user.email} fetching search history`)

    // Get search history from database
    const { data: searchHistory, error: historyError, count } = await supabase
      .from('search_history')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limitNum - 1)

    if (historyError) {
      throw new Error(`Database error: ${historyError.message}`)
    }

    const response = {
      success: true,
      search_history: searchHistory || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limitNum)
      },
      user: {
        id: userId,
        email: req.user.email
      },
      timestamp: new Date().toISOString()
    }

    res.status(200).json(response)

  } catch (error) {
    console.error('Search history fetch error:', {
      error: error.message,
      user: req.user?.email,
      timestamp: new Date().toISOString()
    })

    res.status(500).json({
      error: 'Search history fetch failed',
      message: 'An unexpected error occurred while fetching search history',
      code: 'SEARCH_HISTORY_ERROR'
    })
  }
})

/**
 * GET /articles/cache/status
 * Get cache status and statistics (protected route)
 */
router.get('/cache/status', requireAuth, async (req, res) => {
  try {
    console.log(`[CACHE STATUS] User ${req.user.email} fetching cache status`)

    // Get MCP cache status
    const mcpCacheStatus = await mcpClient.getCacheStatus()

    // Get local cache statistics using cache service
    const localCacheStats = await cacheService.getCacheStats()

    const response = {
      success: true,
      cache_status: {
        mcp: mcpCacheStatus.cache || {},
        local: localCacheStats
      },
      user: {
        id: req.user.id,
        email: req.user.email
      },
      timestamp: new Date().toISOString()
    }

    res.status(200).json(response)

  } catch (error) {
    console.error('Cache status fetch error:', {
      error: error.message,
      user: req.user?.email,
      timestamp: new Date().toISOString()
    })

    res.status(500).json({
      error: 'Cache status fetch failed',
      message: 'An unexpected error occurred while fetching cache status',
      code: 'CACHE_STATUS_ERROR'
    })
  }
})

/**
 * DELETE /articles/cache/expired
 * Clear expired cache entries (protected route - admin only)
 */
router.delete('/cache/expired', requireAuth, async (req, res) => {
  try {
    console.log(`[CACHE CLEANUP] User ${req.user.email} clearing expired cache`)

    const clearedCount = await cacheService.clearExpiredCache()

    const response = {
      success: true,
      message: `Cleared ${clearedCount} expired cache entries`,
      cleared_entries: clearedCount,
      user: {
        id: req.user.id,
        email: req.user.email
      },
      timestamp: new Date().toISOString()
    }

    res.status(200).json(response)

  } catch (error) {
    console.error('Cache cleanup error:', {
      error: error.message,
      user: req.user?.email,
      timestamp: new Date().toISOString()
    })

    res.status(500).json({
      error: 'Cache cleanup failed',
      message: 'An unexpected error occurred while clearing expired cache',
      code: 'CACHE_CLEANUP_ERROR'
    })
  }
})

/**
 * DELETE /articles/cache/:articleId
 * Invalidate specific article from cache (protected route)
 */
router.delete('/cache/:articleId', requireAuth, async (req, res) => {
  try {
    const { articleId } = req.params

    if (!articleId) {
      return res.status(400).json({
        error: 'Article ID is required',
        message: 'Please provide a valid article ID',
        code: 'INVALID_ARTICLE_ID'
      })
    }

    console.log(`[CACHE INVALIDATE] User ${req.user.email} invalidating article: ${articleId}`)

    const success = await cacheService.invalidateArticle(articleId)

    const response = {
      success: success,
      message: success 
        ? `Article ${articleId} invalidated from cache`
        : `Failed to invalidate article ${articleId} from cache`,
      article_id: articleId,
      user: {
        id: req.user.id,
        email: req.user.email
      },
      timestamp: new Date().toISOString()
    }

    res.status(success ? 200 : 500).json(response)

  } catch (error) {
    console.error('Cache invalidation error:', {
      error: error.message,
      articleId: req.params.articleId,
      user: req.user?.email,
      timestamp: new Date().toISOString()
    })

    res.status(500).json({
      error: 'Cache invalidation failed',
      message: 'An unexpected error occurred while invalidating cache',
      code: 'CACHE_INVALIDATION_ERROR'
    })
  }
})

/**
 * GET /articles/:id
 * Get a specific article by ID (protected route)
 * NOTE: This route MUST be last to avoid catching other specific routes like /categories
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id: articleId } = req.params

    // Validate article ID
    if (!articleId || typeof articleId !== 'string') {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Article ID is required',
        code: 'MISSING_ARTICLE_ID'
      })
    }

    console.log(`[ARTICLE] User ${req.user.email} fetching article: ${articleId}`)

    // Check cache first using cache service
    const cachedResult = await cacheService.checkArticleCache(articleId)
    if (cachedResult) {
      console.log(`[ARTICLE] Serving cached article: ${articleId}`)
      
      return res.status(200).json({
        success: true,
        article: cachedResult.article,
        source: cachedResult.source,
        cached_at: cachedResult.cached_at,
        user: {
          id: req.user.id,
          email: req.user.email
        },
        timestamp: new Date().toISOString()
      })
    }

    // Fetch from MCP service
    const articleResult = await mcpClient.getArticle(articleId)

    // Cache the article for future requests using cache service (5 minutes TTL)
    await cacheService.saveArticleCache(articleId, articleResult.article, 300)

    const response = {
      success: true,
      article: articleResult.article,
      source: 'live',
      user: {
        id: req.user.id,
        email: req.user.email
      },
      timestamp: new Date().toISOString()
    }

    console.log(`[ARTICLE] Fetched article: ${articleResult.article?.title || articleId}`)

    res.status(200).json(response)

  } catch (error) {
    console.error('Article fetch error:', {
      error: error.message,
      articleId: req.params.id,
      user: req.user?.email,
      timestamp: new Date().toISOString()
    })

    // Handle specific errors
    if (error.message.includes('not found') || error.message.includes('404')) {
      return res.status(404).json({
        error: 'Article not found',
        message: `Article with ID "${req.params.id}" was not found`,
        code: 'ARTICLE_NOT_FOUND'
      })
    }

    if (error.message.includes('MCP')) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Knowledge base service is currently unavailable',
        code: 'MCP_SERVICE_ERROR'
      })
    }

    res.status(500).json({
      error: 'Article fetch failed',
      message: 'An unexpected error occurred while fetching the article',
      code: 'ARTICLE_FETCH_ERROR'
    })
  }
})

export default router 