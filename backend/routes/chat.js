import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import mcpClient from '../services/mcp-client.js'
import { askClaude } from '../services/claude.js'
import { supabase } from '../config/supabase.js'

const router = express.Router()

/**
 * Extract key search terms from user message (improved version)
 * @param {string} message - User's message
 * @returns {string} - Extracted search terms
 */
function extractSearchTerms(message) {
  // Common stop words to remove
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'i', 'you', 'my', 'me', 'we', 'us',
    'what', 'when', 'where', 'why', 'how', 'can', 'could', 'would',
    'should', 'do', 'does', 'did', 'have', 'had', 'please', 'help',
    'tell', 'about', 'get', 'need', 'want', 'know', 'find', 'show'
  ])

  // Important product-specific terms and business terms to always keep
  const importantTerms = new Set([
    'tubular', 'polyester', 'lanyards', 'lanyard', 'moq', 'minimum', 'order', 'quantity',
    'shipping', 'delivery', 'payment', 'price', 'pricing', 'cost', 'material', 'materials',
    'print', 'printing', 'custom', 'design', 'logo', 'color', 'colors', 'size', 'sizes',
    'bulk', 'wholesale', 'retail', 'business', 'corporate', 'promotional', 'marketing',
    'installation', 'setup', 'troubleshoot', 'problem', 'issue', 'error', 'support',
    'difference', 'between', 'compare', 'comparison', 'vs', 'versus', 'options',
    'fabric', 'cotton', 'nylon', 'quality', 'durability', 'thickness', 'width',
    'accessories', 'hardware', 'clips', 'hooks', 'attachments', 'customization'
  ])

  // Clean and split message into words
  const words = message
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .split(/\s+/)
    .filter(word => word.length > 0)

  // Filter words but prioritize important terms
  const filteredWords = []
  
  for (const word of words) {
    // Always keep important product/business terms
    if (importantTerms.has(word)) {
      filteredWords.push(word)
    }
    // Keep acronyms like MOQ, FAQ, etc.
    else if (word.length >= 2 && /^[A-Z]{2,}$/i.test(word)) {
      filteredWords.push(word)
    }
    // Keep longer words that aren't stop words
    else if (word.length > 2 && !stopWords.has(word)) {
      filteredWords.push(word)
    }
    
    // Stop if we have enough terms but always include important ones
    if (filteredWords.length >= 10 && !importantTerms.has(word)) {
      break
    }
  }

  // Join the filtered words
  const searchTerms = filteredWords.join(' ')
  
  // If no meaningful terms found, use original message (truncated)
  return searchTerms || message.substring(0, 100)
}

/**
 * Alternative: Use full user question as search query
 * @param {string} message - User's message
 * @returns {string} - Full or lightly cleaned message
 */
