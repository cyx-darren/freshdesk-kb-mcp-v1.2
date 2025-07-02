const Redis = require('ioredis');

/**
 * Rate Limiter Service for Discord Bot
 * Implements sliding window rate limiting with Redis backing
 */
class RateLimiter {
  constructor(options = {}) {
    this.enabled = process.env.RATE_LIMIT_ENABLED === 'true';
    this.windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000; // 1 minute
    this.maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 30;
    this.skipSuccessful = process.env.RATE_LIMIT_SKIP_SUCCESSFUL === 'true';
    
    // Redis configuration
    this.redis = null;
    if (this.enabled) {
      this.initializeRedis();
    }
    
    // In-memory fallback
    this.memoryStore = new Map();
    this.cleanupInterval = null;
    
    console.log(`[RATE-LIMITER] Initialized: enabled=${this.enabled}, window=${this.windowMs}ms, max=${this.maxRequests}`);
  }
  
  async initializeRedis() {
    try {
      const redisHost = process.env.REDIS_HOST || 'localhost';
      const redisPort = process.env.REDIS_PORT || 6379;
      
      this.redis = new Redis({
        host: redisHost,
        port: redisPort,
        keyPrefix: process.env.REDIS_KEY_PREFIX || 'discord-bot:',
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });
      
      await this.redis.connect();
      console.log('[RATE-LIMITER] Redis connected for rate limiting');
    } catch (error) {
      console.warn('[RATE-LIMITER] Redis connection failed, using memory store:', error.message);
      this.redis = null;
      this.startMemoryCleanup();
    }
  }
  
  startMemoryCleanup() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, data] of this.memoryStore.entries()) {
        if (now - data.windowStart > this.windowMs) {
          this.memoryStore.delete(key);
        }
      }
    }, 300000);
  }
  
  /**
   * Check if a user/action is rate limited
   * @param {string} identifier - Unique identifier (user ID, IP, etc.)
   * @param {string} action - Action type (message, command, feedback)
   * @returns {Promise<{allowed: boolean, remaining: number, resetTime: number}>}
   */
  async checkLimit(identifier, action = 'default') {
    if (!this.enabled) {
      return { allowed: true, remaining: this.maxRequests, resetTime: 0 };
    }
    
    const key = `rate-limit:${identifier}:${action}`;
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    try {
      if (this.redis) {
        return await this.checkRedisLimit(key, now, windowStart);
      } else {
        return await this.checkMemoryLimit(key, now, windowStart);
      }
    } catch (error) {
      console.error('[RATE-LIMITER] Error checking limit:', error);
      // Allow request if rate limiter fails
      return { allowed: true, remaining: this.maxRequests, resetTime: 0 };
    }
  }
  
  async checkRedisLimit(key, now, windowStart) {
    const multi = this.redis.multi();
    
    // Remove expired entries
    multi.zremrangebyscore(key, 0, windowStart);
    
    // Count current requests in window
    multi.zcard(key);
    
    // Add current request
    multi.zadd(key, now, `${now}-${Math.random()}`);
    
    // Set expiration
    multi.expire(key, Math.ceil(this.windowMs / 1000));
    
    const results = await multi.exec();
    const currentCount = results[1][1]; // Count before adding current request
    
    const allowed = currentCount < this.maxRequests;
    const remaining = Math.max(0, this.maxRequests - currentCount - 1);
    const resetTime = now + this.windowMs;
    
    return { allowed, remaining, resetTime };
  }
  
  async checkMemoryLimit(key, now, windowStart) {
    let data = this.memoryStore.get(key);
    
    if (!data || now - data.windowStart > this.windowMs) {
      data = {
        windowStart: now,
        requests: []
      };
    }
    
    // Remove expired requests
    data.requests = data.requests.filter(timestamp => timestamp > windowStart);
    
    const allowed = data.requests.length < this.maxRequests;
    
    if (allowed) {
      data.requests.push(now);
    }
    
    this.memoryStore.set(key, data);
    
    const remaining = Math.max(0, this.maxRequests - data.requests.length);
    const resetTime = data.windowStart + this.windowMs;
    
    return { allowed, remaining, resetTime };
  }
  
  /**
   * Log rate limit hit for monitoring
   */
  logRateLimit(identifier, action, remaining) {
    console.warn(`[RATE-LIMITER] Rate limit hit - User: ${identifier}, Action: ${action}, Remaining: ${remaining}`);
  }
  
  /**
   * Get rate limit stats for monitoring
   */
  async getStats() {
    const stats = {
      enabled: this.enabled,
      windowMs: this.windowMs,
      maxRequests: this.maxRequests,
      backend: this.redis ? 'redis' : 'memory',
      memoryEntries: this.memoryStore.size
    };
    
    if (this.redis) {
      try {
        const keys = await this.redis.keys('rate-limit:*');
        stats.redisKeys = keys.length;
      } catch (error) {
        stats.redisKeys = 'error';
      }
    }
    
    return stats;
  }
  
  /**
   * Cleanup resources
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    if (this.redis) {
      this.redis.disconnect();
    }
    
    this.memoryStore.clear();
  }
}

module.exports = RateLimiter; 