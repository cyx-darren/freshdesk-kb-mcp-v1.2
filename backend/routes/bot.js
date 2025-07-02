import express from 'express'
import mcpClient from '../services/mcp-client.js'
import { askClaude } from '../services/claude.js'
import { supabase } from '../config/supabase.js'

const router = express.Router()

/**
 * Bot API Key middleware - validates Discord bot requests
 */
function validateBotAuth(req, res, next) {
  const botApiKey = req.headers['x-bot-api-key']
  const expectedBotKey = process.env.DISCORD_BOT_API_KEY || 'discord-bot-secret-key-change-in-production'
  
  if (!botApiKey || botApiKey !== expectedBotKey) {
    return res.status(401).json({
      error: 'Bot authentication required',
      message: 'Invalid or missing bot API key',
      code: 'INVALID_BOT_KEY'
    })
  }
  
  // Set a virtual bot user for logging
  req.user = {
    id: 'discord-bot',
    email: 'discord-bot@easyprint.internal',
    source: 'discord-bot'
  }
  
  next()
}

/**
 * Extract key search terms from user message (same as main chat)
 */
function extractSearchTerms(message) {
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'i', 'you', 'my', 'me', 'we', 'us',
    'what', 'when', 'where', 'why', 'how', 'can', 'could', 'would',
    'should', 'do', 'does', 'did', 'have', 'had', 'please', 'help',
    'tell', 'about', 'get', 'need', 'want', 'know', 'find', 'show'
  ])

  const importantTerms = new Set([
    'tubular', 'polyester', 'lanyards', 'lanyard', 'moq', 'minimum', 'order', 'quantity',
    'shipping', 'delivery', 'payment', 'price', 'pricing', 'cost', 'material', 'materials',
    'print', 'printing', 'custom', 'design', 'logo', 'color', 'colors', 'size', 'sizes',
    'bulk', 'wholesale', 'retail', 'business', 'corporate', 'promotional', 'marketing',
    'installation', 'setup', 'troubleshoot', 'problem', 'issue', 'error', 'support',
    'difference', 'between', 'compare', 'comparison', 'vs', 'versus', 'options',
    'fabric', 'cotton', 'nylon', 'quality', 'durability', 'thickness', 'width',
    'accessories', 'hardware', 'clips', 'hooks', 'attachments', 'customization',
    // Add more specific product terms for better matching
    'leather', 'card', 'holders', 'holder', 'colours', 'available', 'white', 'black',
    'pvc', 'luggage', 'tag', 'tags', 'back', 'part', 'colour', 'restrictions'
  ])

  const words = message
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0)

  const filteredWords = []
  
  for (const word of words) {
    if (importantTerms.has(word)) {
      filteredWords.push(word)
    }
    else if (word.length >= 2 && /^[A-Z]{2,}$/i.test(word)) {
      filteredWords.push(word)
    }
    else if (word.length > 2 && !stopWords.has(word)) {
      filteredWords.push(word)
    }
    
    if (filteredWords.length >= 10 && !importantTerms.has(word)) {
      break
    }
  }

  const searchTerms = filteredWords.join(' ')
  return searchTerms || message.substring(0, 100)
}

/**
 * Create refined keyword search (matching web app logic)
 */
function createKeywordSearch(extractedTerms) {
  // Create a cleaner keyword-based search for better MCP results
  // Focus on product-specific terms and important keywords
  const keywordSearch = extractedTerms
    .split(' ')
    .filter(word => {
      // Keep all important product terms
      const importantProductTerms = ['leather', 'card', 'holders', 'holder', 'colors', 'colours', 
                                   'available', 'lanyards', 'lanyard', 'tubular', 'polyester',
                                   'printing', 'shipping', 'moq', 'minimum', 'order', 'quantity',
                                   'white', 'black', 'pvc', 'luggage', 'tag', 'tags', 'back', 'part',
                                   'colour', 'restrictions', 'material', 'materials']
      
      // Keep words longer than 3 characters that aren't generic question words
      const genericWords = ['what', 'how', 'when', 'where', 'why', 'can', 'could', 'would', 'should']
      
      return importantProductTerms.includes(word.toLowerCase()) || 
             (word.length > 3 && !genericWords.includes(word.toLowerCase()))
    })
    .slice(0, 6) // Keep up to 6 most relevant terms
    .join(' ')
    
  return keywordSearch
}