function getFullSearchQuery(message) {
  // Light cleaning: remove excessive punctuation and normalize spaces
  return message
    .replace(/[!@#$%^&*()_+={}[\]|\\:";'<>?,.\/]/g, ' ') // Replace most punctuation with spaces
    .replace(/\s+/g, ' ') // Normalize multiple spaces
    .trim()
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
  return `You are an expert EasyPrint customer support assistant with access to comprehensive knowledge base articles. Your goal is to provide detailed, accurate, and actionable answers based on the provided knowledge base content.

CRITICAL INSTRUCTIONS:
- Use ALL available information from the provided articles to give complete, detailed answers
- When articles mention "images" or "attached images", acknowledge that these contain important visual information (like color charts, size guides, etc.)
- Always cite specific article IDs when referencing information: [Article #ID] 
- Provide specific details when available: exact quantities, pricing, colors, specifications, etc.
- Be confident in your answers when the information is clearly stated in the articles
- Organize complex information clearly with sections/bullet points when helpful
- If multiple related products are mentioned, provide information about each
- When articles reference MOQ (minimum order quantity), pricing, or specifications, include exact details

RESPONSE STRATEGY:
- Start with the direct answer to the user's question
- Provide detailed information from the articles
- Include relevant specifications, limitations, or requirements
- End with any additional helpful context or next steps

Remember: You have access to comprehensive EasyPrint product information. Use it fully to help customers get complete answers rather than generic responses.`
}

/**
 * POST /
 * Chat with AI assistant based on Freshdesk knowledge base
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { message, sessionId } = req.body
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

    // Handle session management
    let currentSessionId = sessionId
    if (!currentSessionId) {
      // Create new session
      const sessionTitle = generateSessionTitle(cleanMessage)
      const { data: newSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert([{
          user_id: userId,
          title: sessionTitle,
          is_active: true
        }])
        .select()
        .single()

      if (sessionError) {
        console.error('[CHAT] Error creating new session:', sessionError)
        return res.status(500).json({
          error: 'Session creation failed',
          message: 'Could not create new chat session',
          code: 'SESSION_CREATE_ERROR'
        })
      }

      currentSessionId = newSession.id
      console.log(`[CHAT] Created new session: ${currentSessionId}`)
    }

    // Save user message to database
    const { error: userMessageError } = await supabase
      .from('chat_messages')
      .insert([{
        session_id: currentSessionId,
        role: 'user',
        content: cleanMessage
      }])

    if (userMessageError) {
      console.error('[CHAT] Error saving user message:', userMessageError)
    }

    // Try multiple search approaches for better results
    const extractedTerms = extractSearchTerms(cleanMessage)
    const fullQuery = getFullSearchQuery(cleanMessage)
    
    // Create a cleaner keyword-based search for better MCP results
    // Focus on product-specific terms and important keywords
    const keywordSearch = extractedTerms
      .split(' ')
      .filter(word => {
        // Keep all important product terms
        const importantProductTerms = ['leather', 'card', 'holders', 'holder', 'colors', 'colours', 
                                     'available', 'lanyards', 'lanyard', 'tubular', 'polyester',
                                     'printing', 'shipping', 'moq', 'minimum', 'order', 'quantity']
        
        // Keep words longer than 3 characters that aren't generic question words
        const genericWords = ['what', 'how', 'when', 'where', 'why', 'can', 'could', 'would', 'should']
        
        return importantProductTerms.includes(word.toLowerCase()) || 
               (word.length > 3 && !genericWords.includes(word.toLowerCase()))
      })
      .slice(0, 6) // Keep up to 6 most relevant terms
      .join(' ')
    
    console.log(`[CHAT] Extracted search terms: "${extractedTerms}"`)
    console.log(`[CHAT] Keyword search: "${keywordSearch}"`)
    console.log(`[CHAT] Full search query: "${fullQuery}"`)

    let searchResults = []
    let mcpError = null

    // Search knowledge base using MCP client - use keyword search as primary
    try {
      console.log(`[CHAT] Searching knowledge base with keyword terms: "${keywordSearch}"`)
      const searchResult = await mcpClient.searchKnowledgeBase(keywordSearch, null, 1, 15)
      
      // Parse the MCP response - it returns text content that needs to be parsed
      const responseText = searchResult.articles?.content?.[0]?.text || ''
      console.log(`[CHAT] Raw MCP response:`, responseText.substring(0, 200) + '...')
      
      // Extract articles from the formatted text response
      searchResults = parseArticlesFromText(responseText)
      console.log(`[CHAT] Found ${searchResults.length} relevant articles with extracted terms`)
      
      // If keyword search didn't return good results, try with the full extracted terms
      if (searchResults.length < 3) {
        console.log(`[CHAT] Trying fallback search with extracted terms: "${extractedTerms}"`)
        try {
          const fallbackResult = await mcpClient.searchKnowledgeBase(extractedTerms, null, 1, 15)
          const fallbackResponseText = fallbackResult.articles?.content?.[0]?.text || ''
          const fallbackResults = parseArticlesFromText(fallbackResponseText)
          
          if (fallbackResults.length > searchResults.length) {
            console.log(`[CHAT] Fallback search found ${fallbackResults.length} articles - using fallback results`)
            searchResults = fallbackResults
          }
        } catch (fallbackError) {
          console.warn(`[CHAT] Fallback search failed:`, fallbackError.message)
        }
      }
      
      console.log(`[CHAT] Final article count: ${searchResults.length}`)
      
      // Fetch full content for the most relevant articles (increase to top 5 for better context)
      const topArticles = searchResults.slice(0, 5)
      const enhancedResults = []
      
      for (const article of topArticles) {
        try {
          console.log(`[CHAT] Fetching full content for Article #${article.id}`)
          const fullArticle = await mcpClient.getArticle(article.id)
          
          console.log(`[CHAT] Full article result for #${article.id}:`, JSON.stringify(fullArticle, null, 2))
          
          if (fullArticle.success && fullArticle.article) {
            // Extract content from MCP response structure
            let fullContent = article.content // fallback to original
            
            if (fullArticle.article.content && Array.isArray(fullArticle.article.content)) {
              // Content is in array format [{type: "text", text: "..."}]
              const textContent = fullArticle.article.content
                .filter(item => item.type === 'text')
                .map(item => item.text)
                .join('\n')
              
              if (textContent) {
                // Extract image URLs before cleaning HTML
                const imageUrls = []
                const imgRegex = /<img[^>]*src="([^"]*)"[^>]*>/g
                let imgMatch
                while ((imgMatch = imgRegex.exec(textContent)) !== null) {
                  imageUrls.push(imgMatch[1])
                }
                
                // Clean up HTML tags and format nicely
                fullContent = textContent
                  .replace(/<[^>]*>/g, '') // Remove HTML tags
                  .replace(/&quot;/g, '"') // Decode HTML entities
                  .replace(/&amp;/g, '&')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .replace(/\n\s*\n/g, '\n\n') // Clean up multiple newlines
                  .trim()
                  
                // Add image reference information if images exist
                if (imageUrls.length > 0) {
                  fullContent += '\n\n**Referenced Images in this article:**\n'
                  imageUrls.forEach((url, index) => {
                    fullContent += `${index + 1}. ${url}\n`
                  })
                  fullContent += '\n(Note: These images contain important visual information referenced in the article content)'
                }
              }
            } else if (typeof fullArticle.article.content === 'string') {
              fullContent = fullArticle.article.content
            }
            
            console.log(`[CHAT] Extracted content length for #${article.id}:`, fullContent.length)
            console.log(`[CHAT] Content preview:`, fullContent.substring(0, 300) + '...')
            
            enhancedResults.push({
              ...article,
              content: fullContent,
              title: fullArticle.article.title || article.title,
              full_content_available: true
            })
            console.log(`[CHAT] ✅ Enhanced Article #${article.id} with full content`)
          } else {
            console.log(`[CHAT] ❌ No valid content in full article response for #${article.id}`)
            enhancedResults.push(article)
          }
        } catch (articleError) {
          console.warn(`[CHAT] ❌ Failed to fetch full content for Article #${article.id}:`, articleError.message)
          enhancedResults.push(article) // Use original excerpt if full fetch fails
        }
      }
      
      // Add remaining articles without enhancement (if any)
      enhancedResults.push(...searchResults.slice(5))
      searchResults = enhancedResults
      
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
      const systemPrompt = generateSystemPrompt()
      claudeResponse = await askClaude(cleanMessage, formattedResults, systemPrompt)
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

    // After generating Claude response, save assistant message
    const metadata = {
      articles: formattedResults.map(article => ({
        id: article.id,
        title: article.title,
        url: article.url
      })),
      search_terms: keywordSearch,
      articles_found: formattedResults.length
    }

    const { error: assistantMessageError } = await supabase
      .from('chat_messages')
      .insert([{
        session_id: currentSessionId,
        role: 'assistant',
        content: claudeResponse,
        metadata: metadata
      }])

    if (assistantMessageError) {
      console.error('[CHAT] Error saving assistant message:', assistantMessageError)
    }

    // Return Claude's response with session info
    const response = {
      success: true,
      message: claudeResponse,
      sessionId: currentSessionId,
      context: {
        search_terms_used: keywordSearch,
        original_query: cleanMessage,
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

/**
 * GET /sessions
 * Get user's chat sessions with pagination
 */
router.get('/sessions', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const limit = parseInt(req.query.limit) || 50
    const offset = parseInt(req.query.offset) || 0

    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select('id, title, created_at, updated_at, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Failed to fetch chat sessions: ${error.message}`)
    }

    res.status(200).json({
      success: true,
      sessions: sessions || [],
      pagination: {
        limit,
        offset,
        total: sessions?.length || 0
      }
    })

  } catch (error) {
    console.error('Get chat sessions error:', error)
    res.status(500).json({
      error: 'Failed to fetch chat sessions',
      message: error.message,
      code: 'SESSIONS_FETCH_ERROR'
    })
  }
})

