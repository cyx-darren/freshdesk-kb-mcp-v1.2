import supabase from '../config/supabase.js'

/**
 * Analytics service for tracking user behavior and search patterns
 */
class AnalyticsService {
  constructor() {
    this.batchSize = 100 // For batch operations
    this.maxHistoryAge = 90 // Days to keep search history
  }

  /**
   * Save search history entry
   * @param {string} userId - User ID
   * @param {string} query - Search query
   * @param {string} category - Search category (optional)
   * @param {number} resultsCount - Number of results returned
   * @param {object} metadata - Additional metadata (optional)
   * @returns {Promise<boolean>} - Success status
   */
  async saveSearchHistory(userId, query, category = null, resultsCount = 0, metadata = {}) {
    try {
      if (!userId || !query) {
        console.warn('[ANALYTICS] Missing required fields for search history')
        return false
      }

      console.log(`[ANALYTICS] Saving search history for user ${userId}: "${query}"`)

      const searchEntry = {
        user_id: userId,
        query: query.trim(),
        category: category || null,
        results_count: resultsCount || 0,
        metadata: {
          timestamp: new Date().toISOString(),
          query_length: query.trim().length,
          has_category: !!category,
          ...metadata
        },
        timestamp: new Date().toISOString()
      }

      const { error } = await supabase
        .from('search_history')
        .insert([searchEntry])

      if (error) {
        throw new Error(`Search history save error: ${error.message}`)
      }

      console.log(`[ANALYTICS] Successfully saved search history for user ${userId}`)
      return true

    } catch (error) {
      console.error(`[ANALYTICS] Error saving search history:`, error.message)
      return false // Return false but don't throw - analytics should not break main flow
    }
  }

  /**
   * Get user's search history
   * @param {string} userId - User ID
   * @param {object} options - Query options
   * @returns {Promise<object>} - Search history with pagination
   */
  async getUserSearchHistory(userId, options = {}) {
    try {
      if (!userId) {
        throw new Error('User ID is required')
      }

      const {
        limit = 20,
        page = 1,
        category = null,
        startDate = null,
        endDate = null
      } = options

      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20))
      const pageNum = Math.max(1, parseInt(page) || 1)
      const offset = (pageNum - 1) * limitNum

      console.log(`[ANALYTICS] Fetching search history for user ${userId}`)

