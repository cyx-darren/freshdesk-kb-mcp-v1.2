import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Ask Claude to answer a question based on Freshdesk knowledge base articles
 * @param {string} userMessage - The user's question
 * @param {Array} searchResults - Array of article objects from Freshdesk search
 * @returns {Promise<string>} Claude's response
 */
async function askClaude(userMessage, searchResults) {
  try {
    // Validate inputs
    if (!userMessage || typeof userMessage !== 'string') {
      throw new Error('User message is required and must be a string');
    }

    if (!searchResults || !Array.isArray(searchResults)) {
      throw new Error('Search results must be provided as an array');
    }

    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not configured');
    }

    // Format search results as context
    const articlesContext = searchResults.map((article, index) => {
      return `[Article #${article.id || index + 1}]
Title: ${article.title || 'Untitled'}
Content: ${article.content || article.description || 'No content available'}
${article.url ? `URL: ${article.url}` : ''}
---`;
    }).join('\n\n');

    // System prompt
    const systemPrompt = `You are a helpful assistant for EasyPrint's team. Answer questions based on the Freshdesk knowledge base articles provided. 
Always cite the article ID when using information from an article using this format: [Article #ID].
If the information isn't in the provided articles, say so clearly.
Be professional, concise, and helpful.`;

    // User message with context
    const userPrompt = `Based on the following Freshdesk knowledge base articles, please answer this question: "${userMessage}"

Knowledge Base Articles:
${articlesContext}

Please provide a helpful answer based on the information above. Remember to cite article IDs when referencing specific information.`;

    console.log('[CLAUDE] Processing request with', searchResults.length, 'articles');
    
    // Make request to Claude
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    });

    // Extract text content from response
    const answer = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n')
      .trim();

    if (!answer) {
      throw new Error('No text content received from Claude');
    }

    console.log('[CLAUDE] Generated response successfully');
    return answer;

  } catch (error) {
    console.error('[CLAUDE] Error generating response:', error);
    
    // Handle specific error types
    if (error.status === 401) {
      throw new Error('Invalid Anthropic API key. Please check your configuration.');
    } else if (error.status === 429) {
      throw new Error('Claude API rate limit exceeded. Please try again later.');
    } else if (error.status === 400) {
      throw new Error('Invalid request to Claude API. Please check your input.');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new Error('Unable to connect to Claude API. Please check your internet connection.');
    } else if (error.message.includes('API key')) {
      throw new Error('Anthropic API key configuration issue: ' + error.message);
    }
    
    // Generic error for unexpected issues
    throw new Error('Failed to get response from Claude: ' + (error.message || 'Unknown error'));
  }
}

/**
 * Test Claude connection and configuration
 * @returns {Promise<boolean>} True if connection is successful
 */
async function testClaudeConnection() {
  try {
    console.log('[CLAUDE] Testing connection...');
    
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('[CLAUDE] ❌ ANTHROPIC_API_KEY not configured');
      return false;
    }

    // Simple test message
    const testResponse = await askClaude(
      'Hello, can you confirm you can help with EasyPrint questions?',
      [{
        id: 'test-1',
        title: 'Test Article',
        content: 'This is a test article for connection verification.'
      }]
    );

    if (testResponse && testResponse.length > 0) {
      console.log('[CLAUDE] ✅ Connection test successful');
      return true;
    } else {
      console.log('[CLAUDE] ❌ Connection test failed - no response');
      return false;
    }

  } catch (error) {
    console.log('[CLAUDE] ❌ Connection test failed:', error.message);
    return false;
  }
}

export {
  askClaude,
  testClaudeConnection
}; 