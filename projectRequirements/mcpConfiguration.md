# MCP (Model Context Protocol) Configuration

**Version:** 1.0  
**Date:** 15 Sep 2025  
**Owner:** Arno Jansen van Renesburg  

---

## 1. Overview

This document outlines the MCP servers and tools we'll use for the Rental Management Application development. MCP servers provide powerful capabilities for browser automation, Firebase management, database operations, and development workflows.

---

## 2. Required MCP Servers

### 2.1 Browser MCP Server
**Purpose**: Browser automation, testing, and web scraping
**Use Cases**:
- E2E testing with Playwright
- Automated browser interactions
- Screenshot capture for documentation
- Web scraping for data migration
- Performance testing

**Configuration**:
```json
{
  "mcpServers": {
    "browser": {
      "command": "browser-mcp",
      "args": []
    }
  }
}
```

**Installation**: Install the Browser MCP extension in your browser and configure it in Cursor.

### 2.2 Firebase MCP Server
**Purpose**: Firebase project management and operations
**Use Cases**:
- Firestore database operations
- Firebase Authentication management
- Cloud Functions deployment
- Firebase Hosting management
- Storage operations
- Security rules management
- Firebase Data Connect schema management
- Cloud Messaging operations
- Crashlytics monitoring

**Configuration**:
```json
{
  "mcpServers": {
    "firebase": {
      "command": "npx",
      "args": ["-y", "firebase-tools@latest", "experimental:mcp"]
    }
  }
}
```

**Installation**: The Firebase MCP server is part of the official Firebase CLI tools and uses the same credentials as your Firebase CLI.

### 2.3 Additional MCP Servers (Optional)

For additional functionality, you can add other MCP servers as needed:

**Filesystem MCP Server** - For file system operations
**Database MCP Server** - For advanced database operations
**Git MCP Server** - For version control operations

These can be added to the configuration as needed for specific development workflows.

---

## 3. Development Workflow Integration

### 3.1 Project Setup
```bash
# Install Firebase CLI (includes MCP server)
npm install -g firebase-tools

# Install Browser MCP extension in your browser
# Visit browsermcp.io for installation instructions

# Initialize Firebase project
firebase init

# Login to Firebase
firebase login
```

### 3.2 MCP Client Configuration
```json
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
```

---

## 4. Use Cases and Examples

### 4.1 Browser Automation for Testing
```typescript
// E2E test example using Browser MCP
const testPaymentCreation = async () => {
  // Navigate to payment form
  await browser.navigate('http://localhost:3000/payments/new');
  
  // Fill form fields
  await browser.fill('[data-testid="room-select"]', 'Room 101');
  await browser.fill('[data-testid="amount-input"]', '1500');
  await browser.select('[data-testid="method-select"]', 'cash');
  
  // Submit form
  await browser.click('[data-testid="submit-button"]');
  
  // Verify success
  await browser.waitForSelector('[data-testid="success-message"]');
  const message = await browser.getText('[data-testid="success-message"]');
  expect(message).toContain('Payment created successfully');
};
```

### 4.2 Firebase Operations
```typescript
// Firebase MCP operations
const setupFirebaseProject = async () => {
  // Initialize Firestore collections
  await firebase.createCollection('facilities');
  await firebase.createCollection('rooms');
  await firebase.createCollection('tenants');
  await firebase.createCollection('rentals');
  await firebase.createCollection('payments');
  
  // Set up security rules
  await firebase.updateSecurityRules('firestore.rules');
  
  // Deploy Cloud Functions
  await firebase.deployFunctions();
  
  // Configure hosting
  await firebase.deployHosting();
};
```

### 4.3 Database Seeding
```typescript
// Seed database with sample data
const seedDatabase = async () => {
  // Create sample facilities
  const facilities = [
    {
      id: 'facility-1',
      name: 'Sunset Manor',
      address: '123 Main Street',
      settings: {
        lateFeeAmount: 20,
        lateFeeStartDay: 4,
        childSurcharge: 10
      }
    }
  ];
  
  for (const facility of facilities) {
    await database.createDocument('facilities', facility.id, facility);
  }
  
  // Create sample rooms
  const rooms = [
    {
      id: 'room-101',
      facilityId: 'facility-1',
      roomNumber: '101',
      type: 'single',
      monthlyRent: 1500,
      status: 'available'
    }
  ];
  
  for (const room of rooms) {
    await database.createDocument('rooms', room.id, room);
  }
};
```

---

## 5. Security Considerations

### 5.1 Access Control
- Limit filesystem access to project directory only
- Use Firebase service account keys securely
- Implement proper authentication for MCP servers
- Restrict database operations to development environment

### 5.2 Environment Variables
```bash
# Development environment
export FIREBASE_PROJECT_ID="rental-management-app-dev"
export FIREBASE_REGION="us-central1"
export ALLOWED_PATHS="/Users/arno/Documents/Personal/RMSv3"

# Production environment
export FIREBASE_PROJECT_ID="rental-management-app-prod"
export FIREBASE_REGION="us-central1"
export ALLOWED_PATHS="/Users/arno/Documents/Personal/RMSv3"
```

---

## 6. Integration with Development Tools

### 6.1 Cursor Integration
```json
{
  "mcpServers": {
    "browser": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-browser"]
    },
    "firebase": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-firebase"]
    }
  }
}
```

### 6.2 CI/CD Integration
```yaml
# GitHub Actions workflow
name: MCP Testing
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install MCP servers
        run: |
          npm install -g @modelcontextprotocol/server-browser
          npm install -g @modelcontextprotocol/server-firebase
      - name: Run tests with MCP
        run: npm run test:mcp
```

---

## 7. Troubleshooting

### 7.1 Common Issues
- **Permission errors**: Ensure proper file system permissions
- **Firebase authentication**: Verify service account keys
- **Browser timeout**: Adjust timeout settings for slow networks
- **Port conflicts**: Use different ports for different MCP servers

### 7.2 Debug Configuration
```json
{
  "mcpServers": {
    "browser": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-browser"],
      "env": {
        "DEBUG": "true",
        "BROWSER_HEADLESS": "false",
        "BROWSER_TIMEOUT": "60000"
      }
    }
  }
}
```

---

## 8. Best Practices

### 8.1 Development Workflow
1. Use Browser MCP for E2E testing
2. Use Firebase MCP for deployment automation
3. Use Filesystem MCP for project management
4. Use Database MCP for data operations

### 8.2 Error Handling
- Implement proper error handling for all MCP operations
- Use try-catch blocks for async operations
- Log errors for debugging
- Provide fallback mechanisms

### 8.3 Performance Optimization
- Use headless browser mode for testing
- Implement connection pooling for database operations
- Cache frequently accessed data
- Optimize MCP server configurations

---

*End of MCP Configuration Document*
