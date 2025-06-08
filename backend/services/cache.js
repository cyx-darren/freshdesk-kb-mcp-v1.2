import supabase from '../config/supabase.js'

/**
 * Cache service for managing article caching in Supabase
 */
class CacheService {
  constructor() {
    this.defaultTTL = 300 // 5 minutes default TTL in seconds
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

      console.log(`[CACHE] Cache hit for article: ${articleId}`)
      
      return {
        article: cachedArticle.data,
        cached_at: cachedArticle.cached_at,
        expires_at: cachedArticle.expires_at,
        source: 'cache'
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
        throw new Error(`Cache save error: ${error.message}`)
      }

      console.log(`[CACHE] Successfully cached article: ${articleId}`)
      return true

    } catch (error) {
      console.error(`[CACHE] Error saving article ${articleId} to cache:`, error.message)
      return false // Return false on error but don't throw - caching is optional
    }
  }

  /**
   * Clear expired cache entries
   * @returns {Promise<number>} - Number of entries cleared
   */
  async clearExpiredCache() {
    try {
      console.log('[CACHE] Clearing expired cache entries')

      // First, count how many will be deleted
      const { count: expiredCount } = await supabase
        .from('article_cache')
        .select('*', { count: 'exact', head: true })
        .lt('expires_at', new Date().toISOString())

      if (expiredCount === 0) {
        console.log('[CACHE] No expired entries to clear')
        return 0
      }

      // Delete expired entries
      const { error } = await supabase
        .from('article_cache')
        .delete()
        .lt('expires_at', new Date().toISOString())

      if (error) {
        throw new Error(`Cache cleanup error: ${error.message}`)
      }

      console.log(`[CACHE] Cleared ${expiredCount} expired cache entries`)
      return expiredCount

    } catch (error) {
      console.error('[CACHE] Error clearing expired cache:', error.message)
      return 0
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<object>} - Cache statistics
   */
  async getCacheStats() {
    try {
      console.log('[CACHE] Fetching cache statistics')

      // Get total cached articles
      const { count: totalArticles } = await supabase
        .from('article_cache')
        .select('*', { count: 'exact', head: true })

      // Get expired articles
      const { count: expiredArticles } = await supabase
        .from('article_cache')
        .select('*', { count: 'exact', head: true })
        .lt('expires_at', new Date().toISOString())

      // Get active articles
      const activeArticles = (totalArticles || 0) - (expiredArticles || 0)

      // Get oldest and newest cached articles
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

      const stats = {
        total_articles: totalArticles || 0,
        active_articles: activeArticles,
        expired_articles: expiredArticles || 0,
        oldest_cache_entry: oldestArticle?.[0]?.cached_at || null,
        newest_cache_entry: newestArticle?.[0]?.cached_at || null,
        default_ttl_seconds: this.defaultTTL,
        timestamp: new Date().toISOString()
      }

      console.log(`[CACHE] Stats: ${stats.active_articles} active, ${stats.expired_articles} expired`)
      return stats

    } catch (error) {
      console.error('[CACHE] Error fetching cache stats:', error.message)
      return {
        total_articles: 0,
        active_articles: 0,
        expired_articles: 0,
        oldest_cache_entry: null,
        newest_cache_entry: null,
        default_ttl_seconds: this.defaultTTL,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Invalidate specific article from cache
   * @param {string} articleId - Article ID to invalidate
   * @returns {Promise<boolean>} - Success status
   */
  async invalidateArticle(articleId) {
    try {
      if (!articleId) {
        throw new Error('Article ID is required')
      }

      console.log(`[CACHE] Invalidating article: ${articleId}`)

      const { error } = await supabase
        .from('article_cache')
        .delete()
        .eq('article_id', articleId)

      if (error) {
        throw new Error(`Cache invalidation error: ${error.message}`)
      }

      console.log(`[CACHE] Successfully invalidated article: ${articleId}`)
      return true

    } catch (error) {
      console.error(`[CACHE] Error invalidating article ${articleId}:`, error.message)
      return false
    }
  }

  /**
   * Clear all cache entries (use with caution)
   * @returns {Promise<boolean>} - Success status
   */
  async clearAllCache() {
    try {
      console.log('[CACHE] Clearing ALL cache entries')

      const { error } = await supabase
        .from('article_cache')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

      if (error) {
        throw new Error(`Cache clear error: ${error.message}`)
      }

      console.log('[CACHE] Successfully cleared all cache entries')
      return true

    } catch (error) {
      console.error('[CACHE] Error clearing all cache:', error.message)
      return false
    }
  }

  /**
   * Set default TTL for cache entries
   * @param {number} ttlSeconds - TTL in seconds
   */
  setDefaultTTL(ttlSeconds) {
    if (ttlSeconds > 0) {
      this.defaultTTL = ttlSeconds
      console.log(`[CACHE] Default TTL set to ${ttlSeconds} seconds`)
    }
  }

  /**
   * Schedule periodic cleanup of expired cache entries
   * @param {number} intervalMinutes - Cleanup interval in minutes (default: 30)
   */
  scheduleCleanup(intervalMinutes = 30) {
    const intervalMs = intervalMinutes * 60 * 1000
    
    console.log(`[CACHE] Scheduling cleanup every ${intervalMinutes} minutes`)
    
    setInterval(async () => {
      try {
        const clearedCount = await this.clearExpiredCache()
        if (clearedCount > 0) {
          console.log(`[CACHE] Scheduled cleanup cleared ${clearedCount} expired entries`)
        }
      } catch (error) {
        console.error('[CACHE] Scheduled cleanup failed:', error.message)
      }
    }, intervalMs)
  }
}

// Create singleton instance
const cacheService = new CacheService()

// Export both the instance and the class
export default cacheService
export { CacheService } 