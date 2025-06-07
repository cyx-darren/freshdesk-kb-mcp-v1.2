# Freshdesk Knowledge Base MCP Server

A Model Context Protocol (MCP) server that provides AI assistants access to your Freshdesk knowledge base articles. This server enables AI models to search and retrieve content from your Freshdesk help center directly within supported clients like Claude Desktop.

## ✨ Features

- 🔍 **Search Knowledge Base**: Find relevant articles using natural language queries
- 📄 **Get Full Articles**: Retrieve complete article content including metadata
- 🛡️ **Robust Error Handling**: Comprehensive error messages with actionable suggestions
- 🔐 **Secure Authentication**: Uses Freshdesk API key authentication
- ⚡ **Rate Limit Handling**: Smart handling of API rate limits with retry guidance

## 🎯 Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `search_knowledge_base` | Search for articles in your Freshdesk knowledge base | `query` (string) - Search terms |
| `get_article` | Retrieve full content of a specific article | `article_id` (string) - Article ID |

## 📋 Prerequisites

- Node.js 18.0.0 or higher
- A Freshdesk account with API access
- Claude Desktop (or another MCP-compatible client)

## 🔑 Getting Freshdesk API Credentials

### Step 1: Access Your Freshdesk Admin Panel

1. Log into your Freshdesk account
2. Go to **Admin Settings** (gear icon in the top right)
3. Navigate to **Security** → **API Key**

### Step 2: Generate Your API Key

1. Click on **"Your API Key"** or **"Generate API Key"**
2. Copy the generated API key (it looks like: `wk02dODbfqdvT8m7eVSO`)
3. **Important**: Store this key securely - you won't be able to see it again

### Step 3: Note Your Domain

Your Freshdesk domain is the subdomain portion of your Freshdesk URL:
- If your Freshdesk URL is `https://mycompany.freshdesk.com`
- Your domain is: `mycompany.freshdesk.com`

### Step 4: Verify Permissions

Ensure your API key has access to:
- ✅ Knowledge Base / Solutions
- ✅ Read permissions for articles

## 🚀 Installation

### 1. Clone or Download

```bash
git clone <repository-url>
cd freshdesk-kb-mcp
```

Or download and extract the project files.

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit the `.env` file with your credentials:

```env
# Freshdesk Knowledge Base MCP Server Configuration

# Your Freshdesk domain (format: subdomain.freshdesk.com)
# Example: mycompany.freshdesk.com
FRESHDESK_DOMAIN=your-subdomain.freshdesk.com

# Your Freshdesk API Key
# You can find this in your Freshdesk profile settings under API Key
FRESHDESK_API_KEY=your_api_key_here
```

**Replace the values:**
- `your-subdomain` → Your actual Freshdesk subdomain
- `your_api_key_here` → Your actual API key from Step 2

### 4. Test the Server

```bash
npm run start
```

You should see:
```
🚀 Starting Freshdesk Knowledge Base MCP Server...
📡 Domain: your-subdomain.freshdesk.com
🔑 API Key: ***eVSO
✅ Freshdesk Knowledge Base MCP Server running on stdio
🔧 Available tools: search_knowledge_base, get_article
📖 Ready to serve Freshdesk knowledge base requests
```

Press `Ctrl+C` to stop the test.

## 🖥️ Claude Desktop Configuration

### Option 1: Using the Run Script (Recommended)

1. **Get your project path:**
   ```bash
   pwd
   ```
   Copy the full path (e.g., `/Users/username/projects/freshdesk-kb-mcp`)

2. **Open Claude Desktop Settings:**
   - **macOS**: `Claude → Settings → Developer`
   - **Windows**: `File → Settings → Developer`

3. **Edit MCP Settings:**
   Click "Edit Config" and add this configuration:

```json
{
  "mcpServers": {
    "freshdesk-kb": {
      "command": "/full/path/to/your/freshdesk-kb-mcp/run.sh"
    }
  }
}
```

**⚠️ Important**: Replace `/full/path/to/your/freshdesk-kb-mcp/` with your actual project path from step 1.

### Option 2: Direct Node.js Configuration

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

### Complete Example Configuration

Here's a complete `claude_desktop_config.json` example:

```json
{
  "mcpServers": {
    "freshdesk-kb": {
      "command": "/Users/username/projects/freshdesk-kb-mcp/run.sh"
    },
    "other-server": {
      "command": "some-other-mcp-server"
    }
  },
  "globalShortcut": "Cmd+Shift+Space"
}
```

