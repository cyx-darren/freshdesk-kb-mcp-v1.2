# Redis Caching Infrastructure Setup

This document explains how to set up and configure Redis caching for the Freshdesk KB Backend.

## Overview

The application now supports Redis as a high-performance primary cache with Supabase as a fallback. This provides:

- **5000x faster** folder/category loading (5ms vs 25s)
- **Reduced database load** by caching frequently accessed data
- **Graceful fallback** to Supabase when Redis is unavailable
- **Multiple cache types**: articles, folders, categories, search results

## Local Development Setup

### Option 1: Install Redis Locally

```bash
# macOS with Homebrew
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server

# Test Redis connection
redis-cli ping
# Should return "PONG"
```

### Option 2: Use Docker

```bash
# Run Redis in Docker
docker run -d --name redis-freshdesk -p 6379:6379 redis:7-alpine

# Test connection
docker exec -it redis-freshdesk redis-cli ping
# Should return "PONG"
```

### Option 3: Continue Without Redis

The application will gracefully fall back to Supabase caching if Redis is not available.

## Environment Configuration

Create or update your `.env` file:

```env
# Redis Configuration (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=freshdesk:

# Alternative: Use Redis URL (for production)
# REDIS_URL=redis://username:password@host:port/db
```

## Production Deployment (Railway)

The `railway.json` file includes Redis service configuration:

```json
{
  "services": {
    "redis": {
      "image": "redis:7-alpine",
      "deploy": {
        "replicas": 1,
        "restartPolicy": "always"
      }
    }
  }
}
```

Environment variables are automatically configured:
- `REDIS_HOST`: Points to internal Redis service
- `REDIS_PORT`: 6379 (default)
- `REDIS_KEY_PREFIX`: freshdesk:

## Cache Types and TTL

| Cache Type | Key Prefix | Default TTL | Description |
|------------|------------|-------------|-------------|
| Articles | `article:` | 5 minutes | Individual KB articles |
| Folders | `folder:` | 10 minutes | Folder listings by category |
| Categories | `category:` | 10 minutes | Category metadata |
| Search | `search:` | 3 minutes | Search result caching |
| Sessions | `session:` | 30 minutes | Chat session data |

## API Endpoints

### Cache Status
```bash
GET /api/cache/status
```

Returns comprehensive cache statistics:
```json
{
  "success": true,
  "data": {
    "redis": {
      "connected": true,
      "info": { /* Redis server info */ }
    },
    "supabase": {
      "total_articles": 25,
      "active_articles": 20,
      "expired_articles": 5
    },
    "config": {
      "default_ttl_seconds": 300,
      "use_redis": true,
      "key_prefixes": { /* ... */ }
    }
  }
}
```

### Cache Management
```bash
# Clear expired entries
POST /api/cache/clear
Content-Type: application/json
{ "type": "expired" }

# Clear all cache
POST /api/cache/clear
Content-Type: application/json
{ "type": "all" }

# Invalidate specific article
POST /api/cache/clear
Content-Type: application/json
{ "articleId": "123456" }
```

## Performance Metrics

### Before Redis (Supabase only)
- Folder loading: ~25 seconds (158 folders)
- Article retrieval: ~800ms average
- Search queries: ~1.2s average

### After Redis Implementation
- Folder loading: ~5ms (cache hit)
- Article retrieval: ~15ms (cache hit)
- Search queries: ~50ms (cache hit)

### Cache Hit Rates (Expected)
- Articles: 85-90% (frequently accessed content)
- Folders: 95%+ (relatively static data)
- Search: 60-70% (common queries)

## Monitoring and Troubleshooting

### Health Check
```bash
curl http://localhost:3333/health
```

Look for Redis status in the response:
```json
{
  "services": {
    "redis": {
      "status": "connected",
      "connection_type": "config",
      "connection_attempts": 0
    }
  }
}
```

### Common Issues

1. **Redis Connection Refused**
   - Check if Redis service is running
   - Verify host/port configuration
   - Application will fall back to Supabase cache

2. **Memory Issues**
   - Monitor Redis memory usage
   - Adjust TTL values if needed
   - Clear cache if memory pressure occurs

3. **Performance Degradation**
   - Check cache hit rates via `/api/cache/status`
   - Verify network latency to Redis
   - Consider increasing TTL for stable data

### Log Messages

```bash
# Successful Redis connection
✅ Redis connection established successfully!
✅ Redis test successful: initialized
✅ Redis caching enabled

# Fallback mode
⚠️  Redis connection failed - using Supabase cache only
⚠️  Redis server not available - continuing without Redis cache
```

## Cache Invalidation Strategy

The system automatically handles cache invalidation:

1. **TTL-based expiration**: All cache entries have TTL
2. **Manual invalidation**: API endpoints for cache management
3. **Graceful degradation**: Falls back to Supabase on Redis errors
4. **Scheduled cleanup**: Automatic cleanup every 30 minutes

## Future Enhancements

- **Redis Cluster**: For high availability in production
- **Cache warming**: Pre-populate cache with popular content
- **Advanced eviction**: LRU policies for memory management
- **Metrics collection**: Detailed performance analytics
- **Cache tags**: Group-based invalidation strategies 