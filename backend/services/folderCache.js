import supabase from '../config/supabase.js'
import mcpClient from './mcp-client.js'

/**
 * Folder Cache Service
 * Optimizes folder operations by maintaining a local cache of Freshdesk folder data
 * Addresses performance issues identified in Task 20.4
 */
class FolderCacheService {
  constructor() {
    this.CACHE_TTL_MINUTES = 30 // Cache Time To Live
    this.STALE_THRESHOLD_MINUTES = 60 // When to consider cache stale
    this.refreshInProgress = false
  }

  /**
   * Get all folders from cache (fast local lookup)
   * Falls back to MCP if cache is empty or stale
   */
  async getAllFolders(forceRefresh = false) {
    try {
      // Check cache status
      const cacheStatus = await this.getCacheStatus('folders')
      const isStale = this.isCacheStale(cacheStatus.last_refresh, this.STALE_THRESHOLD_MINUTES)
      
      if (forceRefresh || !cacheStatus || isStale || cacheStatus.total_records === 0) {
        console.log('[FOLDER CACHE] Cache is stale or empty, refreshing...')
        await this.refreshFolderCache()
      }

      // Get folders from cache
      const { data: folders, error } = await supabase
        .from('folder_cache')
        .select('*')
        .eq('is_active', true)
        .order('category_name', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error

      // Get categories from cache
      const { data: categories, error: catError } = await supabase
        .from('category_cache')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (catError) throw catError

      return {
        success: true,
        folders: folders || [],
        categories: categories || [],
        total_folders: folders?.length || 0,
        total_categories: categories?.length || 0,
        cache_info: {
          last_refresh: cacheStatus?.last_refresh,
          is_stale: isStale,
          source: 'database_cache'
        }
      }

    } catch (error) {
      console.error('[FOLDER CACHE] Error getting folders from cache:', error)
      
      // Fallback to direct MCP call
      console.log('[FOLDER CACHE] Falling back to direct MCP call')
      return await this.getFoldersFromMCP()
    }
  }

  /**
   * Get folders by category ID (optimized with index)
   */
  async getFoldersByCategory(categoryId) {
    try {
      const { data: folders, error } = await supabase
        .from('folder_cache')
        .select('*')
        .eq('category_id', categoryId.toString())
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error

      return {
        success: true,
        folders: folders || [],
        category_id: categoryId,
        count: folders?.length || 0
      }

    } catch (error) {
      console.error('[FOLDER CACHE] Error getting folders by category:', error)
      throw error
    }
  }

  /**
   * Refresh folder cache from MCP/Freshdesk
   */
  async refreshFolderCache() {
    if (this.refreshInProgress) {
      console.log('[FOLDER CACHE] Refresh already in progress, skipping...')
      return
    }

    this.refreshInProgress = true
    const startTime = Date.now()

    try {
      console.log('[FOLDER CACHE] Starting cache refresh from MCP...')

      // Get fresh data from MCP
      const mcpResult = await this.getFoldersFromMCP()
      if (!mcpResult.success) {
        throw new Error('Failed to fetch folders from MCP')
      }

      const { folders, categories } = mcpResult

      // Update cache status - starting refresh
      await this.updateCacheStatus('folders', {
        status: 'refreshing',
        last_refresh: new Date(),
        total_records: folders.length
      })

      // Clear old cache data
      await supabase.from('folder_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('category_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000')

      // Insert categories
      if (categories && categories.length > 0) {
        const categoryData = categories.map(cat => ({
          category_id: cat.id.toString(),
          name: cat.name,
          description: cat.description || null,
          created_at_source: cat.created_at || null,
          updated_at_source: cat.updated_at || null,
          cached_at: new Date(),
          last_validated: new Date(),
          is_active: true
        }))

        const { error: catError } = await supabase
          .from('category_cache')
          .insert(categoryData)

        if (catError) {
          console.error('[FOLDER CACHE] Error inserting categories:', catError)
        } else {
          console.log(`[FOLDER CACHE] Inserted ${categoryData.length} categories`)
        }
      }

      // Insert folders
      if (folders && folders.length > 0) {
        const folderData = folders.map(folder => ({
          folder_id: folder.id.toString(),
          name: folder.name,
          description: folder.description || null,
          category_id: folder.category_id.toString(),
          category_name: folder.category_name,
          visibility: folder.visibility || 2,
          created_at_source: folder.created_at || null,
          updated_at_source: folder.updated_at || null,
          cached_at: new Date(),
          last_validated: new Date(),
          is_active: true
        }))

        const { error: folderError } = await supabase
          .from('folder_cache')
          .insert(folderData)

        if (folderError) {
          console.error('[FOLDER CACHE] Error inserting folders:', folderError)
          throw folderError
        } else {
          console.log(`[FOLDER CACHE] Inserted ${folderData.length} folders`)
        }
      }

      const duration = Date.now() - startTime

      // Update cache status - completed
      await this.updateCacheStatus('folders', {
        status: 'healthy',
        last_refresh: new Date(),
        refresh_duration_ms: duration,
        total_records: folders.length,
        error_message: null
      })

      await this.updateCacheStatus('categories', {
        status: 'healthy',
        last_refresh: new Date(),
        refresh_duration_ms: duration,
        total_records: categories.length,
        error_message: null
      })

      console.log(`[FOLDER CACHE] Cache refresh completed in ${duration}ms`)
      console.log(`[FOLDER CACHE] Cached ${folders.length} folders and ${categories.length} categories`)

    } catch (error) {
      console.error('[FOLDER CACHE] Cache refresh failed:', error)
      
      // Update cache status - error
      await this.updateCacheStatus('folders', {
        status: 'error',
        error_message: error.message
      })

      throw error
    } finally {
      this.refreshInProgress = false
    }
  }

  /**
   * Get folders directly from MCP (fallback)
   */
  async getFoldersFromMCP() {
    try {
      const startTime = Date.now()
      console.log('[FOLDER CACHE] Fetching folders from MCP...')

      const mcpResult = await mcpClient.listAllFolders()
      const duration = Date.now() - startTime

      console.log(`[FOLDER CACHE] MCP fetch completed in ${duration}ms`)

      return {
        success: true,
        folders: mcpResult.folders || [],
        categories: mcpResult.categories || [],
        total_folders: mcpResult.total_folders || 0,
        total_categories: mcpResult.total_categories || 0,
        cache_info: {
          source: 'mcp_direct',
          fetch_duration_ms: duration
        }
      }

    } catch (error) {
      console.error('[FOLDER CACHE] MCP fetch failed:', error)
      return {
        success: false,
        error: error.message,
        folders: [],
        categories: [],
        total_folders: 0,
        total_categories: 0
      }
    }
  }

  /**
   * Validate folder name uniqueness within category
   */
  async validateFolderNameUnique(folderName, categoryId, excludeFolderId = null) {
    try {
      let query = supabase
        .from('folder_cache')
        .select('folder_id, name')
        .eq('category_id', categoryId.toString())
        .eq('is_active', true)
        .ilike('name', folderName.trim())

      if (excludeFolderId) {
        query = query.neq('folder_id', excludeFolderId.toString())
      }

      const { data: existingFolders, error } = await query

      if (error) throw error

      return {
        is_unique: !existingFolders || existingFolders.length === 0,
        existing_folders: existingFolders || []
      }

    } catch (error) {
      console.error('[FOLDER CACHE] Error validating folder name uniqueness:', error)
      throw error
    }
  }

  /**
   * Get cache status for a specific cache type
   */
  async getCacheStatus(cacheType) {
    try {
      const { data, error } = await supabase
        .from('cache_status')
        .select('*')
        .eq('cache_type', cacheType)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    } catch (error) {
      console.error(`[FOLDER CACHE] Error getting cache status for ${cacheType}:`, error)
      return null
    }
  }

  /**
   * Update cache status
   */
  async updateCacheStatus(cacheType, updates) {
    try {
      const { error } = await supabase
        .from('cache_status')
        .upsert({
          cache_type: cacheType,
          ...updates,
          created_at: new Date()
        })

      if (error) throw error
    } catch (error) {
      console.error(`[FOLDER CACHE] Error updating cache status for ${cacheType}:`, error)
    }
  }

  /**
   * Check if cache is stale
   */
  isCacheStale(lastRefresh, thresholdMinutes) {
    if (!lastRefresh) return true
    
    const now = new Date()
    const refreshTime = new Date(lastRefresh)
    const ageMinutes = (now - refreshTime) / (1000 * 60)
    
    return ageMinutes > thresholdMinutes
  }

  /**
   * Get cache statistics for monitoring
   */
  async getCacheStats() {
    try {
      const [foldersCount, categoriesCount, cacheStatus] = await Promise.all([
        supabase.from('folder_cache').select('*', { count: 'exact', head: true }),
        supabase.from('category_cache').select('*', { count: 'exact', head: true }),
        supabase.from('cache_status').select('*')
      ])

      return {
        success: true,
        stats: {
          folders_cached: foldersCount.count || 0,
          categories_cached: categoriesCount.count || 0,
          cache_status: cacheStatus.data || []
        }
      }

    } catch (error) {
      console.error('[FOLDER CACHE] Error getting cache stats:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Clear entire cache (admin function)
   */
  async clearCache() {
    try {
      await Promise.all([
        supabase.from('folder_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('category_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      ])

      await this.updateCacheStatus('folders', {
        status: 'empty',
        total_records: 0,
        last_refresh: new Date()
      })

      await this.updateCacheStatus('categories', {
        status: 'empty', 
        total_records: 0,
        last_refresh: new Date()
      })

      console.log('[FOLDER CACHE] Cache cleared successfully')
      return { success: true }

    } catch (error) {
      console.error('[FOLDER CACHE] Error clearing cache:', error)
      throw error
    }
  }
}

// Create and export a singleton instance
const folderCacheService = new FolderCacheService()
export default folderCacheService 