## 🔄 Restart and Test

1. **Save your configuration** in Claude Desktop
2. **Restart Claude Desktop** completely
3. **Start a new conversation**
4. **Test the integration:**

Try these example queries:
- "Search for articles about password reset"
- "Find documentation about printer setup"
- "Get article 12345" (replace with a real article ID)

## 📖 Usage Examples

### Searching for Articles

**Prompt:** *"Search for articles about email setup"*

**Response:** 
```
Found 3 knowledge base articles for "email setup":

1. **Email Configuration Guide**
   Complete guide to setting up your email client...
   🔗 [View Article](https://yourcompany.freshdesk.com/solution/articles/123)
   📁 Category: Getting Started

2. **Troubleshooting Email Issues**
   Common email problems and solutions...
   🔗 [View Article](https://yourcompany.freshdesk.com/solution/articles/124)
   📁 Category: Troubleshooting
```

### Getting Full Article Content

**Prompt:** *"Get the full content of article 123"*

**Response:**
```
# Email Configuration Guide

**Article ID:** 123
**Status:** published
**Category:** Getting Started
**Created:** 12/1/2023
**Last Updated:** 12/15/2023

---

**Description:**
Complete guide to setting up your email client

**Content:**
Follow these steps to configure your email:
1. Open your email client...
2. Navigate to account settings...
[Full article content]

🔗 **[View Original Article](https://yourcompany.freshdesk.com/solution/articles/123)**
```

## 🛠️ Troubleshooting

### Server Won't Start

**Error**: `Error: Missing required environment variables`
- **Solution**: Check your `.env` file exists and has the correct format
- **Verify**: Both `FRESHDESK_DOMAIN` and `FRESHDESK_API_KEY` are set

**Error**: `node: command not found`
- **Solution**: Install Node.js from [nodejs.org](https://nodejs.org)
- **Verify**: Run `node --version` to confirm installation

### Authentication Issues

**Error**: `🔐 Authentication Failed`
- **Check**: Your API key is correct and active
- **Verify**: Log into Freshdesk and regenerate your API key if needed
- **Format**: Ensure no extra spaces in your `.env` file

### Domain Issues

**Error**: `🔍 Not Found` or `🌐 Domain Not Found`
- **Check**: Your domain format is `subdomain.freshdesk.com`
- **Verify**: You can access `https://your-subdomain.freshdesk.com` in a browser
- **Example**: If your URL is `https://help.mycompany.com`, you might need a different domain format

### Claude Desktop Integration

**Issue**: Tools don't appear in Claude Desktop
- **Check**: Configuration file syntax is valid JSON
- **Verify**: File path is absolute and correct
- **Restart**: Completely quit and restart Claude Desktop
- **Permissions**: Ensure `run.sh` is executable (`chmod +x run.sh`)

**Issue**: `Permission denied` when running
- **Solution**: Make the script executable:
  ```bash
  chmod +x run.sh
  ```

### Rate Limiting

**Error**: `⏰ Rate Limit Exceeded`
- **Solution**: Wait the specified time before trying again
- **Prevention**: Reduce frequency of requests
- **Note**: Freshdesk typically allows 1000 requests per hour

## 📁 Project Structure

```
freshdesk-kb-mcp/
├── src/
│   └── index.js              # Main MCP server implementation
├── .env                      # Your environment variables (create this)
├── .env.example             # Template for environment variables
├── .gitignore               # Git ignore file
├── package.json             # Node.js dependencies and scripts
├── run.sh                   # Launch script for Claude Desktop
├── README.md               # This file
└── CLAUDE_DESKTOP_CONFIG.md # Additional configuration guide
```

## 🔧 Development

### Available Scripts

```bash
npm run start    # Start the server normally
npm run dev      # Start with file watching (auto-restart)
npm run mcp      # Run using the launch script
```

### Logs and Debugging

The server provides detailed logging to help with troubleshooting:
- **Startup logs**: Configuration validation and server status
- **API logs**: Detailed error information for failed requests
- **Request logs**: Context about what was requested when errors occur

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter issues:

1. **Check the troubleshooting section** above
2. **Review the error messages** - they include specific suggestions
3. **Verify your credentials** and configuration
4. **Test your Freshdesk API access** independently

For additional help, please open an issue with:
- Your error message (remove any sensitive information)
- Your configuration (without API keys)
- Steps to reproduce the issue

---

**Made with ❤️ for the MCP community** 