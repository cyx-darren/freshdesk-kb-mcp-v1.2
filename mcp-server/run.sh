#!/bin/bash

# Freshdesk Knowledge Base MCP Server Launcher
# This script loads environment variables and starts the MCP server

# Exit on any error
set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Change to the script directory
cd "$SCRIPT_DIR"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "Error: .env file not found!" >&2
    echo "Please create a .env file with your Freshdesk credentials." >&2
    echo "See .env.example for the required format." >&2
    exit 1
fi

# Load environment variables from .env file
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi

# Validate required environment variables
if [ -z "$FRESHDESK_DOMAIN" ]; then
    echo "Error: FRESHDESK_DOMAIN environment variable is not set!" >&2
    exit 1
fi

if [ -z "$FRESHDESK_API_KEY" ]; then
    echo "Error: FRESHDESK_API_KEY environment variable is not set!" >&2
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Error: node_modules not found. Please run 'npm install' first." >&2
    exit 1
fi

# Check if the main script exists
if [ ! -f "src/index.js" ]; then
    echo "Error: src/index.js not found!" >&2
    exit 1
fi

# Log startup information to stderr (so it doesn't interfere with MCP communication)
echo "Starting Freshdesk Knowledge Base MCP Server..." >&2
echo "Domain: $FRESHDESK_DOMAIN" >&2
echo "Node version: $(/opt/homebrew/bin/node --version)" >&2

# Start the MCP server
exec /opt/homebrew/bin/node src/index.js 