      // Build query
      let query = supabase
        .from('search_history')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)

      // Add filters
      if (category) {
        query = query.eq('category', category)
      }

      if (startDate) {
        query = query.gte('timestamp', startDate)
      }

      if (endDate) {
        query = query.lte('timestamp', endDate)
      }

      // Apply pagination and ordering
      const { data: searchHistory, error, count } = await query
        .order('timestamp', { ascending: false })
        .range(offset, offset + limitNum - 1)

      if (error) {
        throw new Error(`Search history fetch error: ${error.message}`)
      }

      return {
        success: true,
        search_history: searchHistory || [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limitNum)
        },
        filters: {
          category,
          start_date: startDate,
          end_date: endDate
        }
      }

    } catch (error) {
      console.error('[ANALYTICS] Error fetching search history:', error.message)
      throw error
    }
  }

  /**
   * Get search analytics for a user
   * @param {string} userId - User ID
   * @param {number} days - Number of days to analyze (default: 30)
   * @returns {Promise<object>} - Analytics data
   */
  async getUserSearchAnalytics(userId, days = 30) {
    try {
      if (!userId) {
        throw new Error('User ID is required')
      }

      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      console.log(`[ANALYTICS] Generating search analytics for user ${userId} (${days} days)`)

      // Get search history for the period
      const { data: searches, error } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', startDate.toISOString())

      if (error) {
        throw new Error(`Analytics fetch error: ${error.message}`)
      }

      const searchData = searches || []

      // Calculate analytics
      const totalSearches = searchData.length
      const uniqueQueries = new Set(searchData.map(s => s.query.toLowerCase())).size
      const avgResultsPerSearch = totalSearches > 0 
        ? Math.round(searchData.reduce((sum, s) => sum + (s.results_count || 0), 0) / totalSearches)
        : 0

      // Category distribution
      const categoryStats = {}
      searchData.forEach(search => {
        const category = search.category || 'uncategorized'
        categoryStats[category] = (categoryStats[category] || 0) + 1
      })

      // Popular queries (top 10)
      const queryFrequency = {}
      searchData.forEach(search => {
        const query = search.query.toLowerCase()
        queryFrequency[query] = (queryFrequency[query] || 0) + 1
      })

      const popularQueries = Object.entries(queryFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([query, count]) => ({ query, count }))

      // Daily search activity
      const dailyActivity = {}
      searchData.forEach(search => {
        const date = new Date(search.timestamp).toISOString().split('T')[0]
        dailyActivity[date] = (dailyActivity[date] || 0) + 1
      })

      return {
        success: true,
        period_days: days,
        start_date: startDate.toISOString(),
        end_date: new Date().toISOString(),
        summary: {
          total_searches: totalSearches,
          unique_queries: uniqueQueries,
          avg_results_per_search: avgResultsPerSearch,
          search_frequency: totalSearches > 0 ? (totalSearches / days).toFixed(2) : 0
        },
        category_distribution: categoryStats,
        popular_queries: popularQueries,
        daily_activity: Object.entries(dailyActivity)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, count]) => ({ date, searches: count }))
      }

    } catch (error) {
      console.error('[ANALYTICS] Error generating search analytics:', error.message)
      throw error
    }
  }

  /**
   * Clean old search history entries
   * @param {number} maxAgeDays - Maximum age in days (default: 90)
   * @returns {Promise<number>} - Number of entries deleted
   */
  async cleanOldSearchHistory(maxAgeDays = null) {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - (maxAgeDays || this.maxHistoryAge))

      console.log(`[ANALYTICS] Cleaning search history older than ${cutoffDate.toISOString()}`)

      // Count entries to be deleted
      const { count: oldEntriesCount } = await supabase
        .from('search_history')
        .select('*', { count: 'exact', head: true })
        .lt('timestamp', cutoffDate.toISOString())

      if (oldEntriesCount === 0) {
        console.log('[ANALYTICS] No old search history entries to clean')
        return 0
      }

      // Delete old entries
      const { error } = await supabase
        .from('search_history')
        .delete()
        .lt('timestamp', cutoffDate.toISOString())

      if (error) {
        throw new Error(`Search history cleanup error: ${error.message}`)
      }

      console.log(`[ANALYTICS] Cleaned ${oldEntriesCount} old search history entries`)
      return oldEntriesCount

    } catch (error) {
      console.error('[ANALYTICS] Error cleaning old search history:', error.message)
      return 0
    }
  }

  /**
   * Get popular search queries across all users (for admin analytics)
   * @param {object} options - Query options
   * @returns {Promise<object>} - Popular queries data
   */
  async getPopularQueries(options = {}) {
    try {
      const {
        limit = 50,
        days = 30,
        category = null,
        minCount = 2
      } = options

      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      console.log(`[ANALYTICS] Fetching popular queries (${days} days)`)

      // Build query
      let query = supabase
        .from('search_history')
        .select('query, category, results_count, timestamp')
        .gte('timestamp', startDate.toISOString())

      if (category) {
        query = query.eq('category', category)
      }

      const { data: searches, error } = await query

      if (error) {
        throw new Error(`Popular queries fetch error: ${error.message}`)
      }

      // Aggregate query data
      const queryStats = {}
      searches.forEach(search => {
        const query = search.query.toLowerCase()
        if (!queryStats[query]) {
          queryStats[query] = {
            query: search.query, // Keep original case
            count: 0,
            total_results: 0,
            categories: new Set(),
            first_seen: search.timestamp,
            last_seen: search.timestamp
          }
        }

        const stats = queryStats[query]
        stats.count++
        stats.total_results += search.results_count || 0
        if (search.category) {
          stats.categories.add(search.category)
        }
        if (search.timestamp < stats.first_seen) {
          stats.first_seen = search.timestamp
        }
        if (search.timestamp > stats.last_seen) {
          stats.last_seen = search.timestamp
        }
      })

      // Filter and sort results
      const popularQueries = Object.values(queryStats)
        .filter(stats => stats.count >= minCount)
        .map(stats => ({
          ...stats,
          categories: Array.from(stats.categories),
          avg_results: stats.count > 0 ? Math.round(stats.total_results / stats.count) : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)

      return {
        success: true,
        period_days: days,
        popular_queries: popularQueries,
        summary: {
          total_unique_queries: Object.keys(queryStats).length,
          total_searches: searches.length,
          queries_above_threshold: popularQueries.length
        }
      }

    } catch (error) {
      console.error('[ANALYTICS] Error fetching popular queries:', error.message)
      throw error
    }
  }

  /**
   * Save chat history entry
   * @param {string} userId - User ID
   * @param {string} userMessage - User's message
   * @param {string} assistantResponse - Assistant's response
   * @param {number} articlesFound - Number of knowledge base articles found
   * @param {number} responseTime - Response time in milliseconds
   * @param {object} metadata - Additional metadata (optional)
   * @returns {Promise<boolean>} - Success status
   */
  async saveChatHistory(userId, userMessage, assistantResponse, articlesFound = 0, responseTime = 0, metadata = {}) {
    try {
      if (!userId || !userMessage || !assistantResponse) {
        console.warn('[ANALYTICS] Missing required fields for chat history')
        return false
      }

      console.log(`[ANALYTICS] Saving chat history for user ${userId}`)

      const chatEntry = {
        user_id: userId,
        user_message: userMessage.trim(),
        assistant_response: assistantResponse.trim(),
        articles_found: articlesFound || 0,
        response_time_ms: responseTime || 0,
        metadata: {
          timestamp: new Date().toISOString(),
          message_length: userMessage.trim().length,
          response_length: assistantResponse.trim().length,
          has_articles: articlesFound > 0,
          ...metadata
        },
        timestamp: new Date().toISOString()
      }

      // Note: This assumes a 'chat_history' table exists
      // If it doesn't exist, this will fail gracefully
      const { error } = await supabase
        .from('chat_history')
        .insert([chatEntry])

      if (error) {
        // Don't throw error if table doesn't exist - just log and continue
        if (error.code === '42P01') { // Table doesn't exist
          console.warn('[ANALYTICS] Chat history table does not exist, skipping chat analytics')
          return false
        }
        throw new Error(`Chat history save error: ${error.message}`)
      }

      console.log(`[ANALYTICS] Successfully saved chat history for user ${userId}`)
      return true

    } catch (error) {
      console.error(`[ANALYTICS] Error saving chat history:`, error.message)
      return false // Return false but don't throw - analytics should not break main flow
    }
  }

  /**
   * Schedule periodic cleanup of old search history
   * @param {number} intervalHours - Cleanup interval in hours (default: 24)
   * @param {number} maxAgeDays - Maximum age in days (default: 90)
   */
  scheduleCleanup(intervalHours = 24, maxAgeDays = 90) {
    const intervalMs = intervalHours * 60 * 60 * 1000
    
    console.log(`[ANALYTICS] Scheduling search history cleanup every ${intervalHours} hours`)
    
    setInterval(async () => {
      try {
        const deletedCount = await this.cleanOldSearchHistory(maxAgeDays)
        if (deletedCount > 0) {
          console.log(`[ANALYTICS] Scheduled cleanup removed ${deletedCount} old search entries`)
        }
      } catch (error) {
        console.error('[ANALYTICS] Scheduled cleanup failed:', error.message)
      }
    }, intervalMs)
  }
}

// Create singleton instance
const analyticsService = new AnalyticsService()

// Export both the instance and the class
export default analyticsService
export { AnalyticsService } 