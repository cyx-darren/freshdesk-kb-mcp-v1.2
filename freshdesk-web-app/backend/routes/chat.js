import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import mcpClient from '../services/mcp-client.js'
import { askClaude } from '../services/claude.js'

const router = express.Router()

/**
 * Extract key search terms from user message
 * @param {string} message - User's message
 * @returns {string} - Extracted search terms
 */
function extractSearchTerms(message) {
  // Remove common stop words and extract meaningful terms
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'i', 'you', 'my', 'me', 'we', 'us',
    'what', 'when', 'where', 'why', 'how', 'can', 'could', 'would',
    'should', 'do', 'does', 'did', 'have', 'had', 'please', 'help'
  ])

  // Clean and split message into words
  const words = message
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))

  // Take the most relevant terms (limit to 5 for better search performance)
  const searchTerms = words.slice(0, 5).join(' ')
  
  // If no meaningful terms found, use original message (truncated)
  return searchTerms || message.substring(0, 50)
}

/**
 * Format search results for Claude
 * @param {Array} results - MCP search results
 * @returns {Array} - Formatted results for Claude
 */
function formatSearchResults(results) {
  if (!results || !Array.isArray(results)) {
    return []
  }

  return results.map((article, index) => ({
    id: article.id || `article-${index + 1}`,
    title: article.title || 'Untitled',
    content: article.content || article.description || 'No content available',
    url: article.url || null,
    source: 'freshdesk_kb'
  }))
}

/**
 * Parse articles from MCP text response
 * @param {string} text - Formatted text response from MCP
 * @returns {Array} - Array of parsed articles
 */
function parseArticlesFromText(text) {
  const articles = []
  
  if (!text || typeof text !== 'string') {
    return articles
  }

  // Split by article entries (numbered items)
  const articleMatches = text.split(/\n\d+\.\s+\*\*/)
  
  for (let i = 1; i < articleMatches.length; i++) {
    const articleText = articleMatches[i]
    
    // Extract title (first line before **) 
    const titleMatch = articleText.match(/^([^*\n]+)/)
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled'
    
    // Extract Article ID
    const idMatch = articleText.match(/🆔 Article ID: (\d+)/)
    const id = idMatch ? idMatch[1] : null
    
    // Extract content (between 📄 and 📅)
    const contentMatch = articleText.match(/📄\s+(.+?)(?=\n\s+📅|$)/s)
    let content = contentMatch ? contentMatch[1].trim() : ''
    
    // Clean up content - remove HTML tags and extra formatting
    content = content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\.\.\.$/, '') // Remove trailing ellipsis
      .trim()
    
    if (id && title) {
      articles.push({
        id: id,
        title: title,
        content: content || `Content for article ${title}`,
        url: `https://easyprint.freshdesk.com/support/solutions/articles/${id}`,
        source: 'freshdesk_kb'
      })
    }
  }
  
  return articles
}

/**
 * Generate system prompt for Claude
 * @returns {string} - System prompt for Claude
 */
function generateSystemPrompt() {
  return `You are a helpful assistant for EasyPrint's team. Answer questions based on the Freshdesk knowledge base articles provided. 
Always cite the article ID when using information from an article using this format: [Article #ID].
If the information isn't in the provided articles, say so clearly.
Be professional, concise, and helpful.`
}

/**
 * POST /
 * Chat with AI assistant based on Freshdesk knowledge base
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { message } = req.body
    const userId = req.user.id
    const userEmail = req.user.email

    // Validate message is provided
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Message is required and cannot be empty',
        code: 'MISSING_MESSAGE'
      })
    }

    const cleanMessage = message.trim()
    console.log(`[CHAT] User ${userEmail} asking: "${cleanMessage}"`)

    // Extract search terms from message
    const searchTerms = extractSearchTerms(cleanMessage)
    console.log(`[CHAT] Extracted search terms: "${searchTerms}"`)

    let searchResults = []
    let mcpError = null

    // Search knowledge base using MCP client based on the message
    try {
      console.log(`[CHAT] Searching knowledge base for: "${searchTerms}"`)
      const searchResult = await mcpClient.searchKnowledgeBase(searchTerms, null, 1, 8)
      
      // Parse the MCP response - it returns text content that needs to be parsed
      const responseText = searchResult.articles?.content?.[0]?.text || ''
      console.log(`[CHAT] Raw MCP response:`, responseText.substring(0, 200) + '...')
      
      // Extract articles from the formatted text response
      searchResults = parseArticlesFromText(responseText)
      console.log(`[CHAT] Found ${searchResults.length} relevant articles`)
    } catch (error) {
      console.error('[CHAT] MCP search failed:', error.message)
      mcpError = error
      searchResults = []
    }

    // Format search results for Claude
    const formattedResults = formatSearchResults(searchResults)

    let claudeResponse = ''
    let claudeError = null

    // Send the message and search results to Claude
    try {
      console.log(`[CHAT] Sending to Claude with ${formattedResults.length} articles`)
      claudeResponse = await askClaude(cleanMessage, formattedResults)
      console.log(`[CHAT] Claude response generated successfully`)
    } catch (error) {
      console.error('[CHAT] Claude API failed:', error.message)
      claudeError = error
      
      // Provide fallback response if Claude fails
      if (formattedResults.length > 0) {
        claudeResponse = `I found ${formattedResults.length} relevant articles in our knowledge base:

${formattedResults.map((article, index) => 
  `${index + 1}. ${article.title} [Article #${article.id}]`
).join('\n')}

Please review these articles for information about: "${cleanMessage}"`
      } else {
        claudeResponse = `I'm currently unable to provide assistance with your question: "${cleanMessage}". Please contact our support team.`
      }
    }

    // Return Claude's response with proper formatting
    const response = {
      success: true,
      message: claudeResponse,
      context: {
        search_terms: searchTerms,
        articles_found: formattedResults.length,
        response_time_ms: Date.now()
      },
      articles: formattedResults.map(article => ({
        id: article.id,
        title: article.title,
        url: article.url
      })),
      user: {
        id: userId,
        email: userEmail
      },
      timestamp: new Date().toISOString()
    }

    // Add warnings if there were errors
    if (mcpError || claudeError) {
      response.warnings = []
      if (mcpError) {
        response.warnings.push({
          type: 'search_error',
          message: 'Knowledge base search partially failed'
        })
      }
      if (claudeError) {
        response.warnings.push({
          type: 'ai_error',
          message: 'AI assistant partially unavailable'
        })
      }
    }

    console.log(`[CHAT] Response sent to ${userEmail}`)
    res.status(200).json(response)

  } catch (error) {
    console.error('Chat endpoint error:', {
      error: error.message,
      user: req.user?.email,
      message: req.body?.message?.substring(0, 100),
      timestamp: new Date().toISOString()
    })

    // Handle errors gracefully with appropriate status codes
    if (error.message?.includes('rate limit') || error.status === 429) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please wait before sending another message.',
        code: 'RATE_LIMIT_EXCEEDED'
      })
    }

    if (error.message?.includes('API key') || error.status === 401) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'AI assistant is currently unavailable due to configuration issues',
        code: 'AI_SERVICE_ERROR'
      })
    }

    res.status(500).json({
      error: 'Chat failed',
      message: 'An unexpected error occurred while processing your message',
      code: 'CHAT_ERROR'
    })
  }
})



// Export the router
export default router 