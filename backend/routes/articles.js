import express from 'express'
import mcpClient from '../services/mcp-client.js'
import cacheService from '../services/cache.js'
import analyticsService from '../services/analytics.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import supabase from '../config/supabase.js'
import folderCacheService from '../services/folderCache.js'
import errorLogger from '../services/errorLogger.js'

const router = express.Router()

/**
 * GET /articles/search
 * Search the Freshdesk knowledge base (protected route)
 */
router.get('/search', async (req, res) => {
  const startTime = Date.now()
  
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

    // Log performance
    const responseTimeMs = Date.now() - startTime
    await errorLogger.logPerformance({
      operation: 'search_knowledge_base',
      endpoint: '/api/articles/search',
      responseTimeMs,
      userId,
      statusCode: 200,
      metadata: {
        query: query.trim(),
        category,
        totalResults: searchResult.total_results || 0
      }
    })

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
    const responseTimeMs = Date.now() - startTime
    
    // Log comprehensive error
    const errorInfo = await errorLogger.logError({
      errorType: 'api_error',
      title: 'Knowledge base search failed',
      message: error.message,
      category: 'network',
      severity: error.message.includes('MCP') ? 'high' : 'medium',
      userEmail: 'test@example.com',
      requestPath: '/api/articles/search',
      requestMethod: 'GET',
      requestBody: { query: req.query?.query, category: req.query?.category },
      service: 'articles-api',
      functionName: 'search',
      mcpOperation: 'searchKnowledgeBase',
      metadata: {
        query: req.query?.query,
        responseTime: responseTimeMs
      }
    })

    console.error(`[${errorInfo.errorId}] Search error for query "${req.query?.query}":`, error.message)

    // Return user-friendly error response
    const statusCode = error.message.includes('MCP') ? 503 : 500
    res.status(statusCode).json({
      error: true,
      message: errorInfo.userMessage,
      code: errorInfo.errorId,
      severity: errorInfo.severity,
      timestamp: new Date().toISOString()
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
 * OPTIMIZED: Uses folder cache for faster responses (Task 20.4)
 */
router.get('/folders', requireAuth, async (req, res) => {
  try {
    const { force_refresh = false } = req.query
    const startTime = Date.now()
    
    console.log(`[FOLDERS] User ${req.user.email} fetching all folders${force_refresh ? ' (force refresh)' : ' (cached)'}`)

    // Use optimized folder cache instead of direct MCP call
    const foldersResult = await folderCacheService.getAllFolders(force_refresh === 'true')
    
    const performanceMs = Date.now() - startTime

    const response = {
      success: true,
      folders: foldersResult.folders || [],
      categories: foldersResult.categories || [],
      total_folders: foldersResult.total_folders || 0,
      total_categories: foldersResult.total_categories || 0,
      cache_info: foldersResult.cache_info || {},
      performance: {
        response_time_ms: performanceMs,
        source: foldersResult.cache_info?.hit ? 'cache' : 'freshdesk_api'
      },
      user: {
        id: req.user.id,
        email: req.user.email
      },
      timestamp: new Date().toISOString()
    }

    console.log(`[FOLDERS] Found ${response.total_folders} folders in ${performanceMs}ms (${response.performance.source})`)

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
 * OPTIMIZED: Uses folder cache for faster responses (Task 20.4)
 */
router.get('/test-folders', async (req, res) => {
  try {
    const { force_refresh = false } = req.query
    const startTime = Date.now()
    
    console.log(`[FOLDERS TEST] Testing folders fetching${force_refresh ? ' (force refresh)' : ' (cached)'}`)

    // Use optimized folder cache instead of direct MCP call
    const foldersResult = await folderCacheService.getAllFolders(force_refresh === 'true')
    
    const performanceMs = Date.now() - startTime

    const response = {
      success: true,
      folders: foldersResult.folders || [],
      categories: foldersResult.categories || [],
      total_folders: foldersResult.total_folders || 0,
      total_categories: foldersResult.total_categories || 0,
      cache_info: foldersResult.cache_info || {},
      performance: {
        response_time_ms: performanceMs,
        source: foldersResult.cache_info?.hit ? 'cache' : 'freshdesk_api'
      },
      timestamp: new Date().toISOString()
    }

    console.log(`[FOLDERS TEST] Found ${response.total_folders} folders in ${performanceMs}ms (${response.performance.source})`)

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
 * OPTIMIZED: Uses folder cache for faster responses (Task 20.4)
 * This bypasses authentication temporarily for testing the Article Editor functionality
 */
router.get('/folders-public', async (req, res) => {
  try {
    const { force_refresh = false } = req.query
    const startTime = Date.now()
    
    console.log(`[FOLDERS PUBLIC] Fetching all folders (public access)${force_refresh ? ' (force refresh)' : ' (cached)'}`)

    // Use optimized folder cache instead of direct MCP call
    const foldersResult = await folderCacheService.getAllFolders(force_refresh === 'true')
    
    const performanceMs = Date.now() - startTime

    const response = {
      success: true,
      folders: foldersResult.folders || [],
      categories: foldersResult.categories || [],
      total_folders: foldersResult.total_folders || 0,
      total_categories: foldersResult.total_categories || 0,
      cache_info: foldersResult.cache_info || {},
      performance: {
        response_time_ms: performanceMs,
        source: foldersResult.cache_info?.hit ? 'cache' : 'freshdesk_api'
      },
      user: {
        id: 'test-user',
        email: 'test@example.com'
      },
      timestamp: new Date().toISOString()
    }

    console.log(`[FOLDERS PUBLIC] Found ${response.total_folders} folders in ${performanceMs}ms (${response.performance.source})`)

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
  const startTime = Date.now()
  
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

    // Log successful performance
    const responseTimeMs = Date.now() - startTime
    await errorLogger.logPerformance({
      operation: 'create_article',
      endpoint: '/api/articles/create',
      responseTimeMs,
      userId: req.user.id,
      statusCode: 201,
      metadata: {
        title: title.trim(),
        folderId: finalFolderId,
        articleId: createResult.article?.id
      }
    })

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
    const responseTimeMs = Date.now() - startTime
    
    // Log comprehensive error
    const errorInfo = await errorLogger.logError({
      errorType: 'article_creation_failed',
      title: 'Article creation failed',
      message: error.message,
      category: 'validation',
      severity: 'medium',
      userId: req.user?.id,
      userEmail: req.user?.email,
      requestPath: '/api/articles/create',
      requestMethod: 'POST',
      requestBody: { title: req.body?.title, folder_id: req.body?.folder_id },
      service: 'articles-api',
      functionName: 'createArticle',
      freshdeskFolderId: req.body?.folder_id,
      mcpOperation: 'createArticle',
      metadata: {
        title: req.body?.title,
        responseTime: responseTimeMs
      }
    })

    console.error(`[${errorInfo.errorId}] Article creation failed for "${req.body?.title}":`, error.message)

    // Determine appropriate status code
    let statusCode = 500
    if (error.message.includes('validation') || error.message.includes('invalid')) {
      statusCode = 400
    } else if (error.message.includes('folder') || error.message.includes('category')) {
      statusCode = 400
    } else if (error.message.includes('MCP')) {
      statusCode = 503
    }

    res.status(statusCode).json({
      error: true,
      message: errorInfo.userMessage,
      code: errorInfo.errorId,
      severity: errorInfo.severity,
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * POST /articles/folders/create
 * Create a new folder in Freshdesk (protected route)
 */
router.post('/folders/create', requireAuth, async (req, res) => {
  const startTime = Date.now()
  
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
    let categoryName = null
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
            categoryName = categoryExists.name
            console.log(`[CREATE FOLDER] Category ${folderData.category_id} found: ${categoryExists.name}`)
          }
        }
      }
    } catch (categoryError) {
      console.warn(`[CREATE FOLDER] Could not check categories:`, categoryError.message)
    }

    let result
    let fallbackUsed = false
    let retryCount = 0

    try {
      // First attempt: try with the provided data
      result = await mcpClient.createFolder(folderData)
      console.log(`[CREATE FOLDER] Creation result:`, result.success ? 'Success' : 'Failed')
    } catch (error) {
      console.log(`[CREATE FOLDER] First attempt failed:`, error.message)
      retryCount++
      
      // If the error is about category not found and we have a category_id, try without it
      if ((error.message.includes('Not Found') || error.message.includes('404')) && folderData.category_id) {
        console.log(`[CREATE FOLDER] Attempting fallback: creating folder without category_id`)
        
        const fallbackData = { ...folderData }
        delete fallbackData.category_id
        
        try {
          result = await mcpClient.createFolder(fallbackData)
          fallbackUsed = true
          retryCount++
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

    // Log successful folder creation
    const responseTimeMs = Date.now() - startTime
    
    await errorLogger.logFolderCreation({
      operationType: 'create_folder',
      operationStatus: 'success',
      folderName: name.trim(),
      folderDescription: description?.trim(),
      categoryId: category_id?.toString(),
      categoryName: categoryName,
      parentFolderId: parent_folder_id?.toString(),
      visibility: parseInt(visibility) || 2,
      userId: req.user.id,
      userEmail: req.user.email,
      responseTimeMs,
      retryCount,
      fallbackUsed,
      successData: result,
      mcpResponseStatus: 201
    })

    await errorLogger.logPerformance({
      operation: 'create_folder',
      endpoint: '/api/articles/folders/create',
      responseTimeMs,
      userId: req.user.id,
      statusCode: 201,
      metadata: {
        folderName: name.trim(),
        categoryId: category_id,
        fallbackUsed
      }
    })

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
    const responseTimeMs = Date.now() - startTime
    
    // Log comprehensive error
    const errorInfo = await errorLogger.logError({
      errorType: 'folder_creation_failed',
      title: 'Folder creation failed',
      message: error.message,
      category: 'validation',
      severity: error.message.includes('Not Found') ? 'medium' : 'high',
      userId: req.user?.id,
      userEmail: req.user?.email,
      requestPath: '/api/articles/folders/create',
      requestMethod: 'POST',
      requestBody: req.body,
      service: 'articles-api',
      functionName: 'createFolder',
      freshdeskCategoryId: req.body?.category_id,
      mcpOperation: 'createFolder',
      metadata: {
        folderName: req.body?.name,
        responseTime: responseTimeMs
      },
      stackTrace: error.stack
    })

    // Log failed folder creation attempt
    await errorLogger.logFolderCreation({
      operationType: 'create_folder',
      operationStatus: 'failed',
      folderName: req.body?.name,
      folderDescription: req.body?.description,
      categoryId: req.body?.category_id?.toString(),
      parentFolderId: req.body?.parent_folder_id?.toString(),
      visibility: parseInt(req.body?.visibility) || 2,
      userId: req.user?.id,
      userEmail: req.user?.email,
      responseTimeMs,
      errorData: {
        message: error.message,
        stack: error.stack
      },
      errorLogId: errorInfo.errorLogId
    })

    console.error(`[${errorInfo.errorId}] Folder creation failed for "${req.body?.name}":`, error.message)

    // Determine error type and provide appropriate response
    let statusCode = 500
    if (error.message.includes('Not Found') || error.message.includes('404')) {
      statusCode = 404
    } else if (error.message.includes('Authentication') || error.message.includes('401')) {
      statusCode = 401
    } else if (error.message.includes('Forbidden') || error.message.includes('403')) {
      statusCode = 403
    } else if (error.message.includes('Bad Request') || error.message.includes('400')) {
      statusCode = 400
    } else if (error.message.includes('Validation') || error.message.includes('422')) {
      statusCode = 422
    }

    res.status(statusCode).json({
      error: true,
      message: errorInfo.userMessage,
      code: errorInfo.errorId,
      severity: errorInfo.severity,
      details: process.env.NODE_ENV === 'development' ? {
        technical_message: error.message,
        stack: error.stack
      } : undefined,
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * GET /articles/admin/error-stats
 * Get error statistics for monitoring (admin only)
 */
router.get('/admin/error-stats', requireAuth, async (req, res) => {
  try {
    // Check if user is admin (simple check for now)
    if (!req.user.email.includes('admin') && req.user.email !== 'darren@easyprintsg.com') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Admin access required',
        code: 'ADMIN_REQUIRED'
      })
    }

    const { hours = 24 } = req.query
    const timeframeHours = Math.min(168, Math.max(1, parseInt(hours))) // Limit to 1 week

    console.log(`[ERROR STATS] Admin ${req.user.email} requesting error stats for ${timeframeHours} hours`)

    const stats = await errorLogger.getErrorStatistics(timeframeHours)
    
    if (!stats) {
      return res.status(500).json({
        error: 'Failed to retrieve error statistics',
        code: 'STATS_UNAVAILABLE'
      })
    }

    const response = {
      success: true,
      timeframe: {
        hours: timeframeHours,
        from: new Date(Date.now() - timeframeHours * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString()
      },
      statistics: stats,
      user: {
        id: req.user.id,
        email: req.user.email
      },
      timestamp: new Date().toISOString()
    }

    res.status(200).json(response)

  } catch (error) {
    console.error('[ERROR STATS] Failed to get error statistics:', error)
    
    res.status(500).json({
      error: 'Failed to retrieve error statistics',
      message: error.message,
      code: 'STATS_ERROR',
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
  const startTime = Date.now()
  
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
      
      // Log performance for cached request
      const responseTimeMs = Date.now() - startTime
      await errorLogger.logPerformance({
        operation: 'fetch_article',
        endpoint: `/api/articles/${articleId}`,
        responseTimeMs,
        userId: req.user.id,
        statusCode: 200,
        cacheHit: true,
        metadata: {
          articleId,
          source: 'cache'
        }
      })
      
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

    // Log performance for live request
    const responseTimeMs = Date.now() - startTime
    await errorLogger.logPerformance({
      operation: 'fetch_article',
      endpoint: `/api/articles/${articleId}`,
      responseTimeMs,
      userId: req.user.id,
      statusCode: 200,
      cacheHit: false,
      metadata: {
        articleId,
        source: 'live'
      }
    })

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
    const responseTimeMs = Date.now() - startTime
    
    // Log comprehensive error
    const errorInfo = await errorLogger.logError({
      errorType: 'api_error',
      title: 'Article fetch failed',
      message: error.message,
      category: 'network',
      severity: error.message.includes('not found') ? 'low' : 'medium',
      userId: req.user?.id,
      userEmail: req.user?.email,
      requestPath: `/api/articles/${req.params.id}`,
      requestMethod: 'GET',
      service: 'articles-api',
      functionName: 'getArticle',
      mcpOperation: 'getArticle',
      metadata: {
        articleId: req.params.id,
        responseTime: responseTimeMs
      }
    })

    console.error(`[${errorInfo.errorId}] Article fetch failed for ID "${req.params.id}":`, error.message)

    // Handle specific errors
    if (error.message.includes('not found') || error.message.includes('404')) {
      return res.status(404).json({
        error: true,
        message: `Article with ID "${req.params.id}" was not found. It may have been moved or deleted.`,
        code: errorInfo.errorId,
        severity: 'low',
        timestamp: new Date().toISOString()
      })
    }

    if (error.message.includes('MCP')) {
      return res.status(503).json({
        error: true,
        message: 'The knowledge base service is temporarily unavailable. Please try again in a few minutes.',
        code: errorInfo.errorId,
        severity: 'medium',
        timestamp: new Date().toISOString()
      })
    }

    res.status(500).json({
      error: true,
      message: errorInfo.userMessage,
      code: errorInfo.errorId,
      severity: errorInfo.severity,
      timestamp: new Date().toISOString()
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