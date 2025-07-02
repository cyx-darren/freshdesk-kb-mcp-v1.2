import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import axios from 'axios'
import fs from 'fs'

// Load environment variables
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * MCP Client for communicating with Freshdesk Knowledge Base MCP Server
 */
class MCPClient {
  constructor() {
    // Get MCP server configuration
    this.mcpServerPath = process.env.MCP_SERVER_PATH || '../mcp-server'
    this.mcpServerUrl = process.env.MCP_SERVER_URL
    this.nodeEnv = process.env.NODE_ENV || 'development'
    
    // Resolve the absolute path - the MCP server is in the same parent directory as the backend
    this.absoluteMcpPath = path.resolve(__dirname, '../../mcp-server')
    
    // Get the full path to node (only needed for stdio mode)
    if (this.nodeEnv !== 'production') {
      // Use the correct node path for this system
      this.nodePath = '/opt/homebrew/bin/node'
      console.log('[MCP CLIENT] Using node path:', this.nodePath)
    }
    
    // Load MCP server environment variables
    this.mcpEnvVars = this.loadMcpEnvVars()
    
    // Configuration
    this.timeout = 30000 // 30 seconds timeout
    this.maxRetries = 3
    
    if (this.nodeEnv === 'production') {
      console.log(`[MCP CLIENT] Initialized in HTTP mode with URL: ${this.mcpServerUrl}`)
    } else {
      console.log(`[MCP CLIENT] Initialized in stdio mode with path: ${this.absoluteMcpPath}`)
    }
  }

