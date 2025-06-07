# Freshdesk Knowledge Base MCP Integration

A comprehensive solution that integrates Freshdesk Knowledge Base with Model Context Protocol (MCP) and provides a RESTful API backend.

## Project Structure

```
freshdesk-kb-mcp-v1.2/
├── freshdesk-kb-mcp/          # MCP Server for Freshdesk Knowledge Base
│   ├── src/index.js           # Main MCP server implementation
│   ├── package.json           # MCP server dependencies
│   └── .env.example           # Environment variables template
└── freshdesk-web-app/         # Backend API Server
    └── backend/
        ├── server.js          # Express server
        ├── services/          # Service layer
        │   └── mcp-client.js  # MCP client with pagination fix
        ├── routes/            # API routes
        ├── middleware/        # Express middleware
        └── package.json       # Backend dependencies
```

## Features

### MCP Server
- **Freshdesk Knowledge Base Integration**: Direct API access to Freshdesk articles
- **Search Functionality**: Full-text search across knowledge base
- **Category Support**: Browse articles by category
- **Caching**: 5-minute cache for improved performance
- **Pagination**: Support for paginated results

### Backend API
- **RESTful API**: Express.js backend with comprehensive endpoints
- **Authentication**: Supabase-based user authentication
- **MCP Integration**: Seamless integration with MCP server
- **Pagination Fix**: Intelligent parsing to handle MCP server pagination limitations
- **Analytics**: Search history and usage analytics
- **Error Handling**: Comprehensive error handling and logging

## Key Improvements

### Backend Pagination Fix
The backend now includes an intelligent pagination fix that:
- Parses article numbers from MCP responses
- Calculates correct total counts (e.g., 95 results instead of 30)
- Handles MCP server pagination limitations
- Provides accurate pagination metadata

```javascript
// Extract real total from article numbers instead of relying on MCP metadata
const articleNumberMatches = responseText.match(/\n(\d+)\.\s\*\*/g)
const maxArticleNumber = Math.max(...articleNumbers)
// Use maxArticleNumber as the real total count
```

## Setup Instructions

### MCP Server Setup
1. Navigate to the MCP server directory:
   ```bash
   cd freshdesk-kb-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Configure your Freshdesk credentials in `.env`:
   ```
   FRESHDESK_DOMAIN=your-domain.freshdesk.com
   FRESHDESK_API_KEY=your-api-key
   ```

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd freshdesk-web-app/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Configure your environment variables in `.env`

5. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Public Endpoints
- `GET /health` - Health check
- `GET /api` - API documentation
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Protected Endpoints (require authentication)
- `GET /api/articles/search` - Search knowledge base articles
- `GET /api/articles/:id` - Get specific article
- `GET /api/articles/categories` - List categories
- `GET /api/analytics/history` - Search analytics
- `GET /api/analytics/insights` - Usage insights

## Testing

### Test Search with Correct Pagination
```bash
curl "http://localhost:3001/api/articles/search?query=printer" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected response shows correct total count:
```json
{
  "success": true,
  "search": {
    "query": "printer",
    "total_results": 95  // Fixed from 30
  }
}
```

## Known Issues & Solutions

### Issue: MCP Server Pagination Limitation
**Problem**: MCP server only returns first page (30 results) instead of all results (95)
**Solution**: Backend implements intelligent parsing to extract correct totals
**Status**: Backend fix implemented ✅

### Issue: Node Path Resolution
**Problem**: MCP client spawn errors with node path
**Solution**: Implemented node path detection with fallbacks
**Status**: Fixed ✅

## Environment Variables

### MCP Server (.env)
```
FRESHDESK_DOMAIN=your-domain.freshdesk.com
FRESHDESK_API_KEY=your-api-key
```

### Backend (.env)
```
# Supabase Configuration
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key

# Server Configuration
PORT=3001
NODE_ENV=development

# MCP Server Path
MCP_SERVER_PATH=../../freshdesk-kb-mcp
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary and confidential. 