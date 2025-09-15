#!/bin/bash

# MCP Server Setup Script for Rental Management App
# This script installs and configures MCP servers for the project

set -e

echo "🚀 Setting up MCP servers for Rental Management App..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install Firebase CLI (includes MCP server)
echo "📦 Installing Firebase CLI..."

npm install -g firebase-tools

echo "✅ Firebase CLI installed successfully"
echo "📝 Note: Install Browser MCP extension from browsermcp.io"

# Verify Firebase CLI installation
if command -v firebase &> /dev/null; then
    echo "✅ Firebase CLI is ready"
else
    echo "❌ Firebase CLI installation failed"
    exit 1
fi

# Create .env file for MCP configuration
echo "⚙️ Creating environment configuration..."

cat > .env.mcp << EOF
# MCP Server Configuration
FIREBASE_PROJECT_ID=rental-management-app
FIREBASE_REGION=us-central1
FIREBASE_FUNCTIONS_REGION=us-central1
ALLOWED_PATHS=/Users/arno/Documents/Personal/RMSv3
MAX_FILE_SIZE=10485760
BROWSER_HEADLESS=true
BROWSER_TIMEOUT=30000
DATABASE_TIMEOUT=30000
EOF

echo "✅ Environment configuration created"

# Create MCP configuration file
echo "📝 Creating MCP configuration..."

cat > mcp-config.json << EOF
{
  "mcpServers": {
    "firebase": {
      "command": "npx",
      "args": ["-y", "firebase-tools@latest", "experimental:mcp"]
    },
    "browser": {
      "command": "browser-mcp",
      "args": []
    }
  }
}
EOF

echo "✅ MCP configuration created"

# Create package.json scripts for MCP operations
echo "📝 Adding MCP scripts to package.json..."

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "📦 Creating package.json..."
    cat > package.json << EOF
{
  "name": "rental-management-app",
  "version": "1.0.0",
  "description": "Rental Management PWA with Firebase",
  "scripts": {
    "mcp:start": "mcp-server start",
    "mcp:test": "mcp-server test",
    "mcp:setup": "./scripts/setup-mcp.sh",
    "firebase:init": "firebase init",
    "firebase:deploy": "firebase deploy",
    "firebase:emulators": "firebase emulators:start"
  },
  "devDependencies": {
    "firebase-tools": "^13.0.0"
  }
}
EOF
else
    echo "✅ package.json already exists"
fi

echo ""
echo "🎉 MCP setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Run 'firebase login' to authenticate with Firebase"
echo "2. Run 'firebase init' to initialize your Firebase project"
echo "3. Run 'npm run mcp:start' to start MCP servers"
echo "4. Configure Cursor to use the MCP configuration"
echo ""
echo "📚 Documentation: projectRequirements/mcpConfiguration.md"
echo "⚙️ Configuration: mcp-config.json"
echo "🔧 Environment: .env.mcp"
