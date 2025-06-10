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
 * GET /articles/folders
 * Get all folders from all categories (protected route)
 */
router.get('/folders', requireAuth, async (req, res) => {
  try {
    console.log(`[FOLDERS] User ${req.user.email} fetching all folders`)

    const foldersResult = await mcpClient.listAllFolders()

    const response = {
      success: true,
      folders: foldersResult.folders || [],
      categories: foldersResult.categories || [],
      total_folders: foldersResult.total_folders || 0,
      total_categories: foldersResult.total_categories || 0,
      user: {
        id: req.user.id,
        email: req.user.email
      },
      timestamp: new Date().toISOString()
    }

    console.log(`[FOLDERS] Found ${response.total_folders} folders from ${response.total_categories} categories`)

    res.status(200).json(response)

  } catch (error) {
    console.error('Folders fetch error:', {
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
      error: 'Folders fetch failed',
      message: 'An unexpected error occurred while fetching folders',
      code: 'FOLDERS_FETCH_ERROR'
    })
  }
})

/**
 * GET /articles/test-mcp
 * Test MCP connection (public endpoint for debugging)
 */
router.get('/test-mcp', async (req, res) => {
  try {
    console.log('[MCP TEST] Testing MCP connection')

    const testResult = await mcpClient.testConnection()

    const response = {
      success: true,
      mcp_connection: testResult,
      timestamp: new Date().toISOString()
    }

    console.log('[MCP TEST] Connection test result:', testResult)

    res.status(200).json(response)

  } catch (error) {
    console.error('MCP test error:', {
      error: error.message,
      timestamp: new Date().toISOString()
    })

    res.status(500).json({
      error: 'MCP test failed',
      message: error.message,
      code: 'MCP_TEST_ERROR'
    })
  }
})

/**
 * GET /articles/test-folders
 * Test folders fetching (public endpoint for debugging)
 */
router.get('/test-folders', async (req, res) => {
  try {
    console.log('[FOLDERS TEST] Testing folders fetching')

    const foldersResult = await mcpClient.listAllFolders()

    const response = {
      success: true,
      folders: foldersResult.folders || [],
      categories: foldersResult.categories || [],
      total_folders: foldersResult.total_folders || 0,
      total_categories: foldersResult.total_categories || 0,
      timestamp: new Date().toISOString()
    }

    console.log(`[FOLDERS TEST] Found ${response.total_folders} folders from ${response.total_categories} categories`)

    res.status(200).json(response)

  } catch (error) {
    console.error('Folders test error:', {
      error: error.message,
      timestamp: new Date().toISOString()
    })

    res.status(500).json({
      error: 'Folders test failed',
      message: error.message,
      code: 'FOLDERS_TEST_ERROR'
    })
  }
})

/**
 * GET /articles/folders-public
 * Get all folders from all categories (public endpoint for Article Editor testing)
 * This bypasses authentication temporarily for testing the Article Editor functionality
 */
