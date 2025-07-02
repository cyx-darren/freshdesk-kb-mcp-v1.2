import Redis from 'ioredis'
import { EventEmitter } from 'events'

/**
 * Redis service with connection pooling, error handling, and reconnection logic
 */
class RedisService extends EventEmitter {
  constructor() {
    super()
    this.client = null
    this.isConnected = false
    this.connectionAttempts = 0
    this.maxConnectionAttempts = 5
    this.reconnectDelay = 1000 // Start with 1 second
    this.maxReconnectDelay = 30000 // Max 30 seconds
    this.defaultTTL = 300 // 5 minutes default TTL
    
    // Add process-level error handling for Redis
    this.setupProcessErrorHandling()
    
    // Configuration from environment
    // Support both individual config and Redis URL (for Railway/Heroku etc.)
    if (process.env.REDIS_URL) {
      // Use Redis URL for connection (common in production)
      this.config = process.env.REDIS_URL
    } else {
      // Use individual config parameters
              this.config = {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD || undefined,
          db: parseInt(process.env.REDIS_DB) || 0,
          retryDelayOnFailover: 100,
          retryDelayOnCluster: 100,
          retryDelayOnCancel: 100,
          maxRetriesPerRequest: 1, // Reduce retries for faster failure
          lazyConnect: true,
          keepAlive: 30000,
          family: 4, // IPv4
          connectTimeout: 5000, // Shorter timeout
          commandTimeout: 3000, // Shorter timeout
          keyPrefix: process.env.REDIS_KEY_PREFIX || 'freshdesk:',
          // Connection pool settings
          maxLoadingTimeout: 3000, // Shorter timeout
          enableOfflineQueue: true,
          // Prevent crashes on connection errors
          enableAutoPipelining: false,
          showFriendlyErrorStack: process.env.NODE_ENV === 'development'
        }
    }
  }

