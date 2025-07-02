import api, { handleApiCall, createApiResponse, buildQueryParams } from './api.js'

// In-memory cache for articles
class ArticleCache {
  constructor(maxSize = 100, ttl = 5 * 60 * 1000) { // 5 minutes TTL
    this.cache = new Map()
    this.maxSize = maxSize
    this.ttl = ttl
  }

  set(key, value) {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    this.cache.set(key, {
      data: value,
      timestamp: Date.now()
    })
  }

  get(key) {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  clear() {
    this.cache.clear()
  }

  has(key) {
    const entry = this.cache.get(key)
    if (!entry) return false
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }
}

// Article service class
class ArticleService {
  constructor() {
    this.cache = new ArticleCache()
    this.searchCache = new ArticleCache(50, 2 * 60 * 1000) // 2 minute TTL for searches
    this.categoriesCache = null
    this.categoriesCacheTimestamp = null
    this.categoriesTTL = 10 * 60 * 1000 // 10 minutes
  }

  // Search articles with advanced options
  async searchArticles(query, options = {}) {
    const searchOptions = {
      query: query?.trim() || '',
      page: options.page || 1,
      per_page: options.per_page || 10,
      category: options.category || '',
      sort_by: options.sort_by || 'relevance',
      sort_order: options.sort_order || 'desc',
      include_archived: options.include_archived || false,
      ...options
    }

    // Create cache key
    const cacheKey = `search:${JSON.stringify(searchOptions)}`
    
    // Check cache first
    const cachedResult = this.searchCache.get(cacheKey)
    if (cachedResult && !options.skipCache) {
      console.log('📖 Using cached search results')
      return createApiResponse(true, cachedResult, null, 'Search results (cached)')
    }

    const result = await handleApiCall(
      () => api.get('/articles/search', { 
        params: buildQueryParams(searchOptions) 
      }),
      'Article search'
    )

    // Cache successful results
    if (result.success && result.data) {
      this.searchCache.set(cacheKey, result.data)
    }

    return result
  }

  // Get a single article by ID
  async getArticle(id, options = {}) {
    if (!id) {
      return createApiResponse(false, null, 'Article ID is required', 'Invalid article ID')
    }

    const cacheKey = `article:${id}`
    
    // Check cache first
    if (!options.skipCache) {
      const cachedArticle = this.cache.get(cacheKey)
      if (cachedArticle) {
        console.log(`📖 Using cached article: ${id}`)
        return createApiResponse(true, cachedArticle, null, 'Article retrieved (cached)')
      }
    }

    const result = await handleApiCall(
      () => api.get(`/articles/${id}`, { 
        params: buildQueryParams({
          include_content: options.include_content !== false,
          include_metadata: options.include_metadata || false
        })
      }),
      `Get article ${id}`
    )

    // Cache successful results
    if (result.success && result.data) {
      this.cache.set(cacheKey, result.data)
    }

    return result
  }

  // Get article categories
  async getCategories(options = {}) {
    // Check cache first
    if (!options.skipCache && this.categoriesCache && this.categoriesCacheTimestamp) {
      const cacheAge = Date.now() - this.categoriesCacheTimestamp
      if (cacheAge < this.categoriesTTL) {
        console.log('📖 Using cached categories')
        return createApiResponse(true, this.categoriesCache, null, 'Categories retrieved (cached)')
      }
    }

    const result = await handleApiCall(
      () => api.get('/articles/categories', { 
        params: buildQueryParams({
          include_count: options.include_count !== false,
          include_archived: options.include_archived || false
        })
      }),
      'Get article categories'
    )

    // Cache successful results
    if (result.success && result.data) {
      this.categoriesCache = result.data
      this.categoriesCacheTimestamp = Date.now()
    }

    return result
  }

  // Get articles by category
  async getArticlesByCategory(categoryId, options = {}) {
    if (!categoryId) {
      return createApiResponse(false, null, 'Category ID is required', 'Invalid category ID')
    }

    const searchOptions = {
      page: options.page || 1,
      per_page: options.per_page || 10,
      sort_by: options.sort_by || 'created_at',
      sort_order: options.sort_order || 'desc',
      include_archived: options.include_archived || false
    }

    return handleApiCall(
      () => api.get(`/articles/categories/${categoryId}/articles`, { 
        params: buildQueryParams(searchOptions)
      }),
      `Get articles for category ${categoryId}`
    )
  }

  // Get featured/popular articles
  async getFeaturedArticles(options = {}) {
    const requestOptions = {
      limit: options.limit || 5,
      category: options.category || '',
      include_metadata: options.include_metadata || false
    }

    return handleApiCall(
      () => api.get('/articles/featured', { 
        params: buildQueryParams(requestOptions)
      }),
      'Get featured articles'
    )
  }