  /**
   * Load MCP server environment variables from its .env file
   * @returns {object} - Environment variables object
   */
  loadMcpEnvVars() {
    try {
      const envPath = path.join(this.absoluteMcpPath, '.env')
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8')
        const envVars = {}
        
        envContent.split('\n').forEach(line => {
          line = line.trim()
          if (line && !line.startsWith('#') && line.includes('=')) {
            const [key, ...valueParts] = line.split('=')
            const value = valueParts.join('=').replace(/^["']|["']$/g, '') // Remove quotes
            envVars[key] = value
          }
        })
        
        console.log('[MCP CLIENT] Loaded MCP environment variables:', Object.keys(envVars))
        return envVars
      } else {
        console.warn('[MCP CLIENT] MCP server .env file not found at:', envPath)
        return {}
      }
    } catch (error) {
      console.error('[MCP CLIENT] Error loading MCP environment variables:', error.message)
      return {}
    }
  }

  /**
   * Generic function to call MCP server methods
   * @param {string} method - MCP method name
   * @param {object} params - Method parameters
   * @returns {Promise<object>} - MCP response
   */
  async callFunction(method, params = {}) {
    if (this.nodeEnv === 'production') {
      return this.callFunctionHTTP(method, params)
    } else {
      return this.callFunctionStdio(method, params)
    }
  }

  /**
   * Call MCP server via HTTP (production mode)
   * @param {string} method - MCP method name
   * @param {object} params - Method parameters
   * @returns {Promise<object>} - MCP response
   */
  async callFunctionHTTP(method, params = {}) {
    if (!this.mcpServerUrl) {
      throw new Error('MCP_SERVER_URL environment variable is required in production mode')
    }

    let retryCount = 0
    
    const attemptCall = async () => {
      try {
        console.log(`[MCP-HTTP] Calling ${method} with params:`, params)
        
        const response = await axios.post(`${this.mcpServerUrl}/execute`, {
          tool: method,
          params: params
        }, {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (response.data.success) {
          return response.data.result
        } else if (response.data.error) {
          throw new Error(`MCP Error: ${response.data.message || response.data.error}`)
        } else {
          throw new Error('Unknown MCP response format')
        }
        
      } catch (error) {
        console.error(`[MCP-HTTP] Error calling ${method}:`, error.message)
        
        // Retry on network errors or timeouts
        if ((error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.response?.status >= 500) 
            && retryCount < this.maxRetries) {
          retryCount++
          console.log(`[MCP-HTTP] Retrying ${method} (attempt ${retryCount}/${this.maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
          return attemptCall()
        }
        
        // Handle specific HTTP errors
        if (error.response) {
          throw new Error(`HTTP ${error.response.status}: ${error.response.data?.message || error.message}`)
        }
        
        throw error
      }
    }

    return attemptCall()
  }

  /**
   * Call MCP server via stdio (development mode)
   * @param {string} method - MCP method name
   * @param {object} params - Method parameters
   * @returns {Promise<object>} - MCP response
   */
  async callFunctionStdio(method, params = {}) {
    return new Promise((resolve, reject) => {
      let retryCount = 0
      
      const attemptCall = () => {
        const startTime = Date.now()
        
        // Spawn the MCP server process
        const mcpProcess = spawn(this.nodePath, ['src/index.js'], {
          cwd: this.absoluteMcpPath,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { 
            ...process.env,
            ...this.mcpEnvVars,
            PATH: process.env.PATH,
            NODE_ENV: this.nodeEnv 
          }
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
          method: 'tools/call',
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
      if (per_page && per_page !== 10) params.per_page = per_page

      const result = await this.callFunction('search_knowledge_base', params)
      
      // Extract articles count from the response text content
      const responseText = result.content?.[0]?.text || ''
      const pageMatch = responseText.match(/\*\*Page \d+ of \d+\*\* \((\d+) articles on this page, (\d+) total\)/)
      const articlesCount = pageMatch ? parseInt(pageMatch[1]) : 0
      
      // The MCP server's "total" count is incorrect, so we calculate the real total
      // by looking at the highest article number in the results
      const articleNumberMatches = responseText.match(/\n(\d+)\.\s\*\*/g)
      let realTotalResults = pageMatch ? parseInt(pageMatch[2]) : 0
      
      if (articleNumberMatches && articleNumberMatches.length > 0) {
        const articleNumbers = articleNumberMatches.map(match => {
          const num = match.match(/\n(\d+)\./)
          return num ? parseInt(num[1]) : 0
        })
        const maxArticleNumber = Math.max(...articleNumbers)
        if (maxArticleNumber > realTotalResults) {
          realTotalResults = maxArticleNumber
        }
      }
      
      console.log(`[MCP] Search completed, found ${articlesCount} articles, real total: ${realTotalResults}`)
      
      return {
        success: true,
        query: query,
        category: category,
        page: page,
        per_page: per_page,
        total_results: realTotalResults,
        articles: result,
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
   * List all categories in the knowledge base
   * @returns {Promise<object>} - Categories list
   */
  async listCategories() {
    try {
      console.log('[MCP] Fetching categories list')
      
      const result = await this.callFunction('list_categories', {})
      
      // Parse the response similar to listAllFolders
      let parsedResult = result
      if (typeof result === 'string') {
        try {
          parsedResult = JSON.parse(result)
        } catch (parseError) {
          console.error('[MCP] Failed to parse categories response:', parseError.message)
          throw new Error('Invalid response format from MCP server')
        }
      }
      
      // Handle MCP server content format
      let categoriesData = []
      if (parsedResult.content && Array.isArray(parsedResult.content) && parsedResult.content[0]?.text) {
        const contentText = parsedResult.content[0].text
        console.log('[MCP] Categories content received, parsing...')
        
        // The categories come as formatted text, we need to extract from the list_all_folders call instead
        // For now, return empty but let's get from list_all_folders
        try {
          const foldersResult = await this.listAllFolders()
          if (foldersResult.success && foldersResult.categories) {
            categoriesData = foldersResult.categories
            console.log(`[MCP] Extracted ${categoriesData.length} categories from folders data`)
          }
        } catch (folderError) {
          console.error('[MCP] Failed to get categories from folders:', folderError.message)
        }
      } else if (parsedResult.categories && Array.isArray(parsedResult.categories)) {
        categoriesData = parsedResult.categories
      } else if (Array.isArray(parsedResult)) {
        categoriesData = parsedResult
      }
      
      console.log(`[MCP] Categories list completed: ${categoriesData.length} categories found`)
      
      return {
        success: true,
        categories: categoriesData,
        count: categoriesData.length,
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
   * List all folders from all categories in the knowledge base
   * @returns {Promise<object>} - All folders list with category information
   */
  async listAllFolders() {
    try {
      console.log('[MCP] Fetching all folders from all categories')
      
      const result = await this.callFunction('list_all_folders', {})
      
      // Parse the JSON response if it's a string
      let parsedResult = result
      if (typeof result === 'string') {
        try {
          parsedResult = JSON.parse(result)
        } catch (parseError) {
          console.error('[MCP] Failed to parse folders response:', parseError.message)
          throw new Error('Invalid response format from MCP server')
        }
      }
      
      // Handle different response formats
      let foldersData = parsedResult
      if (parsedResult.content && Array.isArray(parsedResult.content) && parsedResult.content[0]?.text) {
        try {
          foldersData = JSON.parse(parsedResult.content[0].text)
        } catch (parseError) {
          console.error('[MCP] Failed to parse folders content:', parseError.message)
          throw new Error('Invalid content format from MCP server')
        }
      }
      
      console.log(`[MCP] Retrieved ${foldersData.total_folders || 0} folders from ${foldersData.total_categories || 0} categories`)
      
      return {
        success: true,
        folders: foldersData.folders || [],
        categories: foldersData.categories || [],
        total_folders: foldersData.total_folders || 0,
        total_categories: foldersData.total_categories || 0,
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      console.error('[MCP] All folders fetch failed:', error.message)
      
      // Return empty folders if MCP doesn't support this function
      if (error.message.includes('Unknown method') || error.message.includes('not found')) {
        return {
          success: true,
          folders: [],
          categories: [],
          total_folders: 0,
          total_categories: 0,
          note: 'All folders listing not supported by MCP server',
          timestamp: new Date().toISOString()
        }
      }
      
      throw new Error(`Failed to list all folders: ${error.message}`)
    }
  }

  /**
   * Create a new article in Freshdesk
   * @param {object} articleData - Article data
   * @returns {Promise<object>} - Created article data
   */
  async createArticle(articleData) {
    try {
      console.log(`[MCP] Creating article: ${articleData.title}`)
      
      if (!articleData.title || !articleData.description || !articleData.folder_id) {
        throw new Error('Title, description, and folder_id are required')
      }

      // Prepare the data for MCP server with correct field names
      const mcpArticleData = {
        title: articleData.title,
        description: articleData.description,
        folder_id: parseInt(articleData.folder_id),
        tags: Array.isArray(articleData.tags) ? articleData.tags : [],
        status: parseInt(articleData.status) || 1
      }

      // Add SEO fields if provided
      if (articleData.seo_title) {
        mcpArticleData.seo_title = articleData.seo_title
      }
      
      if (articleData.meta_description) {
        mcpArticleData.meta_description = articleData.meta_description
      }

      console.log(`[MCP] Sending to MCP server:`, {
        ...mcpArticleData,
        description: mcpArticleData.description ? `${mcpArticleData.description.substring(0, 100)}...` : 'No description'
      })

      const result = await this.callFunction('create_article', mcpArticleData)
      
      console.log('[MCP] Raw result from create_article:', JSON.stringify(result, null, 2))
      
      // Parse the response properly
      let createdArticle = null
      let articleId = null
      
      if (result.content && Array.isArray(result.content) && result.content[0]?.text) {
        const content = result.content[0].text
        console.log('[MCP] Content response:', content)
        
        if (content.includes('✅ **Article Created Successfully!**')) {
          // Extract article ID from success message
          const articleIdMatch = content.match(/🆔 \*\*Article ID\*\*: (\d+)/)
          if (articleIdMatch) {
            articleId = parseInt(articleIdMatch[1])
            
            // Create article data object
            createdArticle = {
              id: articleId,
              title: mcpArticleData.title,
              folder_id: mcpArticleData.folder_id,
              status: mcpArticleData.status,
              tags: mcpArticleData.tags || []
            }
            
            // Extract other details if available
            const titleMatch = content.match(/📝 \*\*Title\*\*: (.+)/)
            if (titleMatch) {
              createdArticle.title = titleMatch[1]
            }
            
            const statusMatch = content.match(/📊 \*\*Status\*\*: (.+)/)
            if (statusMatch) {
              createdArticle.status_text = statusMatch[1]
            }
          }
        } else {
          // Error response
          console.error('[MCP] Error in article creation:', content)
          throw new Error(content || 'Failed to create article')
        }
      } else if (result.id) {
        // Direct response format
        createdArticle = result
        articleId = result.id
      }
      
      console.log(`[MCP] Article created successfully: ${articleId || 'Unknown ID'}`)
      
      return {
        success: true,
        article: createdArticle,
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      console.error(`[MCP] Article creation failed:`, error.message)
      throw new Error(`Failed to create article: ${error.message}`)
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
      const mode = this.nodeEnv === 'production' ? 'HTTP' : 'stdio'
      console.log(`[MCP] Testing connection to MCP server (${mode} mode)`)
      
      const startTime = Date.now()
      
      // Try a simple search to test connectivity
      await this.searchKnowledgeBase('test connection', null, 1, 1)
      
      const duration = Date.now() - startTime
      
      return {
        success: true,
        status: 'connected',
        mode: mode.toLowerCase(),
        responseTime: duration,
        mcpUrl: this.nodeEnv === 'production' ? this.mcpServerUrl : undefined,
        mcpPath: this.nodeEnv !== 'production' ? this.absoluteMcpPath : undefined,
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      console.error('[MCP] Connection test failed:', error.message)
      
      return {
        success: false,
        status: 'disconnected',
        mode: this.nodeEnv === 'production' ? 'http' : 'stdio',
        error: error.message,
        mcpUrl: this.nodeEnv === 'production' ? this.mcpServerUrl : undefined,
        mcpPath: this.nodeEnv !== 'production' ? this.absoluteMcpPath : undefined,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Get MCP client health status
   * @returns {object} - Health information
   */
  getHealthStatus() {
    const isProduction = this.nodeEnv === 'production'
    
    return {
      mode: isProduction ? 'http' : 'stdio',
      mcpServerUrl: isProduction ? this.mcpServerUrl : undefined,
      mcpServerPath: !isProduction ? this.mcpServerPath : undefined,
      absoluteMcpPath: !isProduction ? this.absoluteMcpPath : undefined,
      timeout: this.timeout,
      maxRetries: this.maxRetries,
      configured: isProduction ? !!this.mcpServerUrl : !!this.mcpServerPath,
      environment: this.nodeEnv,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Create a new folder in Freshdesk knowledge base
   * @param {object} folderData - Folder data
   * @returns {Promise<object>} - Created folder information
   */
  async createFolder(folderData) {
    try {
      const { name, description, category_id, parent_folder_id, visibility } = folderData
      
      console.log('[MCP] Creating folder:', { 
        name, 
        category_id, 
        parent_folder_id, 
        visibility,
        folderData: JSON.stringify(folderData)
      })
      
      const result = await this.callFunction('create_folder', {
        name,
        description,
        category_id,
        parent_folder_id,
        visibility
      })
      
      console.log('[MCP] Raw result from create_folder:', JSON.stringify(result, null, 2))
      
      // Parse the JSON response if it's a string
      let parsedResult = result
      if (typeof result === 'string') {
        try {
          parsedResult = JSON.parse(result)
        } catch (parseError) {
          console.error('[MCP] Failed to parse folder creation response:', parseError.message)
          throw new Error('Invalid response format from MCP server')
        }
      }
      
      // Handle different response formats
      let responseData = parsedResult  // Renamed from folderData to avoid conflict
      if (parsedResult.content && Array.isArray(parsedResult.content) && parsedResult.content[0]?.text) {
        // If the response is in content format, try to parse it
        const content = parsedResult.content[0].text
        console.log('[MCP] Content response:', content)
        
        if (content.includes('✅ **Folder Created Successfully!**')) {
          // Success response - extract folder data if available
          if (parsedResult.folder) {
            responseData = parsedResult
          } else {
            // Extract folder ID from success message if available
            const folderIdMatch = content.match(/\*\*ID\*\*: (\d+)/)
            if (folderIdMatch) {
              responseData = {
                success: true,
                folder: {
                  id: parseInt(folderIdMatch[1]),
                  name: name,
                  category_id: category_id,
                  parent_folder_id: parent_folder_id,
                  visibility: visibility || 2
                }
              }
            } else {
              responseData = { success: true, message: 'Folder created successfully' }
            }
          }
        } else {
          // Error response
          console.error('[MCP] Error in folder creation:', content)
          throw new Error(content || 'Failed to create folder')
        }
      }
      
      console.log('[MCP] Folder creation completed:', responseData.success ? 'Success' : 'Failed')
      console.log('[MCP] Final response data:', JSON.stringify(responseData, null, 2))
      
      return {
        success: responseData.success || true,
        folder: responseData.folder || null,
        message: responseData.message || 'Folder created successfully',
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      console.error('[MCP] Folder creation failed:', error.message)
      console.error('[MCP] Error stack:', error.stack)
      
      // Return error information
      throw new Error(`Failed to create folder: ${error.message}`)
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