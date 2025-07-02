# 🎭 Playwright MCP Integration

This document describes the integration of [Microsoft's Playwright MCP Server](https://github.com/microsoft/playwright-mcp) into the Freshdesk Knowledge Base application.

## Overview

The Playwright MCP integration adds powerful browser automation capabilities to your knowledge base application, enabling:

- **Web Scraping**: Extract content from any webpage
- **Screenshot Capture**: Take full-page or viewport screenshots
- **PDF Generation**: Convert web pages to PDF documents
- **Form Automation**: Fill and submit forms programmatically
- **Element Search**: Find and interact with page elements
- **Network Monitoring**: Track HTTP requests and responses
- **Testing**: Automated browser testing capabilities

## Architecture

### 1. MCP Server Configuration
The Playwright MCP server is configured in `.cursor-settings.json`:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
```

### 2. Backend Integration
- **Service**: `backend/services/playwright.js` - Core browser automation logic
- **Routes**: `backend/routes/playwright.js` - REST API endpoints
- **Dependencies**: Playwright library with Chromium browser

### 3. Frontend Integration
- **Service**: `frontend/src/services/playwright.js` - API client
- **Component**: `frontend/src/components/PlaywrightDemo.jsx` - Interactive demo
- **Route**: `/admin/playwright` - Admin interface

## Features

### 🖼️ Screenshot Capture
- Capture full-page or viewport screenshots
- Customizable wait conditions (networkidle, load, etc.)
- Base64 encoded images for easy display
- Download functionality

### 📄 Content Extraction
- Extract text content from any webpage
- CSS selector support for targeted extraction
- Clean text output with metadata

### 🔍 Element Search
- Search by text content or CSS selectors
- Return element attributes and metadata
- Support for complex queries

### 📋 Form Automation
- Fill form fields programmatically
- Submit forms and capture results
- Before/after screenshots for verification

### 📑 PDF Generation
- Convert web pages to PDF documents
- Customizable page formats (A4, Letter, etc.)
- Include backgrounds and styling

### 🌐 Network Monitoring
- Track all HTTP requests and responses
- Monitor API calls and resource loading
- Performance analysis capabilities

## API Endpoints

### Browser Status
```http
GET /api/playwright/status
```
Returns the current browser initialization status.

### Screenshot
```http
POST /api/playwright/screenshot
Content-Type: application/json

{
  "url": "https://example.com",
  "fullPage": false,
  "waitFor": "networkidle",
  "filename": "optional-filename.png"
}
```

### Content Extraction
```http
POST /api/playwright/extract
Content-Type: application/json

{
  "url": "https://example.com",
  "selector": "body"
}
```

### Element Search
```http
POST /api/playwright/search
Content-Type: application/json

{
  "url": "https://example.com",
  "text": "Search text",
  "selector": "h1, h2, h3"
}
```

### Form Automation
```http
POST /api/playwright/form
Content-Type: application/json

{
  "url": "https://example.com/form",
  "formData": {
    "#email": "user@example.com",
    "#password": "password123"
  },
  "submitButton": "button[type='submit']"
}
```

### PDF Generation
```http
POST /api/playwright/pdf
Content-Type: application/json

{
  "url": "https://example.com",
  "format": "A4",
  "margin": {
    "top": "1cm",
    "bottom": "1cm",
    "left": "1cm",
    "right": "1cm"
  }
}
```

### Network Monitoring
```http
POST /api/playwright/network
Content-Type: application/json

{
  "url": "https://example.com",
  "duration": 30000
}
```

### Cleanup
```http
POST /api/playwright/cleanup
```
Closes browser instances and cleans up resources.

## Usage Examples

### 1. Knowledge Base Content Scraping
```javascript
// Extract content from a knowledge base article
const result = await playwrightService.extractContent(
  'https://support.example.com/article/123',
  '.article-content'
);
```

### 2. Automated Testing
```javascript
// Test a contact form
const result = await playwrightService.fillForm(
  'https://example.com/contact',
  {
    '#name': 'Test User',
    '#email': 'test@example.com',
    '#message': 'This is a test message'
  }
);
```

### 3. Documentation Generation
```javascript
// Generate PDF documentation
const result = await playwrightService.generatePDF(
  'https://docs.example.com/api',
  { format: 'A4', filename: 'api-docs.pdf' }
);
```

### 4. Visual Regression Testing
```javascript
// Capture screenshots for comparison
const result = await playwrightService.takeScreenshot(
  'https://app.example.com/dashboard',
  { fullPage: true, filename: 'dashboard-screenshot.png' }
);
```

## Configuration

### Environment Variables
The Playwright service uses the following configuration:

- **Headless Mode**: Runs in headless mode for production
- **Browser Args**: Includes sandbox flags for Railway deployment
- **Viewport**: Default 1280x720 resolution
- **User Agent**: Standard Chrome user agent

### Railway Deployment
The service is configured for Railway deployment with:
- `--no-sandbox` and `--disable-setuid-sandbox` flags
- Chromium browser pre-installed via `npx playwright install chromium`
- Proper cleanup on process termination

## Security Considerations

### 1. URL Validation
- Always validate URLs before processing
- Implement allowlists for trusted domains
- Sanitize user inputs

### 2. Resource Management
- Browser instances are automatically cleaned up
- Implement timeouts for long-running operations
- Monitor memory usage

### 3. File Handling
- Screenshots and PDFs are base64 encoded
- Optional file saving to secure directories
- Implement file size limits

## Troubleshooting

### Common Issues

1. **Browser Not Initialized**
   - Check if Chromium is installed: `npx playwright install chromium`
   - Verify sandbox flags for containerized environments

2. **Memory Issues**
   - Implement regular cleanup calls
   - Monitor browser instance count
   - Set appropriate timeouts

3. **Network Timeouts**
   - Increase timeout values for slow sites
   - Use appropriate wait conditions
   - Handle network errors gracefully

### Debug Mode
Enable debug logging by setting environment variables:
```bash
DEBUG=pw:* node server.js
```

## Integration with Cursor MCP

The Playwright MCP server is also available directly in Cursor for AI-assisted browser automation. This enables:

- **AI-Driven Testing**: Let AI write and execute browser tests
- **Intelligent Scraping**: AI can understand page structure and extract relevant data
- **Automated Documentation**: Generate documentation from web interfaces
- **Smart Form Filling**: AI can understand and fill complex forms

### Cursor Usage
With the MCP server configured, you can use Playwright directly in Cursor:

```
Take a screenshot of https://example.com and extract all the headings
```

The AI will automatically use the Playwright MCP server to:
1. Navigate to the URL
2. Take a screenshot
3. Extract heading elements
4. Provide structured results

## Future Enhancements

### Planned Features
- **Multi-browser Support**: Firefox and Safari support
- **Mobile Testing**: Mobile device emulation
- **Performance Metrics**: Core Web Vitals monitoring
- **A/B Testing**: Automated comparison testing
- **Integration Testing**: End-to-end workflow testing

### Advanced Automation
- **AI-Powered Element Detection**: Smart element finding
- **Visual Diff Testing**: Automated visual regression
- **Performance Monitoring**: Continuous performance tracking
- **Cross-browser Testing**: Multi-browser compatibility

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright MCP Server](https://github.com/microsoft/playwright-mcp)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Cursor MCP Integration](https://docs.cursor.com/context/mcp)

## Support

For issues related to:
- **Playwright Core**: Check [Playwright GitHub Issues](https://github.com/microsoft/playwright/issues)
- **MCP Server**: Check [Playwright MCP Issues](https://github.com/microsoft/playwright-mcp/issues)
- **Integration**: Create an issue in this repository

---

The Playwright integration transforms your knowledge base into a powerful automation platform, enabling advanced web scraping, testing, and documentation capabilities powered by modern browser automation technology. 