/**
 * GET /sessions/:sessionId/messages
 * Get messages for a specific chat session
 */
router.get('/sessions/:sessionId/messages', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const { sessionId } = req.params

    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single()

    if (sessionError || !session) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'Chat session not found or access denied',
        code: 'SESSION_NOT_FOUND'
      })
    }

    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('id, role, content, metadata, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch messages: ${error.message}`)
    }

    res.status(200).json({
      success: true,
      sessionId: sessionId,
      messages: messages || []
    })

  } catch (error) {
    console.error('Get chat messages error:', error)
    res.status(500).json({
      error: 'Failed to fetch chat messages',
      message: error.message,
      code: 'MESSAGES_FETCH_ERROR'
    })
  }
})

/**
 * POST /sessions
 * Create a new chat session
 */
router.post('/sessions', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const { title } = req.body

    const sessionTitle = title || 'New Conversation'

    const { data: newSession, error } = await supabase
      .from('chat_sessions')
      .insert([{
        user_id: userId,
        title: sessionTitle,
        is_active: true
      }])
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`)
    }

    res.status(201).json({
      success: true,
      session: newSession
    })

  } catch (error) {
    console.error('Create chat session error:', error)
    res.status(500).json({
      error: 'Failed to create chat session',
      message: error.message,
      code: 'SESSION_CREATE_ERROR'
    })
  }
})

/**
 * PUT /sessions/:sessionId
 * Update chat session (rename, archive, etc.)
 */
router.put('/sessions/:sessionId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const { sessionId } = req.params
    const { title, is_active } = req.body

    const updates = {}
    if (title !== undefined) updates.title = title
    if (is_active !== undefined) updates.is_active = is_active

    const { data: updatedSession, error } = await supabase
      .from('chat_sessions')
      .update(updates)
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update session: ${error.message}`)
    }

    if (!updatedSession) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'Chat session not found or access denied',
        code: 'SESSION_NOT_FOUND'
      })
    }

    res.status(200).json({
      success: true,
      session: updatedSession
    })

  } catch (error) {
    console.error('Update chat session error:', error)
    res.status(500).json({
      error: 'Failed to update chat session',
      message: error.message,
      code: 'SESSION_UPDATE_ERROR'
    })
  }
})

