import supabase from '../config/supabase.js'
import redisService from './redis.js'

/**
 * Enhanced cache service using Redis as primary cache with Supabase fallback
 */
class CacheService {
  constructor() {
    this.defaultTTL = 300 // 5 minutes default TTL in seconds
    this.useRedis = true // Can be toggled for fallback
    
    // Cache key prefixes for different data types
    this.keyPrefixes = {
      article: 'article:',
      folder: 'folder:',
      category: 'category:',
      search: 'search:',
      session: 'session:',
      user: 'user:'
    }
  }

  /**
   * Generate cache key with prefix
   */
  generateKey(type, identifier) {
    const prefix = this.keyPrefixes[type] || 'misc:'
    return `${prefix}${identifier}`
  }

  /**
   * Check if article exists in cache and is not expired
   * @param {string} articleId - Article ID to check
   * @returns {Promise<object|null>} - Cached article data or null if not found/expired
   */
  async checkArticleCache(articleId) {
    try {
      if (!articleId) {
        throw new Error('Article ID is required')
      }

      console.log(`[CACHE] Checking cache for article: ${articleId}`)

      // Try Redis first
      if (this.useRedis && redisService.isConnected) {
        const cacheKey = this.generateKey('article', articleId)
        const cachedData = await redisService.get(cacheKey)
        
        if (cachedData) {
          console.log(`[CACHE] Redis cache hit for article: ${articleId}`)
          return {
            article: cachedData.article || cachedData, // Handle both new and legacy format
            cached_at: cachedData.cached_at || new Date().toISOString(),
            expires_at: cachedData.expires_at || new Date(Date.now() + this.defaultTTL * 1000).toISOString(),
            source: 'redis'
          }
        }
        
        console.log(`[CACHE] Redis cache miss for article: ${articleId}, checking Supabase...`)
      }

      // Fallback to Supabase cache
      const { data: cachedArticle, error } = await supabase
        .from('article_cache')
        .select('*')
        .eq('article_id', articleId)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - article not in cache or expired
          console.log(`[CACHE] Article ${articleId} not found in cache or expired`)
          return null
        }
        throw new Error(`Cache lookup error: ${error.message}`)
      }

      console.log(`[CACHE] Supabase cache hit for article: ${articleId}`)
      
      // If found in Supabase, also cache in Redis for faster future access
      if (this.useRedis && redisService.isConnected) {
        const cacheKey = this.generateKey('article', articleId)
        const ttlRemaining = Math.max(
          Math.floor((new Date(cachedArticle.expires_at) - new Date()) / 1000),
          60 // Minimum 1 minute TTL
        )
        
        await redisService.set(cacheKey, {
          article: cachedArticle.data,
          cached_at: cachedArticle.cached_at,
          expires_at: cachedArticle.expires_at,
          source: 'supabase'
        }, ttlRemaining)
        
        console.log(`[CACHE] Promoted Supabase cache to Redis for article: ${articleId}`)
      }
      
