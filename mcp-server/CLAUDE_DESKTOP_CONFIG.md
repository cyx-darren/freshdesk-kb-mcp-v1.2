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

Your MCP server provides six powerful tools:

### 1. search_knowledge_base
- **Description**: Search Freshdesk knowledge base articles
- **Parameters**: 
  - `query` (string, optional) - Search terms to find relevant articles
  - `category` (string, optional) - Category name or ID to search within
  - `page` (number, optional) - Page number for pagination (default: 1)
  - `per_page` (number, optional) - Results per page (default: 30, max: 100)
- **Example**: "Search for printer setup instructions in Getting Started category"

### 2. get_article
- **Description**: Get full content of a specific knowledge base article
- **Parameter**: `article_id` (string) - The ID of the article to retrieve
- **Example**: "Get article 12345"

### 3. list_categories
- **Description**: List all solution categories in your Freshdesk knowledge base
- **Parameters**: None
- **Example**: "List all categories"

### 4. **create_article** (NEW!)
- **Description**: Create a new article in Freshdesk knowledge base with all required fields
- **Parameters**:
  - `title` (string, required) - Title of the article
  - `description` (string, required) - HTML content/body of the article
  - `folder_id` (number, required) - Folder ID where the article should be created
  - `tags` (array of strings, optional) - Array of tags for the article
  - `seo_title` (string, optional) - Title for search engine (SEO title)
  - `meta_description` (string, optional) - Description for search engine (meta description)
  - `status` (number, optional) - Article status: 1 for draft (default), 2 for published
- **Example**: "Create an article titled 'Password Reset Guide' in folder 123"

### 5. list_folders
- **Description**: List all folders in a specific category to find folder IDs for article creation
- **Parameter**: `category_id` (number) - The category ID to list folders from
- **Example**: "List folders in category 5"

### 6. cache_status
- **Description**: Show cache status and statistics (for debugging)
- **Parameters**: None
- **Example**: "Show cache status"

## Article Creation Workflow

To create a new article, follow this typical workflow:

1. **Find a Category**: Use `list_categories` to see all available categories
2. **Find a Folder**: Use `list_folders` with the category ID to get folder IDs
3. **Create Article**: Use `create_article` with the required parameters

**Example workflow:**
```
1. "List all categories" 
   → Note the category ID (e.g., ID: 5)

2. "List folders in category 5"
   → Note the folder ID (e.g., ID: 123)

3. "Create an article titled 'How to Reset Password' with content '<p>Follow these steps...</p>' in folder 123 with tags 'password,reset,help' as draft"
```

**API Format Details:**
- The `create_article` tool uses Freshdesk API v2 endpoint: `POST /api/v2/solutions/articles`
- Request body format matches Freshdesk requirements exactly:
  ```json
  {
    "title": "Article Title",
    "description": "HTML content",
    "folder_id": 123,
    "tags": ["tag1", "tag2"],
    "seo": {
      "title": "SEO Title",
      "meta_description": "Meta description"
    },
    "status": 1
  }
  ```

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

### Article creation issues
1. **403 Forbidden**: Ensure your API key has write permissions for Knowledge Base
2. **404 Not Found**: Verify the folder_id exists using `list_folders`
3. **422 Validation Error**: Check that title and description are not empty
4. **Missing folder_id**: Use `list_categories` then `list_folders` to find valid folder IDs

## Logs

The MCP server logs startup information and errors to stderr, which you can see in Claude Desktop's console if needed. 