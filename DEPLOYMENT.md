# Deployment Guide

This guide provides step-by-step instructions for deploying the Freshdesk Knowledge Base MCP Integration to production.

## 🚀 Quick Deployment Overview

- **Frontend**: Deploy to Vercel (static React app)
- **Backend + MCP Server**: Deploy to Railway (multi-service)
- **Database**: Supabase (already configured)

## 📋 Pre-Deployment Checklist

### ✅ Repository Structure Verification
```
freshdesk-kb-mcp-v1.2/
├── backend/                   # ✅ Express API Server
│   ├── server.js             # ✅ Main server file
│   ├── package.json          # ✅ Dependencies
│   └── env.production        # ✅ Production environment
├── frontend/                 # ✅ React Web App  
│   ├── src/                  # ✅ Source code
│   ├── package.json          # ✅ Dependencies
│   └── env.production        # ✅ Production environment
├── mcp-server/              # ✅ MCP HTTP Wrapper
│   ├── src/                 # ✅ MCP implementation
│   ├── http-wrapper.js      # ✅ HTTP wrapper
│   ├── package.json         # ✅ Dependencies
│   └── env.production       # ✅ Production environment
├── railway.json             # ✅ Railway configuration
└── README.md               # ✅ Documentation
```

### ✅ Environment Files Check
- [ ] `backend/env.production` - Contains all backend variables
- [ ] `frontend/env.production` - Contains React app variables
- [ ] `mcp-server/env.production` - Contains Freshdesk credentials
- [ ] All sensitive data excluded from git via `.gitignore`

### ✅ Dependencies Check
- [ ] All `package.json` files have correct dependencies
- [ ] No development-only dependencies in production builds
- [ ] Node.js version compatibility (18+)

## 🚂 Railway Deployment (Backend + MCP Server)

