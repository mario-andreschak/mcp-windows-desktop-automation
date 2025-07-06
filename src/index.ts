#!/usr/bin/env node

/**
 * MCP Windows Desktop Automation Server
 * 
 * This server provides MCP tools, resources, and prompts for Windows desktop automation
 * using the AutoIt library.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAllTools } from './tools';
import { registerAllResources } from './resources';
import { registerAllPrompts } from './prompts';
import { log } from './utils/logger/logger';

// Parse command line arguments
const args = process.argv.slice(2);
const transportArg = args.find(arg => arg.startsWith('--transport='));
const portArg = args.find(arg => arg.startsWith('--port='));
const verboseArg = args.find(arg => arg === '--verbose');

// Set log level
if (verboseArg) {
  log.setLevel(0); // Verbose
} else {
  log.setLevel(2); // Info
}

// Determine transport type
const transport = transportArg 
  ? transportArg.split('=')[1] 
  : 'stdio';

// Configure logger for stdio transport
if (transport === 'stdio') {
  log.setUseStderr(true); // Write logs to stderr to avoid interfering with JSON-RPC
}

// Determine port for WebSocket transport
const port = portArg 
  ? parseInt(portArg.split('=')[1], 10) 
  : 3000;

// Print startup banner (only for non-stdio transports)
if (transport !== 'stdio') {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║  MCP Windows Desktop Automation Server                     ║');
  console.log('║                                                            ║');
  console.log(`║  Transport: ${transport.padEnd(47)}║`);
  if (transport === 'websocket') {
    console.log(`║  Port: ${port.toString().padEnd(51)}║`);
  }
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
}

// Start the server
async function startServer() {
  try {
    // Create the server without connecting to transport yet
    const server = new McpServer({
      name: 'Windows Desktop Automation',
      version: '1.0.0'
    }, {
      capabilities: {
        tools: {},
        resources: {
          subscribe: true,
          listChanged: true
        },
        prompts: {
          listChanged: true
        }
      }
    });

    // Register all tools, resources, and prompts
    registerAllTools(server);
    registerAllResources(server);
    registerAllPrompts(server);

    // Now connect to the transport
    if (transport === 'stdio') {
      log.info('Using stdio transport');
      const transportInstance = new StdioServerTransport();
      await server.connect(transportInstance);
    } else if (transport === 'websocket') {
      log.info(`Using WebSocket transport on port ${port}`);
      // WebSocket transport setup would go here
      // This is a placeholder for now
      log.error('WebSocket transport not fully implemented yet');
      process.exit(1);
    } else {
      throw new Error(`Unsupported transport: ${transport}`);
    }

    log.info('Server started successfully');
  } catch (error) {
    log.error('Failed to start server', error);
    process.exit(1);
  }
}

// Start the server
startServer();