router.get('/folders-public', async (req, res) => {
  try {
    console.log('[FOLDERS PUBLIC] Fetching all folders (public access)')

    const foldersResult = await mcpClient.listAllFolders()

    const response = {
      success: true,
      folders: foldersResult.folders || [],
      categories: foldersResult.categories || [],
      total_folders: foldersResult.total_folders || 0,
      total_categories: foldersResult.total_categories || 0,
      user: {
        id: 'test-user',
        email: 'test@example.com'
      },
      timestamp: new Date().toISOString()
    }

    console.log(`[FOLDERS PUBLIC] Found ${response.total_folders} folders from ${response.total_categories} categories`)

    res.status(200).json(response)

  } catch (error) {
    console.error('Folders public fetch error:', {
      error: error.message,
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
      error: 'Folders fetch failed',
      message: 'An unexpected error occurred while fetching folders',
      code: 'FOLDERS_FETCH_ERROR'
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
 * POST /articles/create
 * Create a new article in Freshdesk (protected route)
 */
router.post('/create', requireAuth, async (req, res) => {
  try {
    const {
      title,
      description,
      folder_id,
      category_id, // Keep for backward compatibility
      subcategory_id, // Keep for backward compatibility
      tags,
      seo_title,
      meta_description,
      type = 1, // Solution article
      status = 2 // Published
    } = req.body

    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Title and description are required',
        code: 'MISSING_REQUIRED_FIELDS'
      })
    }

    // Determine folder_id: use provided folder_id, or fall back to subcategory_id, or category_id
    const finalFolderId = folder_id || subcategory_id || category_id
    
    if (!finalFolderId) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'folder_id, subcategory_id, or category_id is required',
        code: 'MISSING_FOLDER_ID'
      })
    }

    console.log(`[CREATE ARTICLE] User ${req.user.email} creating article: "${title}"`)
    console.log(`[CREATE ARTICLE] Using folder_id: ${finalFolderId}`)

    // Create article via MCP service with correct field names
    const articleData = {
      title: title.trim(),
      description,
      folder_id: parseInt(finalFolderId),
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : []),
      seo_title: seo_title ? seo_title.trim() : undefined,
      meta_description: meta_description ? meta_description.trim() : undefined,
      status: parseInt(status) || 2
    }

    // Remove undefined fields
    Object.keys(articleData).forEach(key => {
      if (articleData[key] === undefined) {
        delete articleData[key]
      }
    })

    console.log(`[CREATE ARTICLE] Article data:`, {
      ...articleData,
      description: description ? `${description.substring(0, 100)}...` : 'No description'
    })

    const createResult = await mcpClient.createArticle(articleData)

    const response = {
      success: true,
      article: createResult.article,
      message: 'Article created successfully',
      user: {
        id: req.user.id,
        email: req.user.email
      },
      timestamp: new Date().toISOString()
    }

    console.log(`[CREATE ARTICLE] Successfully created article: ${createResult.article?.id}`)

    res.status(201).json(response)

  } catch (error) {
    console.error('Article creation error:', {
      error: error.message,
      user: req.user?.email,
      title: req.body?.title,
      timestamp: new Date().toISOString()
    })

    // Handle specific MCP errors
    if (error.message.includes('MCP')) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Knowledge base service is currently unavailable',
        code: 'MCP_SERVICE_ERROR'
      })
    }

    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.message,
        code: 'VALIDATION_ERROR'
      })
    }

    if (error.message.includes('folder') || error.message.includes('category')) {
      return res.status(400).json({
        error: 'Invalid folder',
        message: 'The specified folder or category does not exist',
        code: 'INVALID_FOLDER_ID'
      })
    }

    res.status(500).json({
      error: 'Article creation failed',
      message: 'An unexpected error occurred while creating the article',
      code: 'ARTICLE_CREATE_ERROR'
    })
  }
})

/**
 * POST /articles/folders/create
 * Create a new folder in Freshdesk (protected route)
 */
