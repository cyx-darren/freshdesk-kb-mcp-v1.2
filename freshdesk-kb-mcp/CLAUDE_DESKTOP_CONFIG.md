# Claude Desktop Configuration

This document explains how to configure the Freshdesk Knowledge Base MCP Server with Claude Desktop.

## Prerequisites

1. Ensure you have completed the setup:
   ```bash
   npm install
   ```

2. Configure your `.env` file with your Freshdesk credentials:
   ```bash
   FRESHDESK_DOMAIN=your-subdomain.freshdesk.com
   FRESHDESK_API_KEY=your_api_key_here
   ```

## Claude Desktop Configuration

### Method 1: Using the run.sh script (Recommended)

Add this configuration to your Claude Desktop settings:

```json
{
  "mcpServers": {
    "freshdesk-kb": {
      "command": "/full/path/to/your/freshdesk-kb-mcp/run.sh"
    }
  }
}
```

**Replace `/full/path/to/your/freshdesk-kb-mcp/` with the actual path to your project directory.**

### Method 2: Direct Node.js execution

If you prefer not to use the shell script:

```json
{
  "mcpServers": {
    "freshdesk-kb": {
      "command": "node",
      "args": ["src/index.js"],
      "cwd": "/full/path/to/your/freshdesk-kb-mcp",
      "env": {
        "FRESHDESK_DOMAIN": "your-subdomain.freshdesk.com",
        "FRESHDESK_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Finding Your Project Path

To get the full path to your project directory, run this command in your project folder:

```bash
pwd
```

Example output: `/Users/username/projects/freshdesk-kb-mcp`

## Testing the Configuration

1. Save your Claude Desktop configuration
2. Restart Claude Desktop
3. In a new conversation, you should see the Freshdesk tools available
4. Test with queries like:
   - "Search for articles about password reset"
   - "Get article with ID 12345"

## Available Tools

Your MCP server provides two tools:

### 1. search_knowledge_base
- **Description**: Search Freshdesk knowledge base articles
- **Parameter**: `query` (string) - Search terms to find relevant articles
- **Example**: "Search for printer setup instructions"

### 2. get_article
- **Description**: Get full content of a specific knowledge base article
- **Parameter**: `article_id` (string) - The ID of the article to retrieve
- **Example**: "Get article 12345"

## Troubleshooting

### Server not starting
1. Check that your `.env` file exists and has the correct credentials
2. Verify Node.js is installed: `node --version`
3. Ensure dependencies are installed: `npm install`

### Authentication errors
1. Verify your `FRESHDESK_API_KEY` is correct
2. Check that your `FRESHDESK_DOMAIN` is in the format: `subdomain.freshdesk.com`
3. Ensure your API key has the necessary permissions

### Path issues
1. Use absolute paths in your Claude Desktop configuration
2. Ensure the `run.sh` script is executable: `chmod +x run.sh`

## Logs

The MCP server logs startup information and errors to stderr, which you can see in Claude Desktop's console if needed. 