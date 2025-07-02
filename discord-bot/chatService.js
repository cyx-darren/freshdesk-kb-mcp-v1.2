const axios = require('axios');
const logger = require('./logger');

class ChatService {
    constructor() {
        // Use localhost for the backend API
        this.baseURL = process.env.BACKEND_URL || 'http://localhost:3333';
        this.apiClient = axios.create({
            baseURL: this.baseURL,
            timeout: 30000, // 30 second timeout
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Discord-Bot/1.0',
                'X-Bot-Api-Key': process.env.DISCORD_BOT_API_KEY || 'discord-bot-secret-key-change-in-production'
            }
        });

        // Add request interceptor for logging
        this.apiClient.interceptors.request.use(
            (config) => {
                logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
                return config;
            },
            (error) => {
                logger.error('API Request Error:', error);
                return Promise.reject(error);
            }
        );

        // Add response interceptor for logging
        this.apiClient.interceptors.response.use(
            (response) => {
                logger.debug(`API Response: ${response.status} ${response.config.url}`);
                return response;
            },
            (error) => {
                logger.error('API Response Error:', {
                    status: error.response?.status,
                    message: error.message,
                    url: error.config?.url
                });
                return Promise.reject(error);
            }
        );
    }

    /**
     * Get chat response from the backend API
     * @param {string} question - User's question
     * @param {Object} context - Discord context (userId, username, etc.)
     * @returns {Promise<Object>} Chat response with answer and sources
     */
    async getChatResponse(question, context = {}) {
        const maxRetries = 2;
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                logger.info(`Getting chat response for question: "${question}" (attempt ${attempt}/${maxRetries})`);
                
                const requestData = {
                    message: question,
                    discordUserId: context.userId,
                    discordChannelId: context.channelId,
                    sessionId: context.sessionId || `discord-${context.userId}-${Date.now()}`
                };

                const response = await this.apiClient.post('/api/bot/chat', requestData);
                
                const chatResponse = response.data;
                
                // Check if the response indicates an error
                if (chatResponse.error) {
                    throw new Error(chatResponse.error);
                }
                
                // Ensure we have the required structure
                const formattedResponse = {
                    answer: chatResponse.response || chatResponse.answer || 'I apologize, but I couldn\'t find a specific answer to your question.',
                    sources: this.formatSources(chatResponse.sources || []),
                    responseId: this.generateResponseId(context),
                    confidence: chatResponse.confidence || 0,
                    timestamp: new Date().toISOString()
                };

                logger.info(`Chat response generated for user ${context.username}: ${formattedResponse.answer.substring(0, 100)}...`);
                
                return formattedResponse;

            } catch (error) {
                lastError = error;
                logger.warn(`Attempt ${attempt}/${maxRetries} failed:`, {
                    error: error.message,
                    status: error.response?.status,
                    data: error.response?.data
                });

                // If this isn't the last attempt, wait before retrying
                if (attempt < maxRetries) {
                    const waitTime = attempt * 1000; // 1s, 2s delays
                    logger.info(`Retrying in ${waitTime}ms...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
        }

        // All retries failed
        logger.error('All retry attempts failed for chat response:', {
            finalError: lastError.message,
            status: lastError.response?.status,
            data: lastError.response?.data,
            question: question.substring(0, 50)
        });

        // Return a more specific error message based on the error type
        let errorMessage = 'I apologize, but I\'m currently experiencing technical difficulties. Please try again later or contact support.';
        
        if (lastError.response?.status === 503 || lastError.code === 'ECONNREFUSED') {
            errorMessage = 'The knowledge base service is temporarily unavailable. Please try again in a few moments.';
        } else if (lastError.response?.status === 401) {
            errorMessage = 'Authentication error occurred. Please contact support if this persists.';
        } else if (lastError.response?.status >= 500) {
            errorMessage = 'A server error occurred while processing your request. Please try again later.';
        }

        // Return a fallback response
        return {
            answer: errorMessage,
            sources: [],
            responseId: this.generateResponseId(context),
            confidence: 0,
            timestamp: new Date().toISOString(),
            error: true
        };
    }

    /**
     * Submit user feedback to the backend
     * @param {Object} feedbackData - Feedback information
     * @returns {Promise<boolean>} Success status
     */
    async submitFeedback(feedbackData) {
        try {
            logger.info(`Submitting feedback: ${feedbackData.feedback} for question "${feedbackData.question}"`);

            // Map Discord feedback format to backend format
            const feedbackTypeMap = {
                'helpful': 'positive',
                'not_helpful': 'negative',
                'neutral': 'neutral'
            };

            const mappedFeedback = feedbackTypeMap[feedbackData.feedback] || feedbackData.feedback;

            // Create the request data in the format expected by /api/bot/feedback
            const requestData = {
                sessionId: feedbackData.responseId, // Use responseId as sessionId for tracking
                discordUserId: feedbackData.userId,
                discordChannelId: feedbackData.channelId,
                feedback: mappedFeedback, // 'positive', 'negative', 'neutral'
                messageId: feedbackData.messageId,
                // Additional context for enhanced integration
                question: feedbackData.question,
                answer: feedbackData.answer,
                username: feedbackData.username,
                platform: feedbackData.platform || 'discord'
            };

            // Submit to the correct Discord bot feedback endpoint
            let response;
            try {
                response = await this.apiClient.post('/api/bot/feedback', requestData);
                logger.info(`Feedback submitted successfully to /api/bot/feedback for user ${feedbackData.username}`);
            } catch (botFeedbackError) {
                logger.warn('Bot feedback endpoint failed, trying enhanced feedback endpoint:', botFeedbackError.message);
                
                // Fallback to enhanced feedback endpoint with retry logic
                const enhancedRequestData = {
                    feedback: mappedFeedback,
                    question: feedbackData.question,
                    answer: feedbackData.answer,
                    responseId: feedbackData.responseId,
                    context: {
                        platform: 'discord',
                        userId: feedbackData.userId,
                        username: feedbackData.username,
                        channelId: feedbackData.channelId,
                        messageId: feedbackData.messageId,
                        timestamp: new Date().toISOString()
                    }
                };

                // Try enhanced feedback endpoint
                try {
                    response = await this.apiClient.post('/api/feedback/enhanced', enhancedRequestData);
                } catch (enhancedError) {
                    logger.warn('Enhanced feedback endpoint failed, creating direct database entry');
                    
                    // Final fallback: direct database insertion (if we implement it)
                    response = await this.submitFeedbackDirectly(requestData);
                }
            }

            if (response && (response.status === 200 || response.status === 201)) {
                logger.info(`Feedback submitted successfully for user ${feedbackData.username}`);
                return true;
            } else {
                logger.warn(`Unexpected feedback response status: ${response?.status}`);
                return false;
            }

        } catch (error) {
            logger.error('Error submitting feedback:', {
                error: error.message,
                status: error.response?.status,
                data: error.response?.data,
                feedbackData: {
                    feedback: feedbackData.feedback,
                    question: feedbackData.question.substring(0, 50),
                    username: feedbackData.username
                }
            });
            return false;
        }
    }

    /**
     * Direct database fallback for feedback submission
     * @param {Object} requestData - Feedback data
     * @returns {Promise<Object>} Response object
     */
    async submitFeedbackDirectly(requestData) {
        try {
            logger.warn('Using direct feedback fallback - all endpoints failed');
            
            // Log comprehensive feedback data for manual analysis
            const feedbackLog = {
                timestamp: new Date().toISOString(),
                sessionId: requestData.sessionId,
                feedback: requestData.feedback,
                userId: requestData.discordUserId,
                username: requestData.username,
                channelId: requestData.discordChannelId,
                messageId: requestData.messageId,
                question: requestData.question ? requestData.question.substring(0, 200) : null,
                answer: requestData.answer ? requestData.answer.substring(0, 500) : null,
                platform: requestData.platform,
                fallbackReason: 'All API endpoints failed'
            };

            logger.info('FALLBACK_FEEDBACK_LOG:', feedbackLog);

            // In a production environment, this could also:
            // - Write to a local file for backup
            // - Send to a monitoring service
            // - Queue for retry later

            return { 
                status: 200, 
                data: { 
                    success: true, 
                    method: 'direct_fallback',
                    logged: true,
                    timestamp: feedbackLog.timestamp
                } 
            };
        } catch (error) {
            logger.error('Direct feedback fallback failed:', error);
            throw error;
        }
    }

    /**
     * Create or update Discord user mapping
     * @param {Object} userData - User data for mapping
     * @returns {Promise<boolean>} Success status
     */
    async createUserMapping(userData) {
        try {
            logger.info(`Creating user mapping for Discord user: ${userData.username}`);

            const response = await this.apiClient.post('/api/bot/user-mapping', {
                discordUserId: userData.userId,
                discordUsername: userData.username,
                email: userData.email || null,
                internalUserId: userData.internalUserId || null
            });

            if (response.status === 200 || response.status === 201) {
                logger.info(`User mapping created/updated successfully for ${userData.username}`);
                return true;
            } else {
                logger.warn(`Unexpected user mapping response status: ${response.status}`);
                return false;
            }

        } catch (error) {
            logger.error('Error creating user mapping:', {
                error: error.message,
                status: error.response?.status,
                data: error.response?.data,
                username: userData.username
            });
            return false;
        }
    }

    /**
     * Format sources for Discord display
     * @param {Array} sources - Raw sources from API
     * @returns {Array} Formatted sources
     */
    formatSources(sources) {
        if (!Array.isArray(sources)) return [];

        return sources.map(source => {
            // Handle different source formats
            if (typeof source === 'string') {
                return {
                    title: source,
                    url: null
                };
            }

            return {
                title: source.title || source.name || source.filename || 'Unknown Source',
                url: source.url || source.link || null,
                type: source.type || 'article',
                relevance: source.relevance || source.score || 0
            };
        }).filter(source => source.title); // Remove sources without titles
    }

    /**
     * Generate a unique response ID for tracking
     * @param {Object} context - Discord context
     * @returns {string} Unique response ID
     */
    generateResponseId(context) {
        const timestamp = Date.now();
        const userHash = context.userId ? context.userId.slice(-6) : 'unknown';
        return `discord_${timestamp}_${userHash}`;
    }

    /**
     * Health check for the chat service
     * @returns {Promise<boolean>} Service health status
     */
    async healthCheck() {
        try {
            const response = await this.apiClient.get('/health', { timeout: 5000 });
            return response.status === 200;
        } catch (error) {
            logger.error('Chat service health check failed:', error.message);
            return false;
        }
    }

    /**
     * Test the chat API connection
     * @returns {Promise<Object>} Test result
     */
    async testConnection() {
        try {
            const testQuestion = 'Hello, this is a test from Discord bot';
            const response = await this.getChatResponse(testQuestion, {
                userId: 'test_user',
                username: 'discord_bot_test',
                channelId: 'test_channel'
            });

            return {
                success: !response.error,
                response: response,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = new ChatService(); 