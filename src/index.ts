#!/usr/bin/env node

/**
 * Cyrano MCP Server - Main Entry Point
 * 
 * This is the main entry point that can run either the MCP server
 * or the HTTP bridge based on environment variables or command line arguments.
 */

import { CyranoMCPServer } from './mcp-server.js';

// Check if running in HTTP bridge mode
const isHttpMode = process.env.CYRANO_MODE === 'http' || 
                  process.argv.includes('--http') ||
                  process.argv.includes('http');

if (isHttpMode) {
  // Import and start HTTP bridge
  import('./http-bridge.js').then(() => {
    console.error('Starting Cyrano MCP Server in HTTP mode');
  }).catch(console.error);
} else {
  // Start MCP server in stdio mode (default)
  const server = new CyranoMCPServer();
  server.run().catch(console.error);
}

// Export for programmatic usage
export { CyranoMCPServer } from './mcp-server.js';
export * from './tools/base-tool.js';