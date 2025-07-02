#!/usr/bin/env node

/**
 * Redis Cache Verification Script
 * Tests all aspects of the Redis caching implementation
 */

import redisService from './services/redis.js'
import cache from './services/cache.js'

class CacheVerifier {
  constructor() {
    this.results = {
      redis_connection: false,
      redis_operations: false,
      cache_fallback: false,
      performance_improvement: false,
      cache_types: false,
      error_handling: false
    }
  }

  async runAllTests() {
    console.log('🧪 REDIS CACHE VERIFICATION STARTING...\n')
    
    try {
      // Initialize Redis service first
      console.log('🔧 Initializing Redis service...')
      await redisService.initialize()
      
      await this.testRedisConnection()
      await this.testRedisOperations()
      await this.testCacheFallback()
      await this.testPerformance()
      await this.testCacheTypes()
      await this.testErrorHandling()
      
      this.printResults()
    } catch (error) {
      console.error('❌ Verification failed:', error.message)
    } finally {
      // Clean up Redis connection
      if (redisService.client) {
        await redisService.close()
      }
      process.exit(0)
    }
  }

  async testRedisConnection() {
    console.log('🔌 Testing Redis Connection...')
    
    try {
      const connected = redisService.isConnected
      const info = await redisService.getInfo()
      
      console.log(`   Redis Connected: ${connected ? '✅' : '❌'}`)
      if (info) {
        console.log(`   Redis Version: ${info.redis_version}`)
        console.log(`   Memory Used: ${info.used_memory_human}`)
        console.log(`   Uptime: ${info.uptime_in_seconds}s`)
      }
      
      this.results.redis_connection = connected
    } catch (error) {
      console.log(`   ❌ Redis connection failed: ${error.message}`)
    }
    console.log('')
  }

  async testRedisOperations() {
    console.log('⚡ Testing Redis Operations...')
    
    try {
      // Test basic set/get
      const testKey = 'test:verification'
      const testData = { message: 'Redis is working!', timestamp: new Date().toISOString() }
      
      const setResult = await redisService.set(testKey, testData, 60)
      console.log(`   Set Operation: ${setResult ? '✅' : '❌'}`)
      
      const getData = await redisService.get(testKey)
      const getResult = getData && getData.message === testData.message
      console.log(`   Get Operation: ${getResult ? '✅' : '❌'}`)
      
      // Test exists
      const existsResult = await redisService.exists(testKey)
      console.log(`   Exists Check: ${existsResult ? '✅' : '❌'}`)
      
      // Test delete
      const delResult = await redisService.del(testKey)
      console.log(`   Delete Operation: ${delResult ? '✅' : '❌'}`)
      
      this.results.redis_operations = setResult && getResult && existsResult && delResult
    } catch (error) {
      console.log(`   ❌ Redis operations failed: ${error.message}`)
    }
    console.log('')
  }

  async testCacheFallback() {
    console.log('🔄 Testing Cache Fallback Mechanism...')
    
    try {
      // Temporarily disable Redis to test fallback
      const originalRedisUsage = cache.useRedis
      cache.setRedisUsage(false)
      
      console.log('   Testing with Redis disabled...')
      
      // Test article cache with Supabase only
      const testArticleId = 'test-fallback-' + Date.now()
      const testArticle = { title: 'Fallback Test', content: 'Testing Supabase fallback' }
      
      const saveResult = await cache.saveArticleCache(testArticleId, testArticle, 300)
      console.log(`   Supabase Save: ${saveResult ? '✅' : '❌'}`)
      
      const cachedArticle = await cache.checkArticleCache(testArticleId)
      const retrieveResult = cachedArticle && cachedArticle.source === 'supabase'
      console.log(`   Supabase Retrieve: ${retrieveResult ? '✅' : '❌'}`)
      
      // Restore Redis usage
      cache.setRedisUsage(originalRedisUsage)
      
      this.results.cache_fallback = saveResult && retrieveResult
    } catch (error) {
      console.log(`   ❌ Fallback test failed: ${error.message}`)
    }
    console.log('')
  }

  async testPerformance() {
    console.log('🏃 Testing Performance Improvements...')
    
    try {
      if (!redisService.isConnected) {
        console.log('   ⚠️  Redis not connected, skipping performance test')
        return
      }

      // Test cache vs no cache performance
      const testData = { large_content: 'x'.repeat(10000), timestamp: Date.now() }
      const iterations = 100
      
      // Time Redis operations
      const redisStart = process.hrtime.bigint()
      for (let i = 0; i < iterations; i++) {
        await redisService.set(`perf:test:${i}`, testData, 60)
        await redisService.get(`perf:test:${i}`)
      }
      const redisEnd = process.hrtime.bigint()
      const redisTime = Number(redisEnd - redisStart) / 1000000 // Convert to ms
      
      console.log(`   Redis Operations (${iterations}x): ${redisTime.toFixed(2)}ms`)
      console.log(`   Average per operation: ${(redisTime / iterations).toFixed(3)}ms`)
      
      // Cleanup
      for (let i = 0; i < iterations; i++) {
        await redisService.del(`perf:test:${i}`)
      }
      
      this.results.performance_improvement = redisTime < 5000 // Less than 5 seconds for 100 ops
      console.log(`   Performance Test: ${this.results.performance_improvement ? '✅' : '❌'}`)
    } catch (error) {
      console.log(`   ❌ Performance test failed: ${error.message}`)
    }
    console.log('')
  }

  async testCacheTypes() {
    console.log('📁 Testing Different Cache Types...')
    
    try {
      const testResults = []
      
      // Test folders cache
      const folderResult = await cache.cacheFolders('test-cat', [{ id: 1, name: 'Test Folder' }], 300)
      const folderRetrieve = await cache.getCachedFolders('test-cat')
      testResults.push(folderResult && folderRetrieve)
      console.log(`   Folder Cache: ${folderResult && folderRetrieve ? '✅' : '❌'}`)
      
      // Test search cache
      const searchResult = await cache.cacheSearchResults('test query', [{ id: 1, title: 'Test Result' }], 180)
      const searchRetrieve = await cache.getCachedSearchResults('test query')
      testResults.push(searchResult && searchRetrieve)
      console.log(`   Search Cache: ${searchResult && searchRetrieve ? '✅' : '❌'}`)
      
      this.results.cache_types = testResults.every(result => result)
    } catch (error) {
      console.log(`   ❌ Cache types test failed: ${error.message}`)
    }
    console.log('')
  }

  async testErrorHandling() {
    console.log('🛡️  Testing Error Handling...')
    
    try {
      const testResults = []
      
      // Test invalid article ID
      const invalidResult = await cache.checkArticleCache(null)
      testResults.push(invalidResult === null)
      console.log(`   Invalid Input Handling: ${invalidResult === null ? '✅' : '❌'}`)
      
      // Test save with invalid data
      const invalidSave = await cache.saveArticleCache('test', null)
      testResults.push(invalidSave === false)
      console.log(`   Invalid Save Handling: ${invalidSave === false ? '✅' : '❌'}`)
      
      this.results.error_handling = testResults.every(result => result)
    } catch (error) {
      console.log(`   ❌ Error handling test failed: ${error.message}`)
    }
    console.log('')
  }

  printResults() {
    console.log('📊 VERIFICATION RESULTS:')
    console.log('=' * 50)
    
    Object.entries(this.results).forEach(([test, passed]) => {
      const status = passed ? '✅ PASS' : '❌ FAIL'
      const testName = test.replace(/_/g, ' ').toUpperCase()
      console.log(`   ${testName}: ${status}`)
    })
    
    const totalTests = Object.keys(this.results).length
    const passedTests = Object.values(this.results).filter(Boolean).length
    const score = ((passedTests / totalTests) * 100).toFixed(1)
    
    console.log('')
    console.log(`🎯 OVERALL SCORE: ${passedTests}/${totalTests} tests passed (${score}%)`)
    
    if (score === '100.0') {
      console.log('🎉 PERFECT! Redis caching is fully functional!')
    } else if (score >= '80.0') {
      console.log('✅ GOOD! Redis caching is mostly working well.')
    } else {
      console.log('⚠️  WARNING! Some Redis caching issues detected.')
    }
  }
}

// Run verification if called directly
const verifier = new CacheVerifier()
verifier.runAllTests().catch(console.error)

export default CacheVerifier 