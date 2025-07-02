import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'MCP HTTP Wrapper',
    timestamp: new Date().toISOString()
  });
});

// Execute MCP tool endpoint
app.post('/execute', async (req, res) => {
  const { tool, params } = req.body;
  
  if (!tool) {
    return res.status(400).json({
      error: 'Missing tool parameter',
      message: 'Tool name is required'
    });
  }

  console.log(`[MCP-HTTP] Executing tool: ${tool}`);
  console.log(`[MCP-HTTP] Parameters:`, params);

  let mcpProcess;
  const timeout = 30000; // 30 second timeout
  
  try {
    // Spawn the MCP process
    mcpProcess = spawn('node', [path.join(__dirname, 'src', 'index.js')], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: __dirname
    });

    let stdout = '';
    let stderr = '';
    let resolved = false;

    // Set up timeout
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (mcpProcess) {
          mcpProcess.kill('SIGTERM');
        }
        res.status(408).json({
          error: 'Request timeout',
          message: 'MCP process timed out after 30 seconds'
        });
      }
    }, timeout);

    // Handle process output
    mcpProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    mcpProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error(`[MCP-HTTP] stderr: ${data}`);
    });

    // Handle process completion
    mcpProcess.on('close', (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        
        if (code === 0) {
          try {
            // Parse the MCP response
            const lines = stdout.trim().split('\n');
            let result = null;
            
            // Look for JSON response in the output
            for (const line of lines) {
              try {
                const parsed = JSON.parse(line);
                if (parsed && (parsed.result || parsed.error)) {
                  result = parsed;
                  break;
                }
              } catch (e) {
                // Skip non-JSON lines
                continue;
              }
            }
            
            if (result) {
              if (result.error) {
                res.status(400).json({
                  error: 'MCP tool error',
                  message: result.error.message || 'Unknown error',
                  code: result.error.code || 'UNKNOWN_ERROR'
                });
              } else {
                res.json({
                  success: true,
                  result: result.result,
                  tool: tool
                });
              }
            } else {
              // If no structured response, return raw output
              res.json({
                success: true,
                result: stdout.trim(),
                tool: tool,
                raw: true
              });
            }
          } catch (parseError) {
            console.error(`[MCP-HTTP] Parse error:`, parseError);
            res.status(500).json({
              error: 'Response parsing error',
              message: 'Failed to parse MCP response',
              details: parseError.message
            });
          }
        } else {
          res.status(500).json({
            error: 'MCP process failed',
            message: `Process exited with code ${code}`,
            stderr: stderr
          });
        }
      }
    });

    mcpProcess.on('error', (error) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        console.error(`[MCP-HTTP] Process error:`, error);
        res.status(500).json({
          error: 'MCP process error',
          message: error.message
        });
      }
    });

    // Send the request to MCP process
    const mcpRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: tool,
        arguments: params || {}
      }
    };

    mcpProcess.stdin.write(JSON.stringify(mcpRequest) + '\n');
    mcpProcess.stdin.end();

  } catch (error) {
    console.error(`[MCP-HTTP] Error:`, error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// List available tools endpoint
app.get('/tools', async (req, res) => {
  console.log(`[MCP-HTTP] Listing available tools`);

  let mcpProcess;
  const timeout = 10000; // 10 second timeout
  
  try {
    // Spawn the MCP process
    mcpProcess = spawn('node', [path.join(__dirname, 'src', 'index.js')], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: __dirname
    });

    let stdout = '';
    let stderr = '';
    let resolved = false;

    // Set up timeout
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (mcpProcess) {
          mcpProcess.kill('SIGTERM');
        }
        res.status(408).json({
          error: 'Request timeout',
          message: 'MCP process timed out after 10 seconds'
        });
      }
    }, timeout);

    // Handle process output
    mcpProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    mcpProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Handle process completion
    mcpProcess.on('close', (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        
        if (code === 0) {
          try {
            // Parse the MCP response for tools list
            const lines = stdout.trim().split('\n');
            let result = null;
            
            for (const line of lines) {
              try {
                const parsed = JSON.parse(line);
                if (parsed && parsed.result && parsed.result.tools) {
                  result = parsed.result.tools;
                  break;
                }
              } catch (e) {
                continue;
              }
            }
            
            if (result) {
              res.json({
                success: true,
                tools: result
              });
            } else {
              res.json({
                success: true,
                tools: [],
                message: 'No tools found or could not parse tools list'
              });
            }
          } catch (parseError) {
            console.error(`[MCP-HTTP] Parse error:`, parseError);
            res.status(500).json({
              error: 'Response parsing error',
              message: 'Failed to parse tools list'
            });
          }
        } else {
          res.status(500).json({
            error: 'MCP process failed',
            message: `Process exited with code ${code}`,
            stderr: stderr
          });
        }
      }
    });

    mcpProcess.on('error', (error) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        console.error(`[MCP-HTTP] Process error:`, error);
        res.status(500).json({
          error: 'MCP process error',
          message: error.message
        });
      }
    });

    // Send the tools list request
    const mcpRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/list'
    };

    mcpProcess.stdin.write(JSON.stringify(mcpRequest) + '\n');
    mcpProcess.stdin.end();

  } catch (error) {
    console.error(`[MCP-HTTP] Error:`, error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Get server info endpoint
app.get('/info', (req, res) => {
  res.json({
    name: 'Freshdesk Knowledge Base MCP HTTP Wrapper',
    version: '1.0.0',
    description: 'HTTP wrapper for the Freshdesk Knowledge Base MCP server',
    endpoints: {
      '/health': 'GET - Health check',
      '/info': 'GET - Server information',
      '/tools': 'GET - List available tools',
      '/execute': 'POST - Execute MCP tool'
    },
    usage: {
      execute: {
        method: 'POST',
        path: '/execute',
        body: {
          tool: 'tool_name',
          params: {}
        }
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`[MCP-HTTP] Unhandled error:`, err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 MCP HTTP Wrapper Server Started!`);
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`🔧 MCP Server Path: ${path.join(__dirname, 'src', 'index.js')}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('\n📋 Available Endpoints:');
  console.log(`   • GET  /health     - Health check`);
  console.log(`   • GET  /info       - Server information`);
  console.log(`   • GET  /tools      - List available tools`);
  console.log(`   • POST /execute    - Execute MCP tool`);
  console.log('\n💡 Ready to proxy MCP requests!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received. Shutting down gracefully...');
  process.exit(0);
}); 