const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
require('dotenv').config();
const chatService = require('./chatService');
const logger = require('./logger');

class FreshdeskKBBot {
    constructor(rateLimiter = null, healthMonitor = null) {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.DirectMessages
            ]
        });

        this.botStatus = {
            ready: false,
            messagesProcessed: 0,
            lastActivity: null,
            startTime: Date.now()
        };

        // Production services
        this.rateLimiter = rateLimiter;
        this.healthMonitor = healthMonitor;

        // Add message processing tracker to prevent duplicates
        this.processedMessages = new Set();
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Bot ready event
        this.client.once('ready', () => {
            this.botStatus.ready = true;
            this.botStatus.startTime = new Date();
            logger.info(`✅ Discord bot logged in as ${this.client.user.tag}!`);
            logger.info(`🔗 Bot is in ${this.client.guilds.cache.size} servers`);
            
            // Update health monitor
            if (this.healthMonitor) {
                this.healthMonitor.setDiscordStatus(true);
            }
            
            // Set bot status
            this.client.user.setActivity('Knowledge Base Questions', { type: 'LISTENING' });
        });

        // Handle new messages
        this.client.on('messageCreate', async (message) => {
            await this.handleMessage(message);
        });

        // Handle button interactions (for feedback)
        this.client.on('interactionCreate', async (interaction) => {
            if (interaction.isButton()) {
                await this.handleFeedbackInteraction(interaction);
            }
        });

        // Error handling
        this.client.on('error', (error) => {
            logger.error('Discord client error:', error);
        });

        this.client.on('warn', (warning) => {
            logger.warn('Discord client warning:', warning);
        });
    }

    async handleMessage(message) {
        try {
            // Ignore bot messages
            if (message.author.bot) return;

            // Check for duplicate message processing
            const messageKey = `${message.id}-${message.author.id}`;
            if (this.processedMessages.has(messageKey)) {
                logger.debug(`Skipping duplicate message processing for ${messageKey}`);
                return;
            }

            // Only respond to direct mentions, DMs, or /elsa commands
            const isMentioned = message.mentions.users.has(this.client.user.id);
            const isDM = message.channel.type === 'DM';
            const isElsaCommand = message.content.startsWith('/elsa');

            if (!isMentioned && !isDM && !isElsaCommand) {
                return;
            }

            // Check rate limits
            if (this.rateLimiter) {
                const rateLimitResult = await this.rateLimiter.checkLimit(message.author.id, 'message');
                if (!rateLimitResult.allowed) {
                    this.rateLimiter.logRateLimit(message.author.id, 'message', rateLimitResult.remaining);
                    
                    if (this.healthMonitor) {
                        this.healthMonitor.recordRateLimit();
                    }
                    
                    await this.sendRateLimitMessage(message, rateLimitResult);
                    return;
                }
            }

            // Mark this message as being processed
            this.processedMessages.add(messageKey);
            this.cleanupOldProcessedMessages();

            // Show typing indicator while processing
            await this.showTypingIndicator(message.channel);

            // Extract question from different input types
            let question;
            if (isElsaCommand) {
                // Remove '/elsa' command and get the question
                question = message.content.replace('/elsa', '').trim();
            } else {
                // Remove mention and get the question
                question = message.content.replace(`<@${this.client.user.id}>`, '').trim();
            }
            
            // Handle help requests
            if (['help', 'commands', '?'].includes(question.toLowerCase())) {
                await this.sendHelpMessage(message);
                return;
            }

            // Handle empty questions
            if (!question || question.length < 3) {
                await this.sendHelpMessage(message);
                return;
            }

            // Show processing embed for long operations
            const processingEmbed = await this.sendProcessingMessage(message, question);

            this.botStatus.messagesProcessed++;
            this.botStatus.lastActivity = new Date().toISOString();
            
            // Record metrics
            if (this.healthMonitor) {
                this.healthMonitor.recordMessage();
                if (isElsaCommand) {
                    this.healthMonitor.recordCommand();
                }
            }

            // Get chat response with timing
            const startTime = Date.now();
            const response = await chatService.getChatResponse(question, {
                userId: message.author.id,
                username: message.author.username,
                channelId: message.channel.id,
                guildId: message.guild?.id
            });
            const responseTime = Date.now() - startTime;
            
            // Record response time
            if (this.healthMonitor) {
                this.healthMonitor.recordResponseTime(responseTime);
            }

            // Update processing message to show completion
            if (processingEmbed) {
                await this.updateProcessingMessage(processingEmbed, 'Formatting response...');
            }

            // Send formatted response with enhanced embeds
            await this.sendEnhancedResponseWithFeedback(message, response, question, processingEmbed);

        } catch (error) {
            logger.error('Error handling message:', error);
            
            // Record error metrics
            if (this.healthMonitor) {
                this.healthMonitor.recordError();
            }
            
            // Only send error message if this is the first error for this message
            const errorKey = `${message.id}-${message.author.id}-error`;
            if (!this.processedMessages.has(errorKey)) {
                this.processedMessages.add(errorKey);
                await this.sendFormattedErrorMessage(message, error);
            }
        }
    }

    async sendResponseWithFeedback(message, response, originalQuestion) {
        // This method is deprecated - use sendEnhancedResponseWithFeedback instead
        return this.sendEnhancedResponseWithFeedback(message, response, originalQuestion);
    }

    async showTypingIndicator(channel) {
        try {
            await channel.sendTyping();
            // Keep typing indicator active for longer operations
            this.typingInterval = setInterval(async () => {
                try {
                    await channel.sendTyping();
                } catch (error) {
                    clearInterval(this.typingInterval);
                }
            }, 8000); // Discord typing indicator lasts ~10 seconds
        } catch (error) {
            logger.warn('Failed to show typing indicator:', error);
        }
    }

    clearTypingIndicator() {
        if (this.typingInterval) {
            clearInterval(this.typingInterval);
            this.typingInterval = null;
        }
    }

    cleanupOldProcessedMessages() {
        // Keep only last 100 processed messages to prevent memory leaks
        if (this.processedMessages.size > 100) {
            const messagesToDelete = Array.from(this.processedMessages).slice(0, this.processedMessages.size - 100);
            messagesToDelete.forEach(msg => this.processedMessages.delete(msg));
        }
    }

    async sendProcessingMessage(message, question) {
        try {
            const processingEmbed = new EmbedBuilder()
                .setColor(0xFFE135)
                .setTitle('🔍 Processing Your Question')
                .setDescription(`**Question:** ${this.truncateText(question, 200)}\n\n⏳ Searching knowledge base...`)
                .setFooter({ text: 'This usually takes a few seconds' })
                .setTimestamp();

            const processingMessage = await message.reply({
                embeds: [processingEmbed]
            });

            return processingMessage;
        } catch (error) {
            logger.warn('Failed to send processing message:', error);
            return null;
        }
    }

    async updateProcessingMessage(processingMessage, status) {
        try {
            if (!processingMessage) return;

            const updatedEmbed = EmbedBuilder.from(processingMessage.embeds[0])
                .setDescription(processingMessage.embeds[0].description.split('\n\n')[0] + `\n\n⚙️ ${status}`);

            await processingMessage.edit({ embeds: [updatedEmbed] });
        } catch (error) {
            logger.warn('Failed to update processing message:', error);
        }
    }

    async sendEnhancedResponseWithFeedback(message, response, originalQuestion, processingMessage = null) {
        try {
            this.clearTypingIndicator();

            // Validate response
            if (!response || (!response.answer && !response.response)) {
                logger.warn(`Invalid response received for message ${message.id}`);
                throw new Error('Invalid response from chat service');
            }

            const responseText = response.answer || response.response || 'I apologize, but I couldn\'t find a specific answer to your question.';
            
            // Handle long responses by splitting if necessary
            const embeds = this.createResponseEmbeds(responseText, response.sources, originalQuestion);
            
            // Create feedback buttons
            const feedbackRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`feedback_positive_${message.id}`)
                        .setLabel('✅')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`feedback_negative_${message.id}`)
                        .setLabel('❌')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`feedback_neutral_${message.id}`)
                        .setLabel('😐')
                        .setStyle(ButtonStyle.Secondary)
                );

            // If we have a processing message, edit it with the response
            let botMessage;
            if (processingMessage) {
                botMessage = await processingMessage.edit({
                    embeds: embeds,
                    components: [feedbackRow]
                });
            } else {
                botMessage = await message.reply({
                    embeds: embeds,
                    components: [feedbackRow]
                });
            }

            // Store response data for feedback handling
            this.storeResponseForFeedback(message.id, {
                question: originalQuestion,
                answer: responseText,
                sources: response.sources,
                responseId: response.responseId,
                userId: message.author.id,
                username: message.author.username,
                botMessageId: botMessage.id
            });

            // Create/update user mapping for enhanced tracking (async, don't block response)
            this.createUserMappingAsync(message.author);

            logger.info(`Successfully sent enhanced response to ${message.author.tag} for question: "${this.truncateText(originalQuestion, 100)}"`);

        } catch (error) {
            this.clearTypingIndicator();
            logger.error('Error sending enhanced response with feedback:', error);
            
            // Only send fallback error message if this is the first error for this message
            const errorKey = `${message.id}-${message.author.id}-send-error`;
            if (!this.processedMessages.has(errorKey)) {
                this.processedMessages.add(errorKey);
                await this.sendFormattedErrorMessage(message, error, processingMessage);
            }
            
            throw error; // Re-throw to be caught by handleMessage
        }
    }

    createResponseEmbeds(responseText, sources = [], originalQuestion = '') {
        const embeds = [];
        const maxEmbedLength = 4000; // Discord embed description limit
        const maxTotalEmbeds = 3; // Discord allows up to 10 embeds per message
        
        // Format the response text with markdown
        const formattedText = this.formatTextForDiscord(responseText);
        
        // Split response if it's too long
        const chunks = this.splitTextIntoChunks(formattedText, maxEmbedLength);
        
        chunks.slice(0, maxTotalEmbeds).forEach((chunk, index) => {
            const embed = new EmbedBuilder()
                .setColor(0x57F287) // Green for success
                .setTimestamp();

            if (index === 0) {
                // First embed gets the main title and question
                embed.setTitle('✅ Knowledge Base Response')
                    .setDescription(chunk)
                    .setFooter({ 
                        text: `Question: ${this.truncateText(originalQuestion, 100)}`,
                        iconURL: this.client.user.displayAvatarURL()
                    });
            } else {
                // Continuation embeds
                embed.setTitle(`📄 Response (continued ${index + 1}/${chunks.length})`)
                    .setDescription(chunk);
            }

            embeds.push(embed);
        });

        // Add sources embed if available and we have room
        if (sources && sources.length > 0 && embeds.length < maxTotalEmbeds) {
            const sourcesEmbed = this.createSourcesEmbed(sources);
            if (sourcesEmbed) {
                embeds.push(sourcesEmbed);
            }
        }

        return embeds;
    }

    createSourcesEmbed(sources) {
        try {
            const sourcesEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('📚 Knowledge Base Sources')
                .setTimestamp();

            // Group sources by article ID if available
            const formattedSources = sources
                .slice(0, 8) // Limit to 8 sources to avoid embed limits
                .map((source, index) => {
                    const title = source.title || source.name || `Article ${index + 1}`;
                    const articleId = this.extractArticleId(source.url || source.id || '');
                    const url = source.url || '#';
                    
                    // Create formatted source with article ID if available
                    if (articleId) {
                        return `**${index + 1}.** [${title}](${url})\n   📖 Article #${articleId}`;
                    } else {
                        return `**${index + 1}.** [${title}](${url})`;
                    }
                })
                .join('\n\n');

            if (formattedSources.length > 0) {
                sourcesEmbed.setDescription(formattedSources);
                sourcesEmbed.setFooter({ text: 'Click article links for more detailed information' });
                return sourcesEmbed;
            }

            return null;
        } catch (error) {
            logger.warn('Error creating sources embed:', error);
            return null;
        }
    }

    extractArticleId(text) {
        // Extract article ID from various formats
        const patterns = [
            /(?:article[#\s]*|id[:\s]*)?(\d{12,})/i,
            /#(\d{12,})/,
            /151000\d{6}/
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return match[1] || match[0];
            }
        }
        return null;
    }

    formatTextForDiscord(text) {
        if (!text) return '';

        // Convert common markdown and formatting for Discord
        let formatted = text
            // Convert **bold** to Discord bold
            .replace(/\*\*(.*?)\*\*/g, '**$1**')
            // Convert *italic* to Discord italic  
            .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '*$1*')
            // Convert `code` to Discord code
            .replace(/`([^`]+)`/g, '`$1`')
            // Convert code blocks
            .replace(/```(\w+)?\n([\s\S]*?)```/g, '```$1\n$2```')
            // Convert numbered lists to Discord format
            .replace(/^\d+\.\s+(.+)$/gm, '• $1')
            // Convert bullet points
            .replace(/^[-•]\s+(.+)$/gm, '• $1')
            // Convert headers to bold
            .replace(/^#{1,3}\s+(.+)$/gm, '**$1**')
            // Add spacing after headers
            .replace(/(\*\*.*\*\*)\n(?!\n)/g, '$1\n')
            // Clean up multiple newlines
            .replace(/\n{3,}/g, '\n\n');

        // Add Discord-specific formatting for technical content
        formatted = this.enhanceDiscordFormatting(formatted);

        return formatted;
    }

    enhanceDiscordFormatting(text) {
        // Enhance formatting for Discord-specific improvements
        return text
            // Highlight important terms
            .replace(/\b(MOQ|minimum order quantity)\b/gi, '**$1**')
            .replace(/\b(pricing|price|cost)\b/gi, '**$1**')
            .replace(/\$(\d+(?:\.\d{2})?)/g, '**$$$1**')
            // Format article references
            .replace(/Article #?(\d+)/gi, '📄 **Article #$1**')
            // Format step numbers
            .replace(/^(\d+)\.\s+/gm, '**$1.** ')
            // Format warnings and notes
            .replace(/\b(note|important|warning|attention):/gi, '⚠️ **$1:**')
            .replace(/\b(tip|hint|suggestion):/gi, '💡 **$1:**');
    }

    splitTextIntoChunks(text, maxLength) {
        if (text.length <= maxLength) {
            return [text];
        }

        const chunks = [];
        let currentChunk = '';
        const lines = text.split('\n');

        for (const line of lines) {
            if ((currentChunk + line + '\n').length > maxLength) {
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                    currentChunk = line + '\n';
                } else {
                    // Single line is too long, force split
                    chunks.push(line.substring(0, maxLength - 3) + '...');
                }
            } else {
                currentChunk += line + '\n';
            }
        }

        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    async sendFormattedErrorMessage(message, error, processingMessage = null) {
        try {
            this.clearTypingIndicator();

            const errorEmbed = new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle('❌ Something Went Wrong')
                .setDescription(
                    `I encountered an issue while processing your question:\n\n` +
                    `**Error:** ${error.message || 'Unknown error'}\n\n` +
                    `**What you can try:**\n` +
                    `• 🔄 Try rephrasing your question\n` +
                    `• ⏱️ Wait a moment and try again\n` +
                    `• 🆘 Contact support if this persists`
                )
                .setFooter({ 
                    text: 'Error occurred at',
                    iconURL: this.client.user.displayAvatarURL()
                })
                .setTimestamp();

            if (processingMessage) {
                await processingMessage.edit({ embeds: [errorEmbed], components: [] });
            } else {
                await message.reply({ embeds: [errorEmbed] });
            }

        } catch (replyError) {
            logger.error('Failed to send formatted error message:', replyError);
            // Fallback to simple text message
            try {
                if (processingMessage) {
                    await processingMessage.edit({ content: '❌ I encountered an error while processing your question. Please try again later.', embeds: [], components: [] });
                } else {
                    await message.reply('❌ I encountered an error while processing your question. Please try again later.');
                }
            } catch (fallbackError) {
                logger.error('Failed to send fallback error message:', fallbackError);
            }
        }
    }

    async handleFeedbackInteraction(interaction) {
        try {
            const [action, sentiment, originalMessageId] = interaction.customId.split('_');
            
            if (action !== 'feedback') return;

            // Check rate limits for feedback
            if (this.rateLimiter) {
                const rateLimitResult = await this.rateLimiter.checkLimit(interaction.user.id, 'feedback');
                if (!rateLimitResult.allowed) {
                    this.rateLimiter.logRateLimit(interaction.user.id, 'feedback', rateLimitResult.remaining);
                    
                    if (this.healthMonitor) {
                        this.healthMonitor.recordRateLimit();
                    }
                    
                    await interaction.reply({ 
                        content: `🚫 You're submitting feedback too quickly! Please wait ${Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)} seconds.`, 
                        ephemeral: true 
                    });
                    return;
                }
            }

            // Get stored response data
            const responseData = this.getStoredResponseData(originalMessageId);
            if (!responseData) {
                await interaction.reply({ content: '❌ Feedback session expired. Please ask your question again.', ephemeral: true });
                return;
            }

            // Map Discord sentiment to backend format
            const feedbackMap = {
                'positive': 'helpful',
                'negative': 'not_helpful', 
                'neutral': 'neutral'
            };

            const feedback = feedbackMap[sentiment];
            
            // Submit feedback to backend
            await chatService.submitFeedback({
                responseId: responseData.responseId,
                feedback: feedback,
                question: responseData.question,
                answer: responseData.answer,
                userId: responseData.userId,
                username: responseData.username,
                platform: 'discord',
                channelId: interaction.channelId,
                messageId: originalMessageId
            });

            // Update the message to show feedback was received
            const thankYouEmbed = new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle('✅ Feedback Received')
                .setDescription(`Thank you for your feedback! Your ${sentiment} feedback helps improve our knowledge base.`)
                .setTimestamp();

            await interaction.update({
                embeds: [thankYouEmbed],
                components: [] // Remove buttons
            });

            // Clean up stored data
            this.removeStoredResponseData(originalMessageId);
            
            // Record feedback metrics
            if (this.healthMonitor) {
                this.healthMonitor.recordFeedback();
            }

            logger.info(`Feedback received: ${sentiment} for question "${responseData.question}" from ${responseData.username}`);

        } catch (error) {
            logger.error('Error handling feedback interaction:', error);
            
            // Record error metrics
            if (this.healthMonitor) {
                this.healthMonitor.recordError();
            }
            
            await interaction.reply({ content: '❌ Error submitting feedback. Please try again.', ephemeral: true });
        }
    }



    async sendHelpMessage(message) {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🤖 Freshdesk Knowledge Base Assistant')
            .setDescription(
                '**Welcome!** I can help you find answers from our comprehensive knowledge base with enhanced formatting and smart search capabilities.'
            )
            .addFields(
                { 
                    name: '💭 How to Ask Questions', 
                    value: '• **Slash Command:** `/elsa What is the MOQ for lanyards?`\n' +
                           '• **Mention me:** @FreshdeskKB-Bot What is the MOQ for lanyards?\n' +
                           '• **Direct Message:** Send me a DM with your question\n' +
                           '• **Help:** Type `help`, `commands`, or `?` for this message', 
                    inline: false 
                },
                { 
                    name: '📝 Example Questions', 
                    value: '• "What is the minimum order quantity for business cards?"\n' +
                           '• "How do I submit artwork for printing?"\n' +
                           '• "What are the turnaround times for rush orders?"\n' +
                           '• "What file formats do you accept?"', 
                    inline: false 
                },
                { 
                    name: '✨ Enhanced Features', 
                    value: '• 🔍 **Smart Search:** I search through our entire knowledge base\n' +
                           '• 📄 **Rich Formatting:** Responses with proper formatting and styling\n' +
                           '• 📚 **Source Citations:** Direct links to relevant articles\n' +
                           '• ⏳ **Live Updates:** See processing status in real-time\n' +
                           '• 👍 **Feedback System:** Rate responses to help improve our knowledge base', 
                    inline: false 
                },
                { 
                    name: '💬 How to Give Feedback', 
                    value: '• **Rate responses:** Click ✅ (helpful), ❌ (not helpful), or 😐 (neutral)\n' +
                           '• **Your feedback** helps improve our knowledge base responses\n' +
                           '• **Quick and easy** single-click rating system', 
                    inline: false 
                },
                { 
                    name: '💡 Pro Tips', 
                    value: '• **Be specific** with your questions for better results\n' +
                           '• **Use keywords** related to your printing needs\n' +
                           '• **Check source articles** for complete information\n' +
                           '• **Provide feedback** to help me learn and improve', 
                    inline: false 
                }
            )
            .setFooter({ 
                text: 'Powered by AI • Your feedback helps improve responses',
                iconURL: this.client.user.displayAvatarURL()
            })
            .setTimestamp();

        // Add a thumbnail or image if available
        if (this.client.user.displayAvatarURL()) {
            helpEmbed.setThumbnail(this.client.user.displayAvatarURL());
        }

        await message.reply({ embeds: [helpEmbed] });
    }

    async sendRateLimitMessage(message, rateLimitResult) {
        const resetTime = new Date(rateLimitResult.resetTime);
        const waitTime = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
        
        const rateLimitEmbed = new EmbedBuilder()
            .setColor(0xFF6B6B)
            .setTitle('🚫 Rate Limit Reached')
            .setDescription(`You're sending messages too quickly! Please slow down and try again in **${waitTime} seconds**.`)
            .addFields(
                { name: '⏰ Reset Time', value: `<t:${Math.floor(resetTime.getTime() / 1000)}:R>`, inline: true },
                { name: '📊 Remaining Requests', value: `${rateLimitResult.remaining}`, inline: true }
            )
            .setFooter({ text: 'Rate limits help ensure fair access for all users' })
            .setTimestamp();

        await message.reply({ embeds: [rateLimitEmbed] });
    }

    async sendErrorMessage(message) {
        const errorEmbed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('❌ Error')
            .setDescription('I encountered an error while processing your question. Please try again later.')
            .setFooter({ text: 'If this problem persists, please contact support.' })
            .setTimestamp();

        await message.reply({ embeds: [errorEmbed] });
    }

    // Simple in-memory storage for response data (in production, use Redis or database)
    storeResponseForFeedback(messageId, data) {
        if (!this.responseStorage) {
            this.responseStorage = new Map();
        }
        
        this.responseStorage.set(messageId, {
            ...data,
            timestamp: Date.now()
        });

        // Clean up old entries after 10 minutes
        setTimeout(() => {
            this.responseStorage.delete(messageId);
        }, 10 * 60 * 1000);
    }

    getStoredResponseData(messageId) {
        if (!this.responseStorage) return null;
        return this.responseStorage.get(messageId);
    }

    removeStoredResponseData(messageId) {
        if (this.responseStorage) {
            this.responseStorage.delete(messageId);
        }
    }

    // Create user mapping asynchronously (don't block main flow)
    async createUserMappingAsync(discordUser) {
        try {
            // Don't wait for this - just fire and forget for better user experience
            setImmediate(async () => {
                try {
                    await chatService.createUserMapping({
                        userId: discordUser.id,
                        username: discordUser.username,
                        // Could add email detection logic here if needed
                        email: null,
                        internalUserId: null
                    });
                } catch (mappingError) {
                    // Log but don't throw - this shouldn't affect the main bot functionality
                    logger.warn('User mapping creation failed (non-critical):', {
                        error: mappingError.message,
                        userId: discordUser.id,
                        username: discordUser.username
                    });
                }
            });
        } catch (error) {
            // Catch any immediate errors but don't throw
            logger.warn('User mapping async setup failed:', error.message);
        }
    }

    async start() {
        try {
            // Check if bot is already running
            if (this.botStatus.ready) {
                logger.warn('Discord bot is already running');
                return;
            }

            // Check for other bot instances (simple port check)
            const fs = require('fs');
            const path = require('path');
            const pidFile = path.join(__dirname, '.bot.pid');
            
            // Clean up old PID file if process is not running
            if (fs.existsSync(pidFile)) {
                const oldPid = fs.readFileSync(pidFile, 'utf8');
                try {
                    process.kill(oldPid, 0); // Check if process exists
                    logger.error(`Another Discord bot instance is already running (PID: ${oldPid})`);
                    process.exit(1);
                } catch (err) {
                    // Process doesn't exist, remove stale PID file
                    fs.unlinkSync(pidFile);
                    logger.info('Removed stale PID file');
                }
            }

            // Write current PID to file
            fs.writeFileSync(pidFile, process.pid.toString());
            
            // Clean up PID file on exit
            process.on('exit', () => {
                try {
                    if (fs.existsSync(pidFile)) {
                        fs.unlinkSync(pidFile);
                    }
                } catch (err) {
                    // Ignore errors during cleanup
                }
            });

            logger.info('🤖 Starting Discord bot...');
            logger.info(`📋 Bot PID: ${process.pid}`);
            logger.info(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`📡 Backend URL: ${process.env.BACKEND_URL || 'http://localhost:3333'}`);
            
            await this.client.login(process.env.DISCORD_BOT_TOKEN);
            
        } catch (error) {
            logger.error('Failed to start Discord bot:', error);
            process.exit(1);
        }
    }

    async stop() {
        try {
            logger.info('🛑 Stopping Discord bot...');
            this.client.destroy();
            this.botStatus.ready = false;
            
            // Update health monitor
            if (this.healthMonitor) {
                this.healthMonitor.setDiscordStatus(false);
            }
        } catch (error) {
            logger.error('Error stopping Discord bot:', error);
        }
    }

    getStatus() {
        return {
            ready: this.botStatus.ready,
            connected: this.client.ws.status === 0, // 0 = READY
            uptime: this.botStatus.ready ? Date.now() - this.botStatus.startTime : 0,
            messagesProcessed: this.botStatus.messagesProcessed,
            lastActivity: this.botStatus.lastActivity,
            processedMessagesCount: this.processedMessages.size,
            guilds: this.client.guilds.cache.size,
            users: this.client.users.cache.size
        };
    }
}

module.exports = FreshdeskKBBot; 