  // Get recent articles
  async getRecentArticles(options = {}) {
    const requestOptions = {
      limit: options.limit || 10,
      category: options.category || '',
      days: options.days || 30, // Articles from last 30 days
      include_metadata: options.include_metadata || false
    }

    return handleApiCall(
      () => api.get('/articles/recent', { 
        params: buildQueryParams(requestOptions)
      }),
      'Get recent articles'
    )
  }

  // Get related articles for a given article
  async getRelatedArticles(articleId, options = {}) {
    if (!articleId) {
      return createApiResponse(false, null, 'Article ID is required', 'Invalid article ID')
    }

    const requestOptions = {
      limit: options.limit || 5,
      exclude_current: options.exclude_current !== false
    }

    return handleApiCall(
      () => api.get(`/articles/${articleId}/related`, { 
        params: buildQueryParams(requestOptions)
      }),
      `Get related articles for ${articleId}`
    )
  }

  // Advanced search with filters
  async advancedSearch(filters = {}) {
    const searchFilters = {
      query: filters.query?.trim() || '',
      categories: filters.categories || [],
      tags: filters.tags || [],
      author: filters.author || '',
      date_from: filters.date_from || '',
      date_to: filters.date_to || '',
      content_type: filters.content_type || '', // 'article', 'faq', 'guide'
      difficulty_level: filters.difficulty_level || '', // 'beginner', 'intermediate', 'advanced'
      page: filters.page || 1,
      per_page: filters.per_page || 10,
      sort_by: filters.sort_by || 'relevance',
      sort_order: filters.sort_order || 'desc'
    }

    // Create cache key for advanced search
    const cacheKey = `advanced_search:${JSON.stringify(searchFilters)}`
    
    // Check cache
    const cachedResult = this.searchCache.get(cacheKey)
    if (cachedResult && !filters.skipCache) {
      console.log('📖 Using cached advanced search results')
      return createApiResponse(true, cachedResult, null, 'Advanced search results (cached)')
    }

    const result = await handleApiCall(
      () => api.post('/articles/advanced-search', searchFilters),
      'Advanced article search'
    )

    // Cache successful results
    if (result.success && result.data) {
      this.searchCache.set(cacheKey, result.data)
    }

    return result
  }

  // Get article statistics
  async getArticleStats(articleId) {
    if (!articleId) {
      return createApiResponse(false, null, 'Article ID is required', 'Invalid article ID')
    }

    return handleApiCall(
      () => api.get(`/articles/${articleId}/stats`),
      `Get stats for article ${articleId}`
    )
  }

  // Record article view (analytics)
  async recordView(articleId, metadata = {}) {
    if (!articleId) {
      return createApiResponse(false, null, 'Article ID is required', 'Invalid article ID')
    }

    const viewData = {
      article_id: articleId,
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      referrer: document.referrer,
      ...metadata
    }

    return handleApiCall(
      () => api.post('/articles/views', viewData),
      `Record view for article ${articleId}`
    )
  }

  // Submit article feedback
  async submitFeedback(articleId, feedback) {
    if (!articleId) {
      return createApiResponse(false, null, 'Article ID is required', 'Invalid article ID')
    }

    if (!feedback || (!feedback.rating && !feedback.comment)) {
      return createApiResponse(false, null, 'Feedback content is required', 'Invalid feedback')
    }

    const feedbackData = {
      article_id: articleId,
      rating: feedback.rating || null, // 1-5 star rating
      comment: feedback.comment?.trim() || '',
      helpful: feedback.helpful || null, // true/false
      category: feedback.category || 'general', // 'helpful', 'inaccurate', 'outdated', 'unclear', 'general'
      timestamp: new Date().toISOString()
    }

    return handleApiCall(
      () => api.post('/articles/feedback', feedbackData),
      `Submit feedback for article ${articleId}`
    )
  }

  // Utility methods
  clearCache() {
    this.cache.clear()
    this.searchCache.clear()
    this.categoriesCache = null
    this.categoriesCacheTimestamp = null
    console.log('🗑️ Article cache cleared')
  }

  getCacheStats() {
    return {
      articleCache: {
        size: this.cache.cache.size,
        maxSize: this.cache.maxSize
      },
      searchCache: {
        size: this.searchCache.cache.size,
        maxSize: this.searchCache.maxSize
      },
      categoriesCached: !!this.categoriesCache
    }
  }

  // Preload popular articles
  async preloadPopularArticles(limit = 10) {
    console.log('🚀 Preloading popular articles...')
    
    try {
      const popularResult = await this.getFeaturedArticles({ limit })
      
      if (popularResult.success && popularResult.data?.articles) {
        // Preload individual articles
        const preloadPromises = popularResult.data.articles.map(article => 
          this.getArticle(article.id, { skipCache: false })
        )
        
        await Promise.all(preloadPromises)
        console.log(`✅ Preloaded ${popularResult.data.articles.length} popular articles`)
      }
    } catch (error) {
      console.warn('⚠️ Failed to preload popular articles:', error)
    }
  }
}

// Create and export singleton instance
const articleService = new ArticleService()
export default articleService

// Export individual methods for convenience
export const {
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
} = articleService 