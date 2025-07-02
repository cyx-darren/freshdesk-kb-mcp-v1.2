#!/usr/bin/env node

/**
 * Discord Bot Entry Point
 * 
 * This file starts the Discord bot as a standalone service.
 * It can be run independently of the main backend server.
 */

const FreshdeskKBBot = require('./bot');
const logger = require('./logger');
const chatService = require('./chatService');
const RateLimiter = require('./rateLimiter');
const HealthMonitor = require('./healthMonitor');

// Handle environment variables
require('dotenv').config();

class DiscordBotService {
    constructor() {
        this.bot = null;
        this.isShuttingDown = false;
        this.rateLimiter = null;
        this.healthMonitor = null;
    }

    async start() {
        try {
            logger.info('🚀 Starting Discord Bot Service...');

            // Validate environment variables
            if (!process.env.DISCORD_BOT_TOKEN) {
                throw new Error('DISCORD_BOT_TOKEN environment variable is required');
            }

            // Initialize production services
            logger.info('🔧 Initializing production services...');
            
            // Initialize rate limiter
            this.rateLimiter = new RateLimiter();
            
            // Initialize health monitor
            this.healthMonitor = new HealthMonitor();
            
            // Test backend connection
            logger.info('🔗 Testing backend connection...');
            const connectionTest = await chatService.testConnection();
            
            if (!connectionTest.success) {
                logger.warn('⚠️ Backend connection test failed:', connectionTest.error);
                logger.warn('⚠️ Bot will start but may not function properly until backend is available');
                this.healthMonitor.setBackendStatus(false);
            } else {
                logger.info('✅ Backend connection successful');
                this.healthMonitor.setBackendStatus(true);
            }

            // Initialize and start the bot
            this.bot = new FreshdeskKBBot(this.rateLimiter, this.healthMonitor);
            
            // Set up graceful shutdown handlers
            this.setupGracefulShutdown();
            
            // Start the bot
            await this.bot.start();
            
            logger.info('✅ Discord Bot Service started successfully');
            
            // Log bot status periodically
            this.startStatusLogger();

        } catch (error) {
            logger.error('❌ Failed to start Discord Bot Service:', error);
            process.exit(1);
        }
    }

    async stop() {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;

        try {
            logger.info('🛑 Shutting down Discord Bot Service...');
            
            if (this.bot) {
                await this.bot.stop();
            }
            
            // Cleanup production services
            if (this.rateLimiter) {
                this.rateLimiter.destroy();
                logger.info('✅ Rate limiter cleaned up');
            }
            
            if (this.healthMonitor) {
                this.healthMonitor.destroy();
                logger.info('✅ Health monitor cleaned up');
            }
            
            logger.info('✅ Discord Bot Service stopped gracefully');
            process.exit(0);
        } catch (error) {
            logger.error('❌ Error during shutdown:', error);
            process.exit(1);
        }
    }

    setupGracefulShutdown() {
        // Handle SIGINT (Ctrl+C)
        process.on('SIGINT', () => {
            logger.info('📝 Received SIGINT signal');
            this.stop();
        });

        // Handle SIGTERM (Docker/PM2 shutdown)
        process.on('SIGTERM', () => {
            logger.info('📝 Received SIGTERM signal');
            this.stop();
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('💥 Uncaught Exception:', error);
            this.stop();
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
            this.stop();
        });
    }

    startStatusLogger() {
        // Log bot status every 5 minutes
        setInterval(() => {
            if (this.bot && this.healthMonitor) {
                const botStatus = this.bot.getStatus();
                const healthStatus = this.healthMonitor.getStatus();
                const metrics = this.healthMonitor.getMetrics();
                
                logger.info('📊 Bot Status:', {
                    healthy: healthStatus.healthy,
                    ready: botStatus.isReady,
                    uptime: this.formatUptime(healthStatus.uptime || botStatus.uptime),
                    messagesProcessed: metrics.messagesProcessed,
                    commandsExecuted: metrics.commandsExecuted,
                    feedbackSubmitted: metrics.feedbackSubmitted,
                    errorsEncountered: metrics.errorsEncountered,
                    rateLimitHits: metrics.rateLimitHits,
                    guilds: botStatus.guilds,
                    users: botStatus.users,
                    services: {
                        discord: healthStatus.discordConnected,
                        backend: healthStatus.backendConnected,
                        redis: healthStatus.redisConnected
                    }
                });
            }
        }, 5 * 60 * 1000); // 5 minutes
    }

    formatUptime(uptimeMs) {
        const seconds = Math.floor(uptimeMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }
}

// Legacy health check server removed - now using HealthMonitor service

// Main execution
async function main() {
    // Show startup banner
    console.log(`
╔══════════════════════════════════════════╗
║           Discord Bot Service            ║
║          Freshdesk KB Assistant          ║
╚══════════════════════════════════════════╝
    `);

    // Create and start the service
    const service = new DiscordBotService();
    await service.start();
}

// Start the service if this file is run directly
if (require.main === module) {
    main().catch((error) => {
        console.error('💥 Fatal error starting Discord Bot Service:', error);
        process.exit(1);
    });
}

module.exports = DiscordBotService; 