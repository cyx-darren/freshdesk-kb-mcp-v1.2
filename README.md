# Freshdesk Knowledge Base MCP Integration

A comprehensive solution that integrates Freshdesk Knowledge Base with Model Context Protocol (MCP) and provides a modern web application with authentication, chat interface, and knowledge base search.

## 🚀 Live Deployments

- **Frontend**: [https://to-be-updated.vercel.app](https://to-be-updated.vercel.app) (Vercel)
- **Backend API**: [https://to-be-updated.railway.app](https://to-be-updated.railway.app) (Railway)
- **MCP Server**: Internal service on Railway

## 📁 Project Structure

```
freshdesk-kb-mcp-v1.2/
├── backend/                   # Express API Server
│   ├── server.js             # Main server file
│   ├── routes/               # API route handlers
│   ├── services/             # Business logic layer
│   ├── middleware/           # Express middleware
│   ├── config/               # Configuration files
│   ├── package.json          # Backend dependencies
│   └── env.production        # Production environment variables
├── frontend/                 # React Web Application
│   ├── src/                  # React source code
│   │   ├── pages/           # Page components (Login, Chat)
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # React contexts (Auth, Supabase)
│   │   └── services/        # API service layer
│   ├── package.json         # Frontend dependencies
│   └── env.production       # Production environment variables
├── mcp-server/              # Model Context Protocol Server
│   ├── src/                 # MCP implementation
│   ├── http-wrapper.js      # HTTP wrapper for Railway deployment
│   ├── package.json         # MCP server dependencies
│   └── env.production       # Production environment variables
├── supabase/                # Database schema
│   └── schema.sql          # User authentication tables
├── railway.json            # Railway deployment configuration
├── .gitignore             # Git ignore patterns
└── README.md              # This file
```

## ✨ Features

### 🎯 Frontend (React + Vite)
- **Modern UI**: Clean, responsive design with Tailwind CSS
- **Authentication**: Supabase-powered user registration/login
- **Chat Interface**: AI-powered knowledge base assistant
- **Real-time Search**: Instant search with article citations
- **Mobile Responsive**: Works seamlessly on all devices

### 🔧 Backend (Express.js API)
- **RESTful API**: Comprehensive API with authentication
- **Supabase Integration**: User management and session handling
- **MCP Client**: Intelligent client with HTTP/stdio mode switching
- **Claude AI**: Anthropic Claude for intelligent responses
- **Analytics**: Search history and usage tracking
- **Production Ready**: Error handling, logging, CORS, health checks

### 🔌 MCP Server
- **Freshdesk Integration**: Direct API access to knowledge base
- **HTTP Wrapper**: Railway-compatible HTTP interface
- **Search & Retrieval**: Full-text search with article fetching
- **Caching**: Performance optimization with intelligent caching
- **Error Handling**: Robust error handling and retries

## 🚀 Deployment

### Railway (Backend + MCP Server)
1. Connect your GitHub repository to Railway
2. Create two services from `railway.json`:
   - **backend**: Express API server
   - **mcp-server**: HTTP wrapper for MCP
3. Set environment variables from production env files
4. Deploy automatically from main branch

### Vercel (Frontend)
1. Connect repository to Vercel
2. Set build command: `npm run build`
3. Set environment variables from `frontend/env.production`
4. Deploy automatically from main branch

## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Backend Setup
   ```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create local environment file
cp .env.example .env

# Start development server
npm run dev
# Runs on http://localhost:3333
```

### Frontend Setup
   ```bash
# Navigate to frontend
cd frontend

# Install dependencies
   npm install

# Create local environment file
cp .env.example .env

# Start development server
npm run dev
# Runs on http://localhost:3000
```

### MCP Server Setup
   ```bash
# Navigate to MCP server
cd mcp-server

# Install dependencies
npm install

# Create local environment file
   cp .env.example .env

# Start development server
   npm run dev
# Runs on http://localhost:3000 (HTTP wrapper)
   ```

## 📡 API Endpoints

### Public Endpoints
- `GET /health` - Health check and service status
- `GET /api` - API documentation and available endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User authentication

### Protected Endpoints (require authentication)
- `GET /api/articles/search` - Search knowledge base articles
- `GET /api/articles/:id` - Get specific article details
- `GET /api/articles/categories` - List available categories
- `POST /api/chat/chat` - Chat with AI assistant
- `GET /api/chat/history` - Retrieve chat history
- `GET /api/analytics/history` - Search analytics and insights

## 🔧 Environment Variables

### Backend (`backend/env.production`)
```env
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
ANTHROPIC_API_KEY=your-anthropic-key
MCP_SERVER_URL=http://mcp-server.railway.internal
FRONTEND_URL=https://your-app.vercel.app
```

### Frontend (`frontend/env.production`)
```env
REACT_APP_API_URL=https://your-backend.railway.app
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

### MCP Server (`mcp-server/env.production`)
```env
FRESHDESK_DOMAIN=your-domain.freshdesk.com
FRESHDESK_API_KEY=your-api-key
```

## 🏗️ Architecture

### Development Mode
- **Frontend**: Vite dev server (port 3000)
- **Backend**: Express server (port 3333)
- **MCP**: Direct stdio communication

### Production Mode
- **Frontend**: Static build on Vercel
- **Backend**: Express server on Railway
- **MCP**: HTTP wrapper on Railway (internal communication)

## 🔐 Security Features

- **Environment Isolation**: Separate production environment files
- **API Authentication**: JWT-based authentication with Supabase
- **CORS Protection**: Configured for production domains only
- **Input Validation**: Request validation and sanitization
- **Error Handling**: Secure error messages in production

## 📋 Deployment Checklist

See [DEPLOYMENT.md](./DEPLOYMENT.md) for a comprehensive deployment checklist and troubleshooting guide.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is proprietary and confidential. 

## 🆘 Support

For issues and questions:
1. Check [DEPLOYMENT.md](./DEPLOYMENT.md) for common solutions
2. Review error logs in Railway/Vercel dashboards
3. Ensure all environment variables are properly configured 