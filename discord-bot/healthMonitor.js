const http = require('http');

/**
 * Health Monitoring Service for Discord Bot
 * Provides health checks, metrics, and status monitoring
 */
class HealthMonitor {
  constructor(options = {}) {
    this.enabled = process.env.HEALTH_CHECK_ENABLED !== 'false';
    this.port = parseInt(process.env.HEALTH_CHECK_PORT) || 3001;
    this.metricsEnabled = process.env.METRICS_ENABLED === 'true';
    
    // Health status
    this.status = {
      healthy: false,
      discordConnected: false,
      backendConnected: false,
      redisConnected: false,
      startTime: Date.now(),
      lastHealthCheck: null
    };
    
    // Metrics collection
    this.metrics = {
      messagesProcessed: 0,
      commandsExecuted: 0,
      feedbackSubmitted: 0,
      errorsEncountered: 0,
      responseTime: {
        total: 0,
        count: 0,
        average: 0
      },
      rateLimitHits: 0,
      uptime: 0
    };
    
    this.server = null;
    this.healthCheckInterval = null;
    
    if (this.enabled) {
      this.startHealthServer();
      this.startPeriodicChecks();
    }
    
    console.log(`[HEALTH-MONITOR] Initialized: enabled=${this.enabled}, port=${this.port}, metrics=${this.metricsEnabled}`);
  }
  
  startHealthServer() {
    this.server = http.createServer((req, res) => {
      const url = req.url;
      
      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Content-Type', 'application/json');
      
      try {
        if (url === '/health') {
          this.handleHealthCheck(req, res);
        } else if (url === '/metrics' && this.metricsEnabled) {
          this.handleMetrics(req, res);
        } else if (url === '/status') {
          this.handleStatus(req, res);
        } else {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Not Found' }));
        }
      } catch (error) {
        console.error('[HEALTH-MONITOR] Server error:', error);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    });
    
    this.server.listen(this.port, () => {
      console.log(`[HEALTH-MONITOR] Health server listening on port ${this.port}`);
    });
    
    this.server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.warn(`[HEALTH-MONITOR] Port ${this.port} in use, health checks disabled`);
        this.enabled = false;
      } else {
        console.error('[HEALTH-MONITOR] Server error:', error);
      }
    });
  }
  
  startPeriodicChecks() {
    // Update metrics every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.updateMetrics();
      this.status.lastHealthCheck = Date.now();
    }, 30000);
  }
  
  handleHealthCheck(req, res) {
    const health = {
      status: this.status.healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.status.startTime,
      services: {
        discord: this.status.discordConnected ? 'connected' : 'disconnected',
        backend: this.status.backendConnected ? 'connected' : 'disconnected',
        redis: this.status.redisConnected ? 'connected' : 'disconnected'
      }
    };
    
    const statusCode = this.status.healthy ? 200 : 503;
    res.writeHead(statusCode);
    res.end(JSON.stringify(health, null, 2));
  }
  
  handleMetrics(req, res) {
    this.updateMetrics();
    
    const metricsData = {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.status.startTime
    };
    
    res.writeHead(200);
    res.end(JSON.stringify(metricsData, null, 2));
  }
  
  handleStatus(req, res) {
    const statusData = {
      ...this.status,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.status.startTime,
      environment: process.env.NODE_ENV || 'development',
      version: require('./package.json').version
    };
    
    res.writeHead(200);
    res.end(JSON.stringify(statusData, null, 2));
  }
  
  updateMetrics() {
    this.metrics.uptime = Date.now() - this.status.startTime;
    
    // Calculate average response time
    if (this.metrics.responseTime.count > 0) {
      this.metrics.responseTime.average = Math.round(
        this.metrics.responseTime.total / this.metrics.responseTime.count
      );
    }
    
    // Update overall health status
    this.status.healthy = this.status.discordConnected && this.status.backendConnected;
  }
  
  // Methods to update status from external services
  setDiscordStatus(connected) {
    this.status.discordConnected = connected;
    console.log(`[HEALTH-MONITOR] Discord status: ${connected ? 'connected' : 'disconnected'}`);
  }
  
  setBackendStatus(connected) {
    this.status.backendConnected = connected;
    console.log(`[HEALTH-MONITOR] Backend status: ${connected ? 'connected' : 'disconnected'}`);
  }
  
  setRedisStatus(connected) {
    this.status.redisConnected = connected;
    console.log(`[HEALTH-MONITOR] Redis status: ${connected ? 'connected' : 'disconnected'}`);
  }
  
  // Methods to record metrics
  recordMessage() {
    this.metrics.messagesProcessed++;
  }
  
  recordCommand() {
    this.metrics.commandsExecuted++;
  }
  
  recordFeedback() {
    this.metrics.feedbackSubmitted++;
  }
  
  recordError() {
    this.metrics.errorsEncountered++;
  }
  
  recordResponseTime(duration) {
    this.metrics.responseTime.total += duration;
    this.metrics.responseTime.count++;
  }
  
  recordRateLimit() {
    this.metrics.rateLimitHits++;
  }
  
  // Get current metrics
  getMetrics() {
    this.updateMetrics();
    return { ...this.metrics };
  }
  
  getStatus() {
    return { ...this.status };
  }
  
  // Cleanup
  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    if (this.server) {
      this.server.close(() => {
        console.log('[HEALTH-MONITOR] Health server closed');
      });
    }
  }
}

module.exports = HealthMonitor; 