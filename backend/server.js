import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

// Import routes
import authRoutes from './routes/auth.js'
import articleRoutes from './routes/articles.js'
import analyticsRoutes from './routes/analytics.js'
import chatRoutes from './routes/chat.js'
import bugRoutes from './routes/bugs.js'
import featureRoutes from './routes/features.js'

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
const PORT = process.env.PORT || 3333
const NODE_ENV = process.env.NODE_ENV || 'development'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

// Production logging setup
if (NODE_ENV === 'production') {
  console.log('🏭 Production Mode Initialized')
  console.log(`📡 Server Port: ${PORT}`)
  console.log(`🔗 Frontend URL: ${FRONTEND_URL}`)
}

// Middleware
// Enable CORS for frontend
const allowedOrigins = []

// Add production frontend URL first
if (FRONTEND_URL) {
  allowedOrigins.push(FRONTEND_URL)
  
  // Add HTTPS version if not already HTTPS
  if (FRONTEND_URL.startsWith('http://')) {
    allowedOrigins.push(FRONTEND_URL.replace('http://', 'https://'))
  }
  // Add HTTP version if HTTPS (for local development)
  if (FRONTEND_URL.startsWith('https://')) {
    allowedOrigins.push(FRONTEND_URL.replace('https://', 'http://'))
  }
}

// Add development origins only in development mode
if (NODE_ENV === 'development') {
  allowedOrigins.push(
  'http://localhost:3000', // Vite frontend
  'http://localhost:3001', // Alternative port
  'http://localhost:5173', // Vite default
  'http://localhost:4173'  // Vite preview
  )
}

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      if (NODE_ENV === 'production') {
        console.error(`🚫 CORS blocked origin: ${origin}`)
        console.error(`🔗 Allowed origins: ${allowedOrigins.join(', ')}`)
    } else {
      console.warn(`CORS blocked origin: ${origin}`)
      }
      callback(new Error('Not allowed by CORS policy'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization']
}))

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }))

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Serve static uploads
app.use('/uploads', express.static('uploads'))

// Add request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString()
  if (NODE_ENV === 'production') {
    // Production logging - less verbose
    console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip || req.connection.remoteAddress}`)
  } else {
    // Development logging - more verbose
  console.log(`[${timestamp}] ${req.method} ${req.path}`)
  }
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
app.use('/api/chat', chatRoutes)
app.use('/api/bugs', bugRoutes)
app.use('/api/features', featureRoutes)

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
      },
      chat: {
        chat: 'POST /api/chat (protected)',
        sessions: 'GET /api/chat/sessions (protected)',
        createSession: 'POST /api/chat/sessions (protected)',
        updateSession: 'PUT /api/chat/sessions/:id (protected)',
        deleteSession: 'DELETE /api/chat/sessions/:id (protected)',
        sessionMessages: 'GET /api/chat/sessions/:id/messages (protected)',
        history: 'GET /api/chat/history (protected)',
        clearHistory: 'DELETE /api/chat/history (protected)'
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
        'GET /api/analytics/popular',
        'POST /api/chat',
        'GET /api/chat/sessions',
        'POST /api/chat/sessions',
        'PUT /api/chat/sessions/:id',
        'DELETE /api/chat/sessions/:id',
        'GET /api/chat/sessions/:id/messages',
        'GET /api/chat/history',
        'DELETE /api/chat/history'
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
  console.log(`   • POST /api/chat              - Chat with AI assistant (protected)`)
  console.log(`   • GET  /api/chat/sessions     - Get chat sessions (protected)`)
  console.log(`   • POST /api/chat/sessions     - Create chat session (protected)`)
  console.log(`   • PUT  /api/chat/sessions/:id - Update chat session (protected)`)
  console.log(`   • DEL  /api/chat/sessions/:id - Delete chat session (protected)`)
  console.log(`   • GET  /api/chat/sessions/:id/messages - Get session messages (protected)`)
  console.log(`   • GET  /api/chat/history      - Get chat history (protected)`)
  console.log(`   • DELETE /api/chat/history    - Clear chat history (protected)`)
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