### Step 1: Connect Repository
1. Go to [Railway](https://railway.app)
2. Click "Deploy from GitHub repo"
3. Select your `freshdesk-kb-mcp-v1.2` repository
4. Railway will detect `railway.json` and create two services

### Step 2: Configure Backend Service
1. Select the **backend** service
2. Go to Variables tab
3. Add environment variables from `backend/env.production`:
   ```
   NODE_ENV=production
   SUPABASE_URL=https://your-supabase-url.supabase.co
   SUPABASE_SERVICE_KEY=your-supabase-service-key
   ANTHROPIC_API_KEY=your-anthropic-api-key-here
   MCP_SERVER_URL=http://mcp-server.railway.internal
   FRONTEND_URL=https://your-app.vercel.app
   ```
4. Note the backend URL (e.g., `https://backend-production-xyz.up.railway.app`)

### Step 3: Configure MCP Server Service
1. Select the **mcp-server** service
2. Go to Variables tab
3. Add environment variables from `mcp-server/env.production`:
   ```
   FRESHDESK_DOMAIN=yourdomain.freshdesk.com
   FRESHDESK_API_KEY=your-freshdesk-api-key
   ```

### Step 4: Deploy Services
1. Both services should deploy automatically
2. Check deployment logs for any errors
3. Test backend health: `GET https://your-backend.railway.app/health`

## ▲ Vercel Deployment (Frontend)

### Step 1: Connect Repository
1. Go to [Vercel](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Set **Root Directory** to `frontend`

### Step 2: Configure Build Settings
```
Build Command: npm run build
Output Directory: dist
Install Command: npm install
Development Command: npm run dev
```

### Step 3: Configure Environment Variables
Add variables from `frontend/env.production`:
```
REACT_APP_API_URL=https://your-backend.railway.app
REACT_APP_SUPABASE_URL=https://your-supabase-url.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Step 4: Deploy Frontend
1. Click "Deploy"
2. Note the frontend URL (e.g., `https://your-app.vercel.app`)
3. Update `FRONTEND_URL` in Railway backend service

## 🔗 Final Configuration Updates

### Update URLs After Deployment
1. **Backend FRONTEND_URL**: Update in Railway backend service
   ```
   FRONTEND_URL=https://your-actual-app.vercel.app
   ```

2. **Frontend API_URL**: Update in Vercel frontend
   ```
   REACT_APP_API_URL=https://your-actual-backend.railway.app
   ```

### Test Deployment
1. **Frontend**: Visit your Vercel URL
2. **Backend Health**: `GET https://your-backend.railway.app/health`
3. **Authentication**: Test login/register flow
4. **Chat Interface**: Test knowledge base search

## 🛠️ Troubleshooting

### Common Issues & Solutions

#### Issue: "MCP_SERVER_URL environment variable is required"
**Solution**: Ensure MCP_SERVER_URL is set in Railway backend service
```
MCP_SERVER_URL=http://mcp-server.railway.internal
```

#### Issue: Frontend can't reach backend (CORS error)
**Solution**: Verify FRONTEND_URL in Railway backend matches Vercel URL
```
FRONTEND_URL=https://your-exact-vercel-url.vercel.app
```

#### Issue: Authentication not working
**Solution**: Check Supabase configuration
1. Verify SUPABASE_URL and keys are correct
2. Check Supabase project settings for allowed origins
3. Add your Vercel domain to Supabase allowed origins

#### Issue: MCP server not responding
**Solution**: Check Railway logs for mcp-server service
1. Verify Freshdesk credentials are correct
2. Check if http-wrapper.js is starting properly
3. Ensure internal Railway networking is working

#### Issue: Build failures
**Solution**: Check dependency versions
1. Ensure Node.js version compatibility
2. Clear npm cache: `npm cache clean --force`
3. Delete node_modules and reinstall

### Health Check URLs
- **Backend**: `https://your-backend.railway.app/health`
- **MCP Server**: `https://your-mcp.railway.app/health`
- **Frontend**: Should load without errors

### Log Monitoring
1. **Railway**: Check deployment and runtime logs for each service
2. **Vercel**: Check function logs and build logs
3. **Browser**: Check console for frontend errors

## 🔒 Security Checklist

- [ ] All environment variables properly configured
- [ ] No sensitive data in repository
- [ ] CORS properly configured for production domains
- [ ] Supabase security rules in place
- [ ] API rate limiting enabled (if applicable)

## 📊 Performance Optimization

- [ ] Frontend assets optimized and minified
- [ ] Backend responses cached where appropriate
- [ ] Database queries optimized
- [ ] CDN configured for static assets (automatic with Vercel)

## 📈 Monitoring Setup

### Railway Monitoring
1. Set up uptime monitoring
2. Configure log retention
3. Set up alerting for service failures

### Vercel Monitoring
1. Monitor build times
2. Check Core Web Vitals
3. Set up error tracking

### Application Monitoring
1. Monitor API response times
2. Track user authentication success rates
3. Monitor knowledge base search performance

## 🔄 CI/CD Pipeline

### Automatic Deployments
1. **Railway**: Deploys on push to `main` branch
2. **Vercel**: Deploys on push to `main` branch
3. **Environment Branches**: Consider separate staging environments

### Manual Deployment Commands
```bash
# Railway CLI deployment
railway login
railway deploy

# Vercel CLI deployment
vercel login
vercel deploy --prod
```

## 📝 Post-Deployment Tasks

1. **Update URLs in README.md**
   - Replace "to-be-updated" URLs with actual deployment URLs
   
2. **Test All Features**
   - User registration and login
   - Knowledge base search
   - Chat interface
   - Article viewing
   
3. **Performance Testing**
   - Load testing for backend API
   - Frontend performance metrics
   - Database query optimization

4. **Documentation**
   - Update API documentation with live URLs
   - Create user guide for the application
   - Document any deployment-specific configurations

## 🆘 Emergency Procedures

### Rollback Process
1. **Railway**: Use deployment history to rollback
2. **Vercel**: Use deployment history to rollback
3. **Database**: Restore from Supabase backup if needed

### Service Recovery
1. Check service status in Railway/Vercel dashboards
2. Review recent deployment logs
3. Verify environment variables
4. Test individual service health endpoints
5. Contact platform support if needed

---

## ✅ Final Deployment Checklist

- [ ] Repository structure verified
- [ ] All environment files created and configured
- [ ] Railway services deployed and configured
- [ ] Vercel frontend deployed and configured
- [ ] URLs updated in both services
- [ ] Health checks passing
- [ ] Authentication flow working
- [ ] Knowledge base search functional
- [ ] All features tested in production
- [ ] Monitoring and alerting configured
- [ ] Documentation updated with live URLs

**Deployment Complete! 🎉** 