/**
 * DELETE /sessions/:sessionId
 * Delete a chat session and all its messages
 */
router.delete('/sessions/:sessionId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const { sessionId } = req.params

    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to delete session: ${error.message}`)
    }

    res.status(200).json({
      success: true,
      message: 'Chat session deleted successfully'
    })

  } catch (error) {
    console.error('Delete chat session error:', error)
    res.status(500).json({
      error: 'Failed to delete chat session',
      message: error.message,
      code: 'SESSION_DELETE_ERROR'
    })
  }
})

/**
 * GET /history (legacy endpoint for compatibility)
 * Get recent chat history across all sessions
 */
router.get('/history', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const limit = parseInt(req.query.limit) || 50

    const { data: recentMessages, error } = await supabase
      .from('chat_messages')
      .select(`
        id, role, content, metadata, created_at,
        chat_sessions!inner(id, title, user_id)
      `)
      .eq('chat_sessions.user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to fetch chat history: ${error.message}`)
    }

    res.status(200).json({
      success: true,
      messages: recentMessages || [],
      total: recentMessages?.length || 0
    })

  } catch (error) {
    console.error('Get chat history error:', error)
    res.status(500).json({
      error: 'Failed to fetch chat history',
      message: error.message,
      code: 'HISTORY_FETCH_ERROR'
    })
  }
})

/**
 * DELETE /history (legacy endpoint for compatibility)
 * Clear all chat history for the user
 */
router.delete('/history', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id

    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to clear chat history: ${error.message}`)
    }

    res.status(200).json({
      success: true,
      message: 'All chat history cleared successfully'
    })

  } catch (error) {
    console.error('Clear chat history error:', error)
    res.status(500).json({
      error: 'Failed to clear chat history',
      message: error.message,
      code: 'HISTORY_CLEAR_ERROR'
    })
  }
})

/**
 * Helper function to generate session title from first message
 */
function generateSessionTitle(message) {
  if (!message || typeof message !== 'string') {
    return 'New Conversation'
  }

  // Clean and truncate the message
  const cleanMessage = message
    .trim()
    .replace(/[^\w\s\-?!.]/g, '') // Remove special characters except basic punctuation
    .replace(/\s+/g, ' ') // Normalize spaces

  // Truncate to reasonable length
  if (cleanMessage.length <= 50) {
    return cleanMessage
  }

  // Find a good break point
  const truncated = cleanMessage.substring(0, 47)
  const lastSpace = truncated.lastIndexOf(' ')
  
  if (lastSpace > 20) {
    return truncated.substring(0, lastSpace) + '...'
  }
  
  return truncated + '...'
}

// Export the router
export default router 