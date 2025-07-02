# 🚀 Railway Deployment Guide for Discord Bot

This guide covers deploying the Freshdesk Knowledge Base Discord Bot to Railway in production.

## 📋 Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Discord Bot Token**: Get from [Discord Developer Portal](https://discord.com/developers/applications)
3. **GitHub Repository**: Code must be in a Git repository
4. **Supabase Project**: Backend database and API endpoints
5. **Redis Instance**: Will be automatically provisioned by Railway

## 🔧 Pre-Deployment Setup

### 1. Environment Variables Setup

Before deploying, ensure you have these environment variables ready:

#### **Required Variables:**
```bash
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your-discord-bot-token-here
DISCORD_BOT_API_KEY=your-secure-api-key-here

# Supabase Configuration  
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Backend Configuration
BACKEND_URL=https://your-backend.railway.app
```

#### **Optional Production Variables:**
```bash
# Logging
LOG_LEVEL=info
LOG_FILE_ENABLED=true

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=30

# Health Monitoring
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_PORT=3001
METRICS_ENABLED=true

# Bot Behavior
BOT_PRESENCE_STATUS=online
BOT_ACTIVITY_TYPE=LISTENING
BOT_ACTIVITY_NAME=to your questions
```

### 2. Discord Bot Permissions

Ensure your Discord bot has these permissions:
- ✅ Send Messages
- ✅ Send Messages in Threads  
- ✅ Read Message History
- ✅ Use Slash Commands
- ✅ Add Reactions
- ✅ Use External Emojis

## 🚀 Railway Deployment Steps

### Step 1: Connect Repository to Railway

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repository
4. Railway will detect the `railway.json` configuration

### Step 2: Configure Services

Railway will automatically create these services based on `railway.json`:

#### **Services Created:**
- 🤖 **discord-bot** - Discord bot service
- 🖥️ **backend** - Main API backend  
- 🗄️ **redis** - Redis cache instance
- 🔧 **mcp-server** - MCP service wrapper

### Step 3: Set Environment Variables

For each service, set the required environment variables:

#### **Backend Service Variables:**
```bash
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
REDIS_HOST=redis.railway.internal
REDIS_PORT=6379
```

#### **Discord Bot Service Variables:**
```bash
NODE_ENV=production
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_BOT_API_KEY=your-secure-api-key
BACKEND_URL=https://your-backend.railway.app
REDIS_HOST=redis.railway.internal
REDIS_PORT=6379
RATE_LIMIT_ENABLED=true
HEALTH_CHECK_ENABLED=true
METRICS_ENABLED=true
```

### Step 4: Deploy Services

1. **Deploy Backend First**: Ensure backend service is healthy
2. **Deploy Redis**: Redis will start automatically
3. **Deploy Discord Bot**: Bot will connect to backend and Redis
4. **Deploy MCP Server**: Supporting service for KB operations

### Step 5: Verify Deployment

#### **Health Checks:**

1. **Backend Health**: `https://your-backend.railway.app/health`
2. **Discord Bot Health**: `https://your-discord-bot.railway.app/health`
3. **Discord Bot Metrics**: `https://your-discord-bot.railway.app/metrics`

#### **Expected Health Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-07-01T14:45:00.000Z",
  "uptime": 300000,
  "services": {
    "discord": "connected",
    "backend": "connected", 
    "redis": "connected"
  }
}
```

## 📊 Monitoring & Observability

### Health Monitoring Endpoints

| Endpoint | Service | Description |
|----------|---------|-------------|
| `/health` | Discord Bot | Basic health status |
| `/metrics` | Discord Bot | Detailed performance metrics |
| `/status` | Discord Bot | Comprehensive status info |

### Key Metrics to Monitor

- **Messages Processed**: Total messages handled
- **Commands Executed**: Slash commands processed  
- **Feedback Submitted**: User feedback collected
- **Response Time**: Average API response time
- **Rate Limit Hits**: Users hitting rate limits
- **Error Rate**: Percentage of failed requests

### Log Monitoring

Railway provides built-in log monitoring. Key log patterns to watch:

```bash
# Success Patterns
[DISCORD-BOT] ✅ Discord bot logged in
[HEALTH-MONITOR] Health server listening on port 3001
[RATE-LIMITER] Initialized: enabled=true

# Warning Patterns  
[RATE-LIMITER] Rate limit hit - User: 12345
[HEALTH-MONITOR] Backend status: disconnected

# Error Patterns
[DISCORD-BOT] Error handling message:
[RATE-LIMITER] Redis connection failed
```

## 🔒 Security Best Practices

### 1. Environment Variables
- ✅ Never commit secrets to Git
- ✅ Use Railway's encrypted environment variables
- ✅ Rotate API keys regularly
- ✅ Use strong, unique API keys

### 2. Rate Limiting
- ✅ Enabled by default (30 requests/minute)
- ✅ Configurable per environment
- ✅ Redis-backed for distributed rate limiting
- ✅ Graceful degradation if Redis fails

### 3. Error Handling
- ✅ Comprehensive error logging
- ✅ Graceful failure modes
- ✅ Circuit breaker patterns
- ✅ User-friendly error messages

## 🛠️ Troubleshooting

### Common Issues

#### **Discord Bot Won't Start**
```bash
# Check logs for:
❌ DISCORD_BOT_TOKEN environment variable is required
❌ Invalid Discord token

# Solution: Verify token in Railway environment variables
```

#### **Backend Connection Failed**
```bash
# Check logs for:
⚠️ Backend connection test failed
❌ connect ECONNREFUSED

# Solution: Ensure backend service is running and healthy
```

#### **Rate Limiting Issues**
```bash
# Check logs for:
[RATE-LIMITER] Redis connection failed, using memory store

# Solution: Verify Redis service is running
```

### Debug Commands

```bash
# Check service status
railway status

# View logs
railway logs --service discord-bot

# Connect to service
railway shell --service discord-bot

# Check environment variables
railway variables
```

## 📈 Scaling Considerations

### Horizontal Scaling
- **Single Instance**: Current configuration runs 1 bot replica
- **Multiple Instances**: Coordinate via Redis for rate limiting
- **Load Balancing**: Railway handles load balancing automatically

### Performance Tuning
- **Rate Limits**: Adjust based on usage patterns
- **Response Caching**: Redis caching for frequently asked questions
- **Connection Pooling**: Database connection optimization

## 🔄 Updates & Maintenance

### Deployment Pipeline
1. **Push to main branch** → Automatic deployment
2. **Environment updates** → Restart required services
3. **Configuration changes** → Update `railway.json`

### Maintenance Tasks
- **Monitor logs** for errors and performance issues
- **Update dependencies** regularly for security
- **Review metrics** to optimize performance
- **Backup configurations** and environment variables

## 📞 Support

### Railway Support
- [Railway Documentation](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [Railway Status](https://status.railway.app)

### Bot Support
- Check health endpoints for service status
- Review logs for error patterns
- Monitor metrics for performance issues
- Use Railway's built-in alerting for critical issues

---

## ✅ Deployment Checklist

Before going live, ensure:

- [ ] All environment variables configured
- [ ] Discord bot permissions set correctly
- [ ] Health endpoints responding
- [ ] Rate limiting functioning
- [ ] Metrics collection enabled
- [ ] Error logging working
- [ ] Backend connectivity verified
- [ ] Redis connectivity confirmed
- [ ] Test Discord commands working
- [ ] Feedback system operational

**🎉 Your Discord bot is now production-ready on Railway!** 