      return {
        article: cachedArticle.data,
        cached_at: cachedArticle.cached_at,
        expires_at: cachedArticle.expires_at,
        source: 'supabase'
      }

    } catch (error) {
      console.error(`[CACHE] Error checking cache for article ${articleId}:`, error.message)
      return null // Return null on error to allow fallback to MCP
    }
  }

  /**
   * Save article data to cache with TTL
   * @param {string} articleId - Article ID
   * @param {object} data - Article data to cache
   * @param {number} ttl - Time to live in seconds (default: 300)
   * @returns {Promise<boolean>} - Success status
   */
  async saveArticleCache(articleId, data, ttl = null) {
    try {
      if (!articleId) {
        throw new Error('Article ID is required')
      }

      if (!data) {
        throw new Error('Article data is required')
      }

      const timeToLive = ttl || this.defaultTTL
      const expiresAt = new Date(Date.now() + (timeToLive * 1000)).toISOString()

      console.log(`[CACHE] Saving article to cache: ${articleId} (TTL: ${timeToLive}s)`)

      let redisSuccess = false
      let supabaseSuccess = false

      // Save to Redis first (faster)
      if (this.useRedis && redisService.isConnected) {
        const cacheKey = this.generateKey('article', articleId)
        redisSuccess = await redisService.set(cacheKey, {
          article: data,
          cached_at: new Date().toISOString(),
          expires_at: expiresAt,
          source: 'redis'
        }, timeToLive)
        
        if (redisSuccess) {
          console.log(`[CACHE] Successfully cached article in Redis: ${articleId}`)
        }
      }

      // Save to Supabase for persistence
      try {
        const { error } = await supabase
          .from('article_cache')
          .upsert({
            article_id: articleId,
            data: data,
            expires_at: expiresAt,
            cached_at: new Date().toISOString()
          })
          .eq('article_id', articleId)

        if (error) {
          throw new Error(`Supabase cache save error: ${error.message}`)
        }

        supabaseSuccess = true
        console.log(`[CACHE] Successfully cached article in Supabase: ${articleId}`)
      } catch (supabaseError) {
        console.error(`[CACHE] Supabase cache save failed for ${articleId}:`, supabaseError.message)
      }

      // Return true if at least one cache succeeded
      return redisSuccess || supabaseSuccess

    } catch (error) {
      console.error(`[CACHE] Error saving article ${articleId} to cache:`, error.message)
      return false // Return false on error but don't throw - caching is optional
    }
  }

  /**
   * Generic cache methods for other data types
   */
  
  /**
   * Cache folder data
   */
  async cacheFolders(categoryId, folders, ttl = 600) { // 10 minutes for folders
    try {
      if (!categoryId || !folders) return false

      const cacheKey = this.generateKey('folder', `category_${categoryId}`)
      
      if (this.useRedis && redisService.isConnected) {
        return await redisService.set(cacheKey, {
          folders,
          category_id: categoryId,
          cached_at: new Date().toISOString()
        }, ttl)
      }
      
      return false
    } catch (error) {
      console.error(`[CACHE] Error caching folders for category ${categoryId}:`, error.message)
      return false
    }
  }

  /**
   * Get cached folder data
   */
  async getCachedFolders(categoryId) {
    try {
      if (!categoryId) return null

      const cacheKey = this.generateKey('folder', `category_${categoryId}`)
      
      if (this.useRedis && redisService.isConnected) {
        const cached = await redisService.get(cacheKey)
        if (cached) {
          console.log(`[CACHE] Redis cache hit for folders in category: ${categoryId}`)
          return cached.folders
        }
      }
      
      return null
    } catch (error) {
      console.error(`[CACHE] Error getting cached folders for category ${categoryId}:`, error.message)
      return null
    }
  }

  /**
   * Cache search results
   */
  async cacheSearchResults(query, results, ttl = 180) { // 3 minutes for search
    try {
      if (!query || !results) return false

      // Create a hash of the query for the cache key
      const queryHash = Buffer.from(query.toLowerCase().trim()).toString('base64').slice(0, 20)
      const cacheKey = this.generateKey('search', queryHash)
      
      if (this.useRedis && redisService.isConnected) {
        return await redisService.set(cacheKey, {
          query,
          results,
          cached_at: new Date().toISOString()
        }, ttl)
      }
      
      return false
    } catch (error) {
      console.error(`[CACHE] Error caching search results for query "${query}":`, error.message)
      return false
    }
  }

  /**
   * Get cached search results
   */
  async getCachedSearchResults(query) {
    try {
      if (!query) return null

      const queryHash = Buffer.from(query.toLowerCase().trim()).toString('base64').slice(0, 20)
      const cacheKey = this.generateKey('search', queryHash)
      
      if (this.useRedis && redisService.isConnected) {
        const cached = await redisService.get(cacheKey)
        if (cached && cached.query === query) {
          console.log(`[CACHE] Redis cache hit for search query: "${query}"`)
          return cached.results
        }
      }
      
      return null
    } catch (error) {
      console.error(`[CACHE] Error getting cached search results for query "${query}":`, error.message)
      return null
    }
  }

  /**
   * Clear expired cache entries
   * @returns {Promise<number>} - Number of entries cleared
   */
  async clearExpiredCache() {
    try {
      console.log('[CACHE] Clearing expired cache entries')

      let totalCleared = 0

      // Redis doesn't need manual cleanup - TTL handles expiration automatically
      // But we can clear some old patterns if needed
      if (this.useRedis && redisService.isConnected) {
        console.log('[CACHE] Redis handles TTL expiration automatically')
      }

      // Clean up Supabase cache
      const { count: expiredCount } = await supabase
        .from('article_cache')
        .select('*', { count: 'exact', head: true })
        .lt('expires_at', new Date().toISOString())

      if (expiredCount > 0) {
        const { error } = await supabase
          .from('article_cache')
          .delete()
          .lt('expires_at', new Date().toISOString())

        if (error) {
          throw new Error(`Supabase cache cleanup error: ${error.message}`)
        }

        totalCleared += expiredCount
        console.log(`[CACHE] Cleared ${expiredCount} expired Supabase cache entries`)
      } else {
        console.log('[CACHE] No expired Supabase entries to clear')
      }

      return totalCleared

    } catch (error) {
      console.error('[CACHE] Error clearing expired cache:', error.message)
      return 0
    }
  }

  /**
   * Get comprehensive cache statistics
   * @returns {Promise<object>} - Cache statistics
   */
  async getCacheStats() {
    try {
      console.log('[CACHE] Fetching cache statistics')

      const stats = {
        redis: {
          connected: false,
          info: null
        },
        supabase: {
          total_articles: 0,
          active_articles: 0,
          expired_articles: 0,
          oldest_cache_entry: null,
          newest_cache_entry: null
        },
        config: {
          default_ttl_seconds: this.defaultTTL,
          use_redis: this.useRedis,
          key_prefixes: this.keyPrefixes
        },
        timestamp: new Date().toISOString()
      }

      // Get Redis stats
      if (this.useRedis && redisService.isConnected) {
        stats.redis.connected = true
        stats.redis.info = await redisService.getInfo()
      }

      // Get Supabase stats
      const { count: totalArticles } = await supabase
        .from('article_cache')
        .select('*', { count: 'exact', head: true })

      const { count: expiredArticles } = await supabase
        .from('article_cache')
        .select('*', { count: 'exact', head: true })
        .lt('expires_at', new Date().toISOString())

      const activeArticles = (totalArticles || 0) - (expiredArticles || 0)

      const { data: oldestArticle } = await supabase
        .from('article_cache')
        .select('cached_at')
        .order('cached_at', { ascending: true })
        .limit(1)

      const { data: newestArticle } = await supabase
        .from('article_cache')
        .select('cached_at')
        .order('cached_at', { ascending: false })
        .limit(1)

      stats.supabase = {
        total_articles: totalArticles || 0,
        active_articles: activeArticles,
        expired_articles: expiredArticles || 0,
        oldest_cache_entry: oldestArticle?.[0]?.cached_at || null,
        newest_cache_entry: newestArticle?.[0]?.cached_at || null
      }

      console.log(`[CACHE] Stats - Redis: ${stats.redis.connected ? 'Connected' : 'Disconnected'}, Supabase: ${stats.supabase.active_articles} active articles`)
      return stats

    } catch (error) {
      console.error('[CACHE] Error fetching cache stats:', error.message)
      return {
        redis: { connected: false, error: error.message },
        supabase: { error: error.message },
        config: {
          default_ttl_seconds: this.defaultTTL,
          use_redis: this.useRedis,
          key_prefixes: this.keyPrefixes
        },
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Invalidate article cache
   * @param {string} articleId - Article ID to invalidate
   * @returns {Promise<boolean>} - Success status
   */
  async invalidateArticle(articleId) {
    try {
      if (!articleId) {
        throw new Error('Article ID is required')
      }

      console.log(`[CACHE] Invalidating cache for article: ${articleId}`)

      let redisSuccess = false
      let supabaseSuccess = false

      // Remove from Redis
      if (this.useRedis && redisService.isConnected) {
        const cacheKey = this.generateKey('article', articleId)
        redisSuccess = await redisService.del(cacheKey)
        if (redisSuccess) {
          console.log(`[CACHE] Removed article ${articleId} from Redis cache`)
        }
      }

      // Remove from Supabase
      const { error } = await supabase
        .from('article_cache')
        .delete()
        .eq('article_id', articleId)

      if (error) {
        console.error(`[CACHE] Error removing article ${articleId} from Supabase cache:`, error.message)
      } else {
        supabaseSuccess = true
        console.log(`[CACHE] Removed article ${articleId} from Supabase cache`)
      }

      return redisSuccess || supabaseSuccess

    } catch (error) {
      console.error(`[CACHE] Error invalidating article ${articleId}:`, error.message)
      return false
    }
  }

  /**
   * Clear all cache data
   * @returns {Promise<object>} - Cleanup results
   */
  async clearAllCache() {
    try {
      console.log('[CACHE] Clearing all cache data')

      const results = {
        redis: { cleared: false, error: null },
        supabase: { cleared: 0, error: null }
      }

      // Clear Redis cache
      if (this.useRedis && redisService.isConnected) {
        try {
          const clearedCount = await redisService.clearPattern('*')
          results.redis.cleared = clearedCount > 0
          console.log(`[CACHE] Cleared ${clearedCount} Redis cache entries`)
        } catch (redisError) {
          results.redis.error = redisError.message
          console.error('[CACHE] Error clearing Redis cache:', redisError.message)
        }
      }

      // Clear Supabase cache
      try {
        const { count: totalCount } = await supabase
          .from('article_cache')
          .select('*', { count: 'exact', head: true })

        if (totalCount > 0) {
          const { error } = await supabase
            .from('article_cache')
            .delete()
            .neq('article_id', '') // Delete all rows

          if (error) {
            throw error
          }

          results.supabase.cleared = totalCount
          console.log(`[CACHE] Cleared ${totalCount} Supabase cache entries`)
        }
      } catch (supabaseError) {
        results.supabase.error = supabaseError.message
        console.error('[CACHE] Error clearing Supabase cache:', supabaseError.message)
      }

      return results

    } catch (error) {
      console.error('[CACHE] Error clearing all cache:', error.message)
      return {
        redis: { cleared: false, error: error.message },
        supabase: { cleared: 0, error: error.message }
      }
    }
  }

  /**
   * Set default TTL
   * @param {number} ttlSeconds - TTL in seconds
   */
  setDefaultTTL(ttlSeconds) {
    if (ttlSeconds > 0) {
      this.defaultTTL = ttlSeconds
      console.log(`[CACHE] Updated default TTL to ${ttlSeconds} seconds`)
    }
  }

  /**
   * Toggle Redis usage
   * @param {boolean} useRedis - Whether to use Redis
   */
  setRedisUsage(useRedis) {
    this.useRedis = useRedis
    console.log(`[CACHE] Redis usage ${useRedis ? 'enabled' : 'disabled'}`)
  }

  /**
   * Schedule periodic cleanup
   * @param {number} intervalMinutes - Cleanup interval in minutes
   */
  scheduleCleanup(intervalMinutes = 30) {
    setInterval(async () => {
      try {
        console.log(`[CACHE] Running scheduled cleanup (interval: ${intervalMinutes}m)`)
        const cleared = await this.clearExpiredCache()
        console.log(`[CACHE] Scheduled cleanup completed: ${cleared} entries removed`)
      } catch (error) {
        console.error('[CACHE] Scheduled cleanup failed:', error.message)
      }
    }, intervalMinutes * 60 * 1000)

    console.log(`[CACHE] Scheduled cleanup every ${intervalMinutes} minutes`)
  }
}

// Create singleton instance
const cacheService = new CacheService()

export default cacheService 
export { CacheService } 