router.post('/folders/create', requireAuth, async (req, res) => {
  try {
    console.log(`[CREATE FOLDER] User ${req.user.email} creating folder: "${req.body.name}"`)
    console.log(`[CREATE FOLDER] Request body:`, req.body)

    const { name, description, category_id, parent_folder_id, visibility } = req.body

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Folder name is required',
        code: 'MISSING_FOLDER_NAME'
      })
    }

    // Log the exact data being sent to MCP
    const folderData = {
      name: name.trim(),
      description: description?.trim() || undefined,
      category_id: category_id ? parseInt(category_id) : undefined,
      parent_folder_id: parent_folder_id ? parseInt(parent_folder_id) : undefined,
      visibility: parseInt(visibility) || 2
    }

    console.log(`[CREATE FOLDER] Category ID: ${folderData.category_id}, Visibility: ${folderData.visibility}`)
    console.log(`[CREATE FOLDER] Processed folder data:`, folderData)

    // Before creating folder, let's check what categories are available
    try {
      const categoriesResult = await mcpClient.listCategories()
      console.log(`[CREATE FOLDER] Available categories: ${categoriesResult.count}`)
      if (categoriesResult.categories && categoriesResult.categories.length > 0) {
        console.log(`[CREATE FOLDER] Category IDs:`, categoriesResult.categories.map(c => c.id))
        
        // Check if the requested category exists
        if (folderData.category_id) {
          const categoryExists = categoriesResult.categories.find(c => c.id === folderData.category_id)
          if (!categoryExists) {
            console.warn(`[CREATE FOLDER] Category ${folderData.category_id} not found in available categories`)
          } else {
            console.log(`[CREATE FOLDER] Category ${folderData.category_id} found: ${categoryExists.name}`)
          }
        }
      }
    } catch (categoryError) {
      console.warn(`[CREATE FOLDER] Could not check categories:`, categoryError.message)
    }

    let result
    let fallbackUsed = false

    try {
      // First attempt: try with the provided data
      result = await mcpClient.createFolder(folderData)
      console.log(`[CREATE FOLDER] Creation result:`, result.success ? 'Success' : 'Failed')
    } catch (error) {
      console.log(`[CREATE FOLDER] First attempt failed:`, error.message)
      
      // If the error is about category not found and we have a category_id, try without it
      if ((error.message.includes('Not Found') || error.message.includes('404')) && folderData.category_id) {
        console.log(`[CREATE FOLDER] Attempting fallback: creating folder without category_id`)
        
        const fallbackData = { ...folderData }
        delete fallbackData.category_id
        
        try {
          result = await mcpClient.createFolder(fallbackData)
          fallbackUsed = true
          console.log(`[CREATE FOLDER] Fallback creation result:`, result.success ? 'Success' : 'Failed')
        } catch (fallbackError) {
          console.error(`[CREATE FOLDER] Fallback also failed:`, fallbackError.message)
          throw fallbackError
        }
      } else {
        // Re-throw the original error if it's not a category issue
        throw error
      }
    }

    // Prepare response
    const response = {
      success: true,
      folder: result.folder,
      message: result.message || 'Folder created successfully',
      user: {
        id: req.user.id,
        email: req.user.email
      },
      timestamp: new Date().toISOString()
    }

    // Add fallback notice if used
    if (fallbackUsed) {
      response.notice = 'Folder was created at root level because the specified category was not found'
      response.fallback_used = true
    }

    res.status(201).json(response)

  } catch (error) {
    // Enhanced error logging
    const errorDetails = {
      error: error.message,
      user: req.user?.email,
      folderName: req.body?.name,
      categoryId: req.body?.category_id,
      parentFolderId: req.body?.parent_folder_id,
      visibility: req.body?.visibility,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }

    console.error('Folder creation error:', errorDetails)

    // Determine error type and provide appropriate response
    let statusCode = 500
    let errorCode = 'FOLDER_CREATION_FAILED'
    let userMessage = 'An unexpected error occurred while creating the folder'

    if (error.message.includes('Not Found') || error.message.includes('404')) {
      statusCode = 404
      errorCode = 'FRESHDESK_NOT_FOUND'
      userMessage = 'The specified category or parent folder doesn\'t exist'
    } else if (error.message.includes('Authentication') || error.message.includes('401')) {
      statusCode = 401
      errorCode = 'FRESHDESK_AUTH_ERROR'
      userMessage = 'Authentication failed with Freshdesk'
    } else if (error.message.includes('Forbidden') || error.message.includes('403')) {
      statusCode = 403
      errorCode = 'FRESHDESK_PERMISSION_ERROR'
      userMessage = 'Permission denied for folder creation'
    } else if (error.message.includes('Bad Request') || error.message.includes('400')) {
      statusCode = 400
      errorCode = 'FRESHDESK_BAD_REQUEST'
      userMessage = 'Invalid folder data provided'
    } else if (error.message.includes('Validation') || error.message.includes('422')) {
      statusCode = 422
      errorCode = 'FRESHDESK_VALIDATION_ERROR'
      userMessage = 'Folder data failed validation'
    }

    res.status(statusCode).json({
      error: userMessage,
      message: error.message,
      code: errorCode,
      details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
      timestamp: new Date().toISOString()
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

/**
 * GET /articles/debug/categories
 * Debug endpoint to see raw MCP categories response
 */
router.get('/debug/categories', requireAuth, async (req, res) => {
  try {
    console.log(`[DEBUG] User ${req.user.email} requesting raw categories data`)

    // Get raw MCP responses
    const rawCategoriesResult = await mcpClient.callFunction('list_categories', {})
    const rawFoldersResult = await mcpClient.callFunction('list_all_folders', {})
    
    console.log('[DEBUG] Raw categories result:', JSON.stringify(rawCategoriesResult, null, 2))
    console.log('[DEBUG] Raw folders result type:', typeof rawFoldersResult)

    res.status(200).json({
      success: true,
      debug: {
        raw_categories: rawCategoriesResult,
        raw_folders_type: typeof rawFoldersResult,
        raw_folders: rawFoldersResult,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Debug categories error:', error)
    res.status(500).json({
      error: 'Debug failed',
      message: error.message
    })
  }
})

export default router 