  /**
   * Initialize Redis connection
   */
  async initialize() {
    try {
      console.log('🔧 Initializing Redis connection...')
      
      if (typeof this.config === 'string') {
        console.log(`📍 Redis URL: ${this.config.replace(/:\/\/.*@/, '://***@')}`) // Hide credentials
        console.log(`🏷️  Key Prefix: ${process.env.REDIS_KEY_PREFIX || 'freshdesk:'}`)
      } else {
        console.log(`📍 Redis Host: ${this.config.host}:${this.config.port}`)
        console.log(`🗄️  Redis DB: ${this.config.db}`)
        console.log(`🏷️  Key Prefix: ${this.config.keyPrefix}`)
      }

      this.client = new Redis(this.config)

      // Set up event listeners
      this.setupEventListeners()

      // Test connection - Redis with lazyConnect will connect automatically on first command
      await this.client.ping()

      this.isConnected = true
      this.connectionAttempts = 0
      console.log('✅ Redis connection established successfully!')

      return true
    } catch (error) {
      console.error('❌ Redis connection failed:', error.message)
      this.isConnected = false
      
      // Clean up the client on connection failure
      if (this.client) {
        try {
          this.client.disconnect()
        } catch (disconnectError) {
          // Ignore disconnect errors
        }
        this.client = null
      }
      
      // Don't trigger reconnection attempts in development for missing Redis
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        console.log('⚠️  Redis server not available - continuing without Redis cache')
        return false
      }
      
      this.handleConnectionError(error)
      return false
    }
  }

  /**
   * Set up Redis event listeners
   */
  setupEventListeners() {
    this.client.on('connect', () => {
      console.log('🔗 Redis connected')
      this.isConnected = true
      this.connectionAttempts = 0
      this.emit('connected')
    })

    this.client.on('ready', () => {
      console.log('✅ Redis ready for commands')
      this.emit('ready')
    })

    this.client.on('error', (error) => {
      console.error('❌ Redis error:', error.message)
      this.isConnected = false
      
      // Always emit error to internal handlers, but don't let it crash the app
      setImmediate(() => {
        this.emit('error', error)
      })
      
      // Handle common Redis connection errors gracefully
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || 
          error.message.includes('Stream isn\'t writeable') || 
          error.message.includes('enableOfflineQueue') ||
          error.message.includes('Connection is closed')) {
        // These are expected when Redis is not available or disconnecting
        console.log('⚠️  Redis connection issue - cache will fallback to Supabase')
        return
      }
      
      // Log unexpected errors but don't crash
      console.warn('⚠️  Unexpected Redis error (non-fatal):', error.code || 'UNKNOWN')
    })

    this.client.on('close', () => {
      console.warn('🔌 Redis connection closed')
      this.isConnected = false
      this.emit('disconnected')
    })

    this.client.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...')
      this.emit('reconnecting')
    })

    this.client.on('end', () => {
      console.log('🛑 Redis connection ended')
      this.isConnected = false
      this.emit('ended')
    })
  }

  /**
   * Handle connection errors with exponential backoff
   */
  async handleConnectionError(error) {
    this.connectionAttempts++
    
    // Don't retry in development mode if Redis is simply not available
    if (process.env.NODE_ENV === 'development' && (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND')) {
      console.log('🔧 Development mode: Redis not available, skipping reconnection attempts')
      this.emit('maxRetriesReached', error)
      return
    }
    
    if (this.connectionAttempts > this.maxConnectionAttempts) {
      console.error(`💀 Redis connection failed after ${this.maxConnectionAttempts} attempts`)
      this.emit('maxRetriesReached', error)
      return
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.connectionAttempts - 1),
      this.maxReconnectDelay
    )

    console.log(`🔄 Retrying Redis connection in ${delay}ms (attempt ${this.connectionAttempts}/${this.maxConnectionAttempts})`)
    
    setTimeout(() => {
      this.initialize()
    }, delay)
  }

  /**
   * Get value from Redis
   */
  async get(key) {
    try {
      if (!this.isConnected) {
        console.warn('[REDIS] Not connected, skipping GET operation')
        return null
      }

      const result = await this.client.get(key)
      if (result) {
        try {
          return JSON.parse(result)
        } catch (parseError) {
          console.warn(`[REDIS] Failed to parse JSON for key ${key}:`, parseError.message)
          return result // Return raw string if JSON parsing fails
        }
      }
      return null
    } catch (error) {
      console.error(`[REDIS] Error getting key ${key}:`, error.message)
      return null
    }
  }

  /**
   * Set value in Redis with TTL
   */
  async set(key, value, ttl = null) {
    try {
      if (!this.isConnected) {
        console.warn('[REDIS] Not connected, skipping SET operation')
        return false
      }

      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value)
      const timeToLive = ttl || this.defaultTTL

      await this.client.setex(key, timeToLive, serializedValue)
      return true
    } catch (error) {
      console.error(`[REDIS] Error setting key ${key}:`, error.message)
      return false
    }
  }

  /**
   * Delete key from Redis
   */
  async del(key) {
    try {
      if (!this.isConnected) {
        console.warn('[REDIS] Not connected, skipping DEL operation')
        return false
      }

      const result = await this.client.del(key)
      return result > 0
    } catch (error) {
      console.error(`[REDIS] Error deleting key ${key}:`, error.message)
      return false
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    try {
      if (!this.isConnected) {
        return false
      }

      const result = await this.client.exists(key)
      return result === 1
    } catch (error) {
      console.error(`[REDIS] Error checking existence of key ${key}:`, error.message)
      return false
    }
  }

  /**
   * Get keys matching pattern
   */
  async keys(pattern) {
    try {
      if (!this.isConnected) {
        return []
      }

      return await this.client.keys(pattern)
    } catch (error) {
      console.error(`[REDIS] Error getting keys with pattern ${pattern}:`, error.message)
      return []
    }
  }

  /**
   * Clear all keys matching pattern
   */
  async clearPattern(pattern) {
    try {
      if (!this.isConnected) {
        return 0
      }

      const keys = await this.keys(pattern)
      if (keys.length === 0) {
        return 0
      }

      const result = await this.client.del(...keys)
      return result
    } catch (error) {
      console.error(`[REDIS] Error clearing keys with pattern ${pattern}:`, error.message)
      return 0
    }
  }

  /**
   * Get Redis info and statistics
   */
  async getInfo() {
    try {
      if (!this.isConnected) {
        return {
          connected: false,
          error: 'Not connected to Redis'
        }
      }

      const info = await this.client.info()
      const memory = await this.client.info('memory')
      const stats = await this.client.info('stats')
      
      // Parse key stats
      const keyInfo = await this.client.info('keyspace')
      
      return {
        connected: this.isConnected,
        server_info: this.parseRedisInfo(info),
        memory_info: this.parseRedisInfo(memory),
        stats_info: this.parseRedisInfo(stats),
        keyspace_info: this.parseRedisInfo(keyInfo),
        config: {
          host: this.config.host,
          port: this.config.port,
          db: this.config.db,
          keyPrefix: this.config.keyPrefix
        },
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('[REDIS] Error getting info:', error.message)
      return {
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Parse Redis info string into object
   */
  parseRedisInfo(infoString) {
    const info = {}
    const lines = infoString.split('\r\n')
    
    for (const line of lines) {
      if (line.includes(':') && !line.startsWith('#')) {
        const [key, value] = line.split(':')
        info[key] = value
      }
    }
    
    return info
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    const baseStatus = {
      connected: this.isConnected,
      connectionAttempts: this.connectionAttempts,
      timestamp: new Date().toISOString()
    }
    
    if (typeof this.config === 'string') {
      // Redis URL configuration
      return {
        ...baseStatus,
        connection_type: 'url',
        keyPrefix: process.env.REDIS_KEY_PREFIX || 'freshdesk:'
      }
    } else {
      // Individual config parameters
      return {
        ...baseStatus,
        connection_type: 'config',
        host: this.config.host,
        port: this.config.port,
        db: this.config.db,
        keyPrefix: this.config.keyPrefix
      }
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    try {
      if (this.client) {
        console.log('🛑 Closing Redis connection...')
        await this.client.quit()
        this.isConnected = false
        console.log('✅ Redis connection closed')
      }
    } catch (error) {
      console.error('❌ Error closing Redis connection:', error.message)
    }
  }

  /**
   * Setup process-level error handling for Redis
   */
  setupProcessErrorHandling() {
    // Handle Redis errors gracefully without process-level exception handlers
    // The main server.js will handle process-level errors appropriately
    
    // Setup internal error recovery
    this.on('error', (error) => {
      console.log('🚨 Redis service error:', error.message)
      
      // Reset connection state on error
      this.isConnected = false
      if (this.client) {
        try {
          this.client.disconnect()
        } catch (e) {
          // Ignore disconnect errors during cleanup
        }
        this.client = null
      }
      
      // Don't attempt reconnection in development if Redis is not available
      if (process.env.NODE_ENV === 'development' && 
          (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND')) {
        console.log('⚠️  Development mode: Redis not available, cache disabled')
        return
      }
      
      // In production, attempt to reconnect after a delay
      if (process.env.NODE_ENV === 'production' && this.connectionAttempts < this.maxConnectionAttempts) {
        console.log('🔄 Production mode: Will attempt to reconnect to Redis in 10 seconds...')
        setTimeout(() => {
          this.initialize().catch(err => {
            console.warn('🔄 Redis reconnection failed:', err.message)
          })
        }, 10000)
      }
    })
  }
}

// Create singleton instance
const redisService = new RedisService()

export default redisService 