/**
 * Parse articles from MCP text response (matching web app implementation)
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
        url: `https://easyprintsg.freshdesk.com/support/solutions/articles/${id}`,
        source: 'freshdesk_kb'
      })
    }
  }
  
  console.log(`[PARSE-ARTICLES] Parsed ${articles.length} articles from MCP response`)
  return articles
}

/**
 * Generate system prompt for Discord bot
 */
function generateBotSystemPrompt() {
  return `You are EasyPrint's Discord support assistant with access to comprehensive knowledge base articles. Provide helpful, accurate answers based on the knowledge base content.

DISCORD-SPECIFIC INSTRUCTIONS:
- Keep responses concise but informative (Discord has message length limits)
- Use clear formatting with bullet points when needed
- Always cite article IDs when referencing information: [Article #ID]
- Be friendly and conversational for Discord's informal environment
- If information is too long, offer to provide more details in follow-up messages

RESPONSE STRATEGY:
- Start with the direct answer
- Provide key details from articles
- Include relevant specifications when available
- End with helpful next steps if applicable

Remember: You're helping EasyPrint customers in Discord. Be helpful, accurate, and cite your sources!`
}

/**
 * POST /chat
 * Discord bot chat endpoint - similar to main chat but without user auth
 */
router.post('/chat', validateBotAuth, async (req, res) => {
  try {
    const { message, sessionId, discordUserId, discordChannelId } = req.body

    // Validate message
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Message is required and cannot be empty',
        code: 'MISSING_MESSAGE'
      })
    }

    // Validate Discord context
    if (!discordUserId) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Discord user ID is required',
        code: 'MISSING_DISCORD_USER_ID'
      })
    }

    const cleanMessage = message.trim()
    const extractedTerms = extractSearchTerms(cleanMessage)
    const keywordSearch = createKeywordSearch(extractedTerms)

    console.log('[DISCORD-BOT] Processing request:', {
      discordUserId,
      discordChannelId,
      messageLength: cleanMessage.length,
      extractedTerms,
      keywordSearch,
      sessionId,
      timestamp: new Date().toISOString()
    })

    let knowledgebaseResults = []
    let searchError = null

    // Search knowledge base via MCP - ENHANCED TO MATCH WEB APP
    try {
      console.log('[DISCORD-BOT] Searching knowledge base with keyword terms:', keywordSearch)
      
      // Primary search with keyword terms and proper parameters (matching web app)
      const searchResult = await mcpClient.searchKnowledgeBase(keywordSearch, null, 1, 15)
      
      console.log('[DISCORD-BOT] Raw MCP search result:', {
        hasResult: !!searchResult,
        resultType: typeof searchResult,
        success: searchResult && searchResult.success,
        totalResults: searchResult && searchResult.total_results,
        hasArticles: !!(searchResult && searchResult.articles),
        hasArticleContent: !!(searchResult && searchResult.articles && searchResult.articles.content),
        resultKeys: searchResult ? Object.keys(searchResult) : []
      })
      
      // Parse the MCP response - it returns text content that needs to be parsed
      let searchResults = []
      if (searchResult && searchResult.success && searchResult.articles && searchResult.articles.content) {
        const articles = searchResult.articles.content
        if (articles.length > 0 && articles[0].type === 'text' && articles[0].text) {
          const searchSummary = articles[0].text
          console.log(`[DISCORD-BOT] Got search summary (${searchResult.total_results} total articles found)`)
          
          // Parse articles from the formatted text response (matching web app)
          searchResults = parseArticlesFromText(searchSummary)
          console.log(`[DISCORD-BOT] Found ${searchResults.length} relevant articles with keyword search`)
          
          // FALLBACK SEARCH - If keyword search didn't return good results, try with the full extracted terms
          if (searchResults.length < 3) {
            console.log(`[DISCORD-BOT] Trying fallback search with extracted terms: "${extractedTerms}"`)
            try {
              const fallbackResult = await mcpClient.searchKnowledgeBase(extractedTerms, null, 1, 15)
              const fallbackResponseText = fallbackResult.articles?.content?.[0]?.text || ''
              const fallbackResults = parseArticlesFromText(fallbackResponseText)
              
              if (fallbackResults.length > searchResults.length) {
                console.log(`[DISCORD-BOT] Fallback search found ${fallbackResults.length} articles - using fallback results`)
                searchResults = fallbackResults
              }
            } catch (fallbackError) {
              console.warn(`[DISCORD-BOT] Fallback search failed:`, fallbackError.message)
            }
          }
          
          console.log(`[DISCORD-BOT] Final article count: ${searchResults.length}`)
          
          // Fetch full content for the most relevant articles (INCREASE TO 5 to match web app)
          const topArticles = searchResults.slice(0, 5)
          console.log(`[DISCORD-BOT] Fetching full content for top ${topArticles.length} articles: ${topArticles.map(a => a.id).join(', ')}`)
          
          for (const article of topArticles) {
            try {
              console.log(`[DISCORD-BOT] Fetching full content for Article #${article.id}`)
              const articleResult = await mcpClient.getArticle(article.id)
              
              if (articleResult && articleResult.success && articleResult.article) {
                const fullArticle = articleResult.article
                
                // Handle different article response formats
                let articleContent = article.content // fallback to original
                let articleTitle = article.title || `Article #${article.id}`
                
                if (fullArticle.content && Array.isArray(fullArticle.content)) {
                  // Content is in array format [{type: "text", text: "..."}]
                  const textContent = fullArticle.content
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
                    articleContent = textContent
                      .replace(/<[^>]*>/g, '') // Remove HTML tags
                      .replace(/&quot;/g, '"') // Decode HTML entities
                      .replace(/&amp;/g, '&')
                      .replace(/&lt;/g, '<')
                      .replace(/&gt;/g, '>')
                      .replace(/\n\s*\n/g, '\n\n') // Clean up multiple newlines
                      .trim()
                      
                    // Add image reference information if images exist
                    if (imageUrls.length > 0) {
                      articleContent += '\n\n**Referenced Images in this article:**\n'
                      imageUrls.forEach((url, index) => {
                        articleContent += `${index + 1}. ${url}\n`
                      })
                      articleContent += '\n(Note: These images contain important visual information referenced in the article content)'
                    }
                  }
                } else if (typeof fullArticle.content === 'string') {
                  articleContent = fullArticle.content
                }
                
                if (fullArticle.title) {
                  articleTitle = fullArticle.title
                }
                
                console.log(`[DISCORD-BOT] Extracted content length for #${article.id}:`, articleContent.length)
                
                if (articleContent) {
                  knowledgebaseResults.push({
                    id: article.id,
                    title: articleTitle,
                    content: articleContent,
                    url: `https://easyprintsg.freshdesk.com/support/solutions/articles/${article.id}`,
                    full_content_available: true
                  })
                  console.log(`[DISCORD-BOT] ✅ Enhanced Article #${article.id} with full content: ${articleTitle}`)
                } else {
                  console.log(`[DISCORD-BOT] ❌ No content found for article ${article.id}`)
                }
              }
            } catch (articleError) {
              console.error(`[DISCORD-BOT] Failed to fetch article ${article.id}:`, articleError.message)
              // Continue with other articles - use original excerpt if full fetch fails
              knowledgebaseResults.push({
                id: article.id,
                title: article.title,
                content: article.content,
                url: `https://easyprintsg.freshdesk.com/support/solutions/articles/${article.id}`
              })
            }
          }
          
          // Add remaining articles without enhancement (if any)
          const remainingArticles = searchResults.slice(5).map(article => ({
            id: article.id,
            title: article.title,
            content: article.content,
            url: `https://easyprintsg.freshdesk.com/support/solutions/articles/${article.id}`
          }))
          knowledgebaseResults.push(...remainingArticles)
          
          // If we couldn't fetch any articles, fall back to search summary
          if (knowledgebaseResults.length === 0) {
            knowledgebaseResults = [{
              id: 'search-summary',
              title: `Search Results for "${keywordSearch}"`,
              content: searchSummary,
              url: `Freshdesk Knowledge Base Search`
            }]
            console.log('[DISCORD-BOT] Falling back to search summary (no articles fetched)')
          } else {
            console.log(`[DISCORD-BOT] Successfully fetched ${knowledgebaseResults.length} articles`)
          }
        } else {
          knowledgebaseResults = []
          console.log('[DISCORD-BOT] No formatted search summary found in MCP result')
        }
      } else {
        console.log('[DISCORD-BOT] No articles found in MCP search result - missing structure:', {
          hasSearchResult: !!searchResult,
          hasSuccess: searchResult && searchResult.success,
          hasArticles: searchResult && searchResult.articles,
          hasContent: searchResult && searchResult.articles && searchResult.articles.content,
          actualStructure: searchResult ? Object.keys(searchResult) : 'null'
        })
      }
      
      console.log('[DISCORD-BOT] MCP search completed successfully')
    } catch (error) {
      searchError = error.message
      knowledgebaseResults = [] // Ensure we have an empty array for Claude
      console.error('[DISCORD-BOT] Knowledge base search failed:', error.message, error.stack)
    }

    // Prepare system prompt for Claude
    const systemPrompt = generateBotSystemPrompt()

    // Get Claude response
    console.log('[DISCORD-BOT] Getting Claude response...')
    let claudeResponse
    try {
      claudeResponse = await askClaude(cleanMessage, knowledgebaseResults, systemPrompt)
      console.log('[DISCORD-BOT] Claude response received successfully')
    } catch (claudeError) {
      console.error('[DISCORD-BOT] Claude error:', claudeError.message)
      throw new Error(`Claude API error: ${claudeError.message}`)
    }

    // Log the interaction for analytics
    try {
      await supabase
        .from('chat_conversations')
        .insert({
          user_id: 'discord-bot',
          session_id: sessionId || `discord-${discordUserId}-${Date.now()}`,
          user_message: cleanMessage,
          ai_response: claudeResponse,
          articles_found: knowledgebaseResults.length,
          search_terms: extractedTerms,
          source: 'discord-bot',
          discord_user_id: discordUserId,
          discord_channel_id: discordChannelId,
          search_error: searchError
        })
    } catch (dbError) {
      console.error('[DISCORD-BOT] Failed to log conversation:', dbError.message)
      // Continue without logging - don't block the response
    }

    // Return response
    res.json({
      response: claudeResponse,
      sources: knowledgebaseResults.map(article => ({
        id: article.id,
        title: article.title,
        url: article.url
      })),
      searchTerms: extractedTerms,
      timestamp: new Date().toISOString(),
      articlesFound: knowledgebaseResults.length,
      sessionId: sessionId || `discord-${discordUserId}-${Date.now()}`
    })

    console.log('[DISCORD-BOT] Response sent successfully')

  } catch (error) {
    console.error('[DISCORD-BOT] Chat error:', {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    })

    res.status(500).json({
      error: 'Chat service error',
      message: 'Failed to process your request',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * POST /feedback
 * Discord bot feedback endpoint with enhanced integration
 */
router.post('/feedback', validateBotAuth, async (req, res) => {
  try {
    const { 
      sessionId, 
      discordUserId, 
      discordChannelId, 
      feedback, 
      messageId,
      question,
      answer,
      username,
      platform 
    } = req.body

    // Validate required fields
    if (!sessionId || !discordUserId || !feedback) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'sessionId, discordUserId, and feedback are required',
        code: 'MISSING_REQUIRED_FIELDS'
      })
    }

    if (!['positive', 'negative', 'neutral'].includes(feedback)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'feedback must be one of: positive, negative, neutral',
        code: 'INVALID_FEEDBACK_VALUE'
      })
    }

    console.log('[DISCORD-BOT] Processing enhanced feedback:', {
      sessionId,
      discordUserId,
      discordChannelId,
      feedback,
      messageId,
      username,
      hasQuestion: !!question,
      hasAnswer: !!answer,
      platform: platform || 'discord',
      timestamp: new Date().toISOString()
    })

    // Store comprehensive feedback in database
    try {
      // Map feedback values to feedback_submissions enum
      const feedbackTypeMapping = {
        'positive': 'correct',
        'negative': 'incorrect', 
        'neutral': 'needs_improvement'
      }

      const feedbackRecord = {
        user_session_id: sessionId,
        feedback_type: feedbackTypeMapping[feedback],
        platform: platform || 'discord',
        discord_user_id: discordUserId,
        discord_channel_id: discordChannelId,
        message_id: messageId,
        question: question ? question.substring(0, 2000) : 'Discord feedback',
        ai_response: answer ? answer.substring(0, 4000) : 'No response recorded',
        username: username
      }

      console.log('[DISCORD-BOT] Attempting to insert feedback record:', feedbackRecord)
      
      const { data, error } = await supabase
        .from('feedback_submissions')
        .insert(feedbackRecord)
        .select()
        .single()

      console.log('[DISCORD-BOT] Supabase response:', { data, error })

      if (error) {
        console.error('[DISCORD-BOT] Database error details:', error)
        throw error
      }

      console.log('[DISCORD-BOT] Enhanced feedback stored successfully:', {
        id: data.id,
        feedbackType: data.feedback_type,
        platform: data.platform,
        hasQuestion: !!data.question,
        hasAnswer: !!data.answer,
        hasUsername: !!data.username
      })

    } catch (dbError) {
      console.error('[DISCORD-BOT] Failed to store enhanced feedback:', {
        error: dbError.message,
        code: dbError.code,
        details: dbError.details,
        hint: dbError.hint
      })
      
      // Try fallback storage with minimal fields
      try {
        const feedbackTypeMapping = {
          'positive': 'correct',
          'negative': 'incorrect', 
          'neutral': 'needs_improvement'
        }

        const fallbackRecord = {
          user_session_id: sessionId,
          feedback_type: feedbackTypeMapping[feedback],
          platform: platform || 'discord',
          discord_user_id: discordUserId,
          discord_channel_id: discordChannelId,
          message_id: messageId,
          question: 'Discord feedback',
          ai_response: 'No response recorded'
        }

        const { data: fallbackData, error: fallbackError } = await supabase
          .from('feedback_submissions')
          .insert(fallbackRecord)
          .select()
          .single()
        
        if (fallbackError) {
          throw fallbackError
        }
        
        console.log('[DISCORD-BOT] Fallback feedback storage successful:', fallbackData.id)
      } catch (fallbackError) {
        console.error('[DISCORD-BOT] Fallback feedback storage failed:', {
          error: fallbackError.message,
          code: fallbackError.code,
          details: fallbackError.details
        })
        throw new Error('Failed to store feedback in database')
      }
    }

    res.json({
      success: true,
      message: 'Feedback received',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[DISCORD-BOT] Enhanced feedback error:', {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    })

    res.status(500).json({
      error: 'Feedback service error',
      message: 'Failed to process enhanced feedback',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * POST /feedback/enhanced
 * Enhanced feedback endpoint with additional context
 */
router.post('/feedback/enhanced', validateBotAuth, async (req, res) => {
  try {
    const { feedback, question, answer, responseId, context } = req.body

    // Validate required fields
    if (!feedback || !context || !context.userId) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'feedback and context.userId are required',
        code: 'MISSING_REQUIRED_FIELDS'
      })
    }

    if (!['positive', 'negative', 'neutral'].includes(feedback)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'feedback must be one of: positive, negative, neutral',
        code: 'INVALID_FEEDBACK_VALUE'
      })
    }

    console.log('[DISCORD-BOT] Processing enhanced feedback via fallback endpoint:', {
      feedback,
      userId: context.userId,
      username: context.username,
      channelId: context.channelId,
      hasQuestion: !!question,
      hasAnswer: !!answer,
      timestamp: new Date().toISOString()
    })

    // Store in feedback_submissions table
    try {
      // Map feedback values to feedback_submissions enum
      const feedbackTypeMapping = {
        'positive': 'correct',
        'negative': 'incorrect', 
        'neutral': 'needs_improvement'
      }

      const { data, error } = await supabase
        .from('feedback_submissions')
        .insert({
          user_session_id: responseId || `enhanced_${Date.now()}`,
          feedback_type: feedbackTypeMapping[feedback],
          platform: context.platform || 'discord',
          discord_user_id: context.userId,
          discord_channel_id: context.channelId,
          message_id: context.messageId,
          question: question ? question.substring(0, 2000) : 'Discord feedback',
          ai_response: answer ? answer.substring(0, 4000) : 'No response recorded',
          username: context.username || null
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      console.log('[DISCORD-BOT] Enhanced feedback stored via fallback:', data.id)

      res.json({
        success: true,
        message: 'Enhanced feedback processed successfully',
        data: {
          id: data.id,
          feedbackType: data.feedback_type,
          platform: data.platform
        },
        timestamp: new Date().toISOString()
      })

    } catch (dbError) {
      console.error('[DISCORD-BOT] Enhanced feedback endpoint database error:', dbError)
      throw new Error('Failed to store enhanced feedback')
    }

  } catch (error) {
    console.error('[DISCORD-BOT] Enhanced feedback endpoint error:', error)
    res.status(500).json({
      error: 'Enhanced feedback service error',
      message: 'Failed to process enhanced feedback',
      code: 'ENHANCED_FEEDBACK_ERROR',
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * POST /user-mapping
 * Create or update Discord user mapping to internal system
 */
router.post('/user-mapping', validateBotAuth, async (req, res) => {
  try {
    const { discordUserId, discordUsername, email, internalUserId } = req.body

    if (!discordUserId || !discordUsername) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'discordUserId and discordUsername are required',
        code: 'MISSING_REQUIRED_FIELDS'
      })
    }

    console.log('[DISCORD-BOT] Creating/updating user mapping:', {
      discordUserId,
      discordUsername,
      hasEmail: !!email,
      hasInternalUserId: !!internalUserId
    })

    // Check if mapping already exists
    const { data: existingMapping } = await supabase
      .from('discord_user_mappings')
      .select('*')
      .eq('discord_user_id', discordUserId)
      .single()

    let result
    if (existingMapping) {
      // Update existing mapping
      const { data, error } = await supabase
        .from('discord_user_mappings')
        .update({
          discord_username: discordUsername,
          email: email || existingMapping.email,
          internal_user_id: internalUserId || existingMapping.internal_user_id,
          updated_at: new Date().toISOString()
        })
        .eq('discord_user_id', discordUserId)
        .select()
        .single()

      if (error) throw error
      result = data
      console.log('[DISCORD-BOT] Updated existing user mapping:', result.id)
    } else {
      // Create new mapping
      const { data, error } = await supabase
        .from('discord_user_mappings')
        .insert({
          discord_user_id: discordUserId,
          discord_username: discordUsername,
          email: email || null,
          internal_user_id: internalUserId || null
        })
        .select()
        .single()

      if (error) throw error
      result = data
      console.log('[DISCORD-BOT] Created new user mapping:', result.id)
    }

    res.json({
      success: true,
      message: existingMapping ? 'User mapping updated' : 'User mapping created',
      data: {
        id: result.id,
        discordUserId: result.discord_user_id,
        discordUsername: result.discord_username,
        hasEmail: !!result.email,
        hasInternalUserId: !!result.internal_user_id
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[DISCORD-BOT] User mapping error:', error)
    res.status(500).json({
      error: 'User mapping service error',
      message: 'Failed to process user mapping',
      code: 'USER_MAPPING_ERROR',
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * GET /health
 * Health check endpoint for Discord bot
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'discord-bot-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

export default router 