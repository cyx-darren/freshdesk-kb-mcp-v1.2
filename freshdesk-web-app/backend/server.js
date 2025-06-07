import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

// Import routes
import authRoutes from './routes/auth.js'
import articleRoutes from './routes/articles.js'
import analyticsRoutes from './routes/analytics.js'

// Import middleware
import { requireAuth, optionalAuth } from './middleware/auth.js'

// Import services
import { initializeSupabase, getHealthStatus } from './config/supabase.js'
import mcpClient from './services/mcp-client.js'
import cacheService from './services/cache.js'
import analyticsService from './services/analytics.js'

// Load environment variables
dotenv.config()

// Create Express app
const app = express()

// Get configuration from environment variables
const PORT = process.env.PORT || 3001
const NODE_ENV = process.env.NODE_ENV || 'development'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173' // Vite default port

// Middleware
// Enable CORS for frontend
app.use(cors({
  origin: [
    FRONTEND_URL,
    'http://localhost:3000', // Create React App default
    'http://localhost:5173', // Vite default
    'http://localhost:4173'  // Vite preview
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }))

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Add request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${req.method} ${req.path}`)
  next()
})

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Get Supabase health status
    const supabaseHealth = getHealthStatus()
    
    // Get MCP client health status
    const mcpHealth = mcpClient.getHealthStatus()
    
    const healthCheck = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: NODE_ENV,
      version: '1.0.0',
      services: {
        server: 'running',
        database: {
          status: supabaseHealth.configured ? 'configured' : 'not_configured',
          url: supabaseHealth.url,
          timestamp: supabaseHealth.timestamp
        },
        mcp: {
          status: mcpHealth.configured ? 'configured' : 'not_configured',
          path: mcpHealth.mcpServerPath,
          timestamp: mcpHealth.timestamp
        }
      }
    }
    
    res.status(200).json(healthCheck)
  } catch (error) {
    console.error('Health check error:', error)
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: NODE_ENV,
      version: '1.0.0',
      services: {
        server: 'running',
        database: 'unknown',
        mcp: 'unknown'
      },
      warning: 'Some services could not be checked'
    })
  }
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/articles', articleRoutes)
app.use('/api/analytics', analyticsRoutes)

// API information endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Freshdesk Knowledge Base API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /health',
      api: 'GET /api',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        profile: 'GET /api/auth/profile (protected)'
      },
      articles: {
        search: 'GET /api/articles/search?query=... (protected)',
        getArticle: 'GET /api/articles/:id (protected)',
        categories: 'GET /api/articles/categories (protected)',
        searchHistory: 'GET /api/articles/search/history (protected)',
        cacheStatus: 'GET /api/articles/cache/status (protected)',
        clearExpiredCache: 'DELETE /api/articles/cache/expired (protected)',
        invalidateArticle: 'DELETE /api/articles/cache/:articleId (protected)'
      },
      analytics: {
        history: 'GET /api/analytics/history (protected)',
        insights: 'GET /api/analytics/insights (protected)',
        popular: 'GET /api/analytics/popular (protected)',
        clearHistory: 'DELETE /api/analytics/history (protected)'
      }
    },
    documentation: {
      authentication: 'All protected routes require Authorization: Bearer <token> header',
      contentType: 'application/json'
    }
  })
})

// 404 handler for unknown routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The requested route ${req.method} ${req.originalUrl} does not exist`,
    code: 'ROUTE_NOT_FOUND',
    availableEndpoints: {
      public: [
        'GET /health',
        'GET /api',
        'POST /api/auth/register',
        'POST /api/auth/login'
      ],
      protected: [
        'GET /api/auth/profile',
        'PUT /api/auth/profile', 
        'POST /api/auth/logout',
        'GET /api/articles/search',
        'GET /api/articles/:id',
        'GET /api/articles/categories',
        'GET /api/articles/search/history',
        'GET /api/articles/cache/status',
        'GET /api/analytics/history',
        'GET /api/analytics/insights',
        'GET /api/analytics/popular'
      ]
    },
    hint: 'Check the API documentation at GET /api for available endpoints'
  })
})

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Error occurred:', {
    error: err.message,
    stack: NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  })

  // Don't leak error details in production
  const errorResponse = {
    error: 'Internal Server Error',
    message: NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  }

  if (NODE_ENV === 'development') {
    errorResponse.stack = err.stack
  }

  res.status(500).json(errorResponse)
})

// Start server
app.listen(PORT, async () => {
  console.log('\n🚀 Freshdesk Web App Backend Server Started!')
  console.log('=====================================')
  console.log(`📡 Server running on: http://localhost:${PORT}`)
  console.log(`🌍 Environment: ${NODE_ENV}`)
  console.log(`🔗 Frontend URL: ${FRONTEND_URL}`)
  console.log(`⏰ Started at: ${new Date().toISOString()}`)
  
  // Initialize services
  if (NODE_ENV === 'development') {
    try {
      await initializeSupabase()
    } catch (error) {
      console.warn('⚠️  Supabase initialization failed:', error.message)
    }
  }
  
  // Initialize cache service with scheduled cleanup (every 30 minutes)
  console.log('🗄️  Initializing cache service...')
  cacheService.scheduleCleanup(30)
  console.log('✅ Cache service initialized with automatic cleanup')
  
  // Initialize analytics service with scheduled cleanup (every 24 hours)
  console.log('📊 Initializing analytics service...')
  analyticsService.scheduleCleanup(24, 90) // Clean every 24 hours, keep 90 days
  console.log('✅ Analytics service initialized with automatic cleanup')
  console.log('\n📋 Available Endpoints:')
  console.log(`   • GET  /health          - Health check`)
  console.log(`   • GET  /api             - API information`)
  console.log(`   • POST /api/auth/register - User registration`)
  console.log(`   • POST /api/auth/login    - User login`)
  console.log(`   • POST /api/auth/logout   - User logout`)
  console.log(`   • GET  /api/auth/profile  - Get user profile (protected)`)
  console.log(`   • PUT  /api/auth/profile  - Update user profile (protected)`)
  console.log(`   • GET  /api/articles/search - Search knowledge base (protected)`)
  console.log(`   • GET  /api/articles/:id    - Get specific article (protected)`)
  console.log(`   • GET  /api/articles/categories - List categories (protected)`)
  console.log('\n💡 Ready to accept requests!')
  
  if (NODE_ENV === 'development') {
    console.log('\n🔧 Development Mode:')
    console.log('   • Detailed error messages enabled')
    console.log('   • Request logging enabled')
    console.log('   • CORS enabled for local frontend')
  }
  console.log('=====================================\n')
})

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received. Shutting down gracefully...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received. Shutting down gracefully...')
  process.exit(0)
})

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err)
  process.exit(1)
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
}) 