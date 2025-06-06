import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * MCP Client for communicating with Freshdesk Knowledge Base MCP Server
 */
class MCPClient {
  constructor() {
    // Get MCP server path from environment variable
    this.mcpServerPath = process.env.MCP_SERVER_PATH || '../freshdesk-kb-mcp'
    
    // Resolve the absolute path
    this.absoluteMcpPath = path.resolve(__dirname, '../../..', this.mcpServerPath)
    
    // Configuration
    this.timeout = 30000 // 30 seconds timeout
    this.maxRetries = 3
    
    console.log(`[MCP CLIENT] Initialized with path: ${this.absoluteMcpPath}`)
  }

  /**
   * Generic function to call MCP server methods
   * @param {string} method - MCP method name
   * @param {object} params - Method parameters
   * @returns {Promise<object>} - MCP response
   */
  async callFunction(method, params = {}) {
    return new Promise((resolve, reject) => {
      let retryCount = 0
      
      const attemptCall = () => {
        const startTime = Date.now()
        
        // Spawn the MCP server process
        const mcpProcess = spawn('node', ['src/index.js'], {
          cwd: this.absoluteMcpPath,
          stdio: ['pipe', 'pipe', 'pipe']
        })

        let stdout = ''
        let stderr = ''
        let timeoutId

        // Set up timeout
        timeoutId = setTimeout(() => {
          mcpProcess.kill('SIGTERM')
          reject(new Error(`MCP call timeout after ${this.timeout}ms`))
        }, this.timeout)

        // Handle stdout data
        mcpProcess.stdout.on('data', (data) => {
          stdout += data.toString()
        })

        // Handle stderr data
        mcpProcess.stderr.on('data', (data) => {
          stderr += data.toString()
        })

        // Handle process completion
        mcpProcess.on('close', (code) => {
          clearTimeout(timeoutId)
          const duration = Date.now() - startTime
          
          console.log(`[MCP] ${method} completed in ${duration}ms with code ${code}`)
          
          if (code !== 0) {
            console.error(`[MCP] Error output:`, stderr)
            
            // Retry on failure
            if (retryCount < this.maxRetries) {
              retryCount++
              console.log(`[MCP] Retrying ${method} (attempt ${retryCount}/${this.maxRetries})`)
              setTimeout(attemptCall, 1000 * retryCount) // Exponential backoff
              return
            }
            
            reject(new Error(`MCP process failed with code ${code}: ${stderr}`))
            return
          }

          try {
            // Parse the JSON response
            const lines = stdout.trim().split('\n')
            let responseData = null
            
            // Look for JSON response in stdout
            for (const line of lines) {
              try {
                const parsed = JSON.parse(line)
                if (parsed && (parsed.result || parsed.error)) {
                  responseData = parsed
                  break
                }
              } catch (e) {
                // Not JSON, continue looking
              }
            }
            
            if (!responseData) {
              // If no JSON found, treat stdout as the result
              responseData = { result: stdout.trim() }
            }
            
            if (responseData.error) {
              reject(new Error(`MCP Error: ${responseData.error.message || responseData.error}`))
              return
            }
            
            resolve(responseData.result || responseData)
            
          } catch (parseError) {
            console.error('[MCP] Failed to parse response:', parseError)
            reject(new Error(`Failed to parse MCP response: ${parseError.message}`))
          }
        })

        // Handle process errors
        mcpProcess.on('error', (error) => {
          clearTimeout(timeoutId)
          console.error(`[MCP] Process error:`, error)
          
          if (retryCount < this.maxRetries) {
            retryCount++
            console.log(`[MCP] Retrying ${method} due to process error (attempt ${retryCount}/${this.maxRetries})`)
            setTimeout(attemptCall, 1000 * retryCount)
            return
          }
          
          reject(new Error(`MCP process error: ${error.message}`))
        })

        // Send the MCP request
        const request = {
          jsonrpc: '2.0',
          id: Date.now(),
          method: `tools/${method}`,
          params: {
            name: method,
            arguments: params
          }
        }

        try {
          mcpProcess.stdin.write(JSON.stringify(request) + '\n')
          mcpProcess.stdin.end()
        } catch (writeError) {
          clearTimeout(timeoutId)
          reject(new Error(`Failed to write to MCP process: ${writeError.message}`))
        }
      }

      attemptCall()
    })
  }

  /**
   * Search the Freshdesk knowledge base
   * @param {string} query - Search query
   * @param {string} category - Optional category filter
   * @param {number} page - Page number (default: 1)
   * @param {number} per_page - Results per page (default: 10)
   * @returns {Promise<object>} - Search results
   */
  async searchKnowledgeBase(query, category = null, page = 1, per_page = 10) {
    try {
      console.log(`[MCP] Searching knowledge base: "${query}"`)
      
      const params = { query }
      if (category) params.category = category
      if (page > 1) params.page = page
      if (per_page !== 10) params.per_page = per_page

      const result = await this.callFunction('search_knowledge_base', params)
      
      console.log(`[MCP] Search completed, found ${result.articles?.length || 0} articles`)
      
      return {
        success: true,
        query: query,
        category: category,
        page: page,
        per_page: per_page,
        total_results: result.total_results || result.articles?.length || 0,
        articles: result.articles || result,
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      console.error('[MCP] Search failed:', error.message)
      throw new Error(`Knowledge base search failed: ${error.message}`)
    }
  }

  /**
   * Get a specific article by ID
   * @param {string} articleId - Article ID
   * @returns {Promise<object>} - Article data
   */
  async getArticle(articleId) {
    try {
      console.log(`[MCP] Fetching article: ${articleId}`)
      
      if (!articleId) {
        throw new Error('Article ID is required')
      }

      const result = await this.callFunction('get_article', { article_id: articleId })
      
      console.log(`[MCP] Article fetched: ${result.title || 'Unknown Title'}`)
      
      return {
        success: true,
        article: result,
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      console.error(`[MCP] Article fetch failed:`, error.message)
      throw new Error(`Failed to get article ${articleId}: ${error.message}`)
    }
  }

  /**
   * List available categories in the knowledge base
   * @returns {Promise<object>} - Categories list
   */
  async listCategories() {
    try {
      console.log('[MCP] Fetching categories list')
      
      const result = await this.callFunction('list_categories', {})
      
      return {
        success: true,
        categories: result.categories || result,
        count: result.categories?.length || 0,
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      console.error('[MCP] Categories fetch failed:', error.message)
      
      // Return empty categories if MCP doesn't support this function
      if (error.message.includes('Unknown method') || error.message.includes('not found')) {
        return {
          success: true,
          categories: [],
          count: 0,
          note: 'Categories listing not supported by MCP server',
          timestamp: new Date().toISOString()
        }
      }
      
      throw new Error(`Failed to list categories: ${error.message}`)
    }
  }

  /**
   * Get cache status and statistics
   * @returns {Promise<object>} - Cache status
   */
  async getCacheStatus() {
    try {
      console.log('[MCP] Fetching cache status')
      
      const result = await this.callFunction('get_cache_status', {})
      
      return {
        success: true,
        cache: result,
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      console.error('[MCP] Cache status fetch failed:', error.message)
      
      // Return basic status if MCP doesn't support this function
      if (error.message.includes('Unknown method') || error.message.includes('not found')) {
        return {
          success: true,
          cache: {
            status: 'unknown',
            note: 'Cache status not supported by MCP server'
          },
          timestamp: new Date().toISOString()
        }
      }
      
      throw new Error(`Failed to get cache status: ${error.message}`)
    }
  }

  /**
   * Test MCP server connection
   * @returns {Promise<object>} - Connection test result
   */
  async testConnection() {
    try {
      console.log('[MCP] Testing connection to MCP server')
      
      const startTime = Date.now()
      
      // Try a simple search to test connectivity
      await this.searchKnowledgeBase('test connection', null, 1, 1)
      
      const duration = Date.now() - startTime
      
      return {
        success: true,
        status: 'connected',
        responseTime: duration,
        mcpPath: this.absoluteMcpPath,
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      console.error('[MCP] Connection test failed:', error.message)
      
      return {
        success: false,
        status: 'disconnected',
        error: error.message,
        mcpPath: this.absoluteMcpPath,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Get MCP client health status
   * @returns {object} - Health information
   */
  getHealthStatus() {
    return {
      mcpServerPath: this.mcpServerPath,
      absoluteMcpPath: this.absoluteMcpPath,
      timeout: this.timeout,
      maxRetries: this.maxRetries,
      configured: !!this.mcpServerPath,
      timestamp: new Date().toISOString()
    }
  }
}

// Create singleton instance
const mcpClient = new MCPClient()

// Test connection on startup (in development)
if (process.env.NODE_ENV === 'development') {
  mcpClient.testConnection()
    .then(result => {
      if (result.success) {
        console.log(`✅ MCP connection test passed (${result.responseTime}ms)`)
      } else {
        console.warn('⚠️  MCP connection test failed:', result.error)
      }
    })
    .catch(error => {
      console.warn('⚠️  MCP connection test error:', error.message)
    })
}

export default mcpClient
export { MCPClient } 