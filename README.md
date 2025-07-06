# MCP Windows Desktop Automation

A Model Context Protocol (MCP) server for Windows desktop automation using AutoIt.

## Overview

This project provides a TypeScript MCP server that wraps the [node-autoit-koffi](https://www.npmjs.com/package/node-autoit-koffi) package, allowing LLM applications to automate Windows desktop tasks through the MCP protocol.

The server exposes:
- **Tools**: All AutoIt functions as MCP tools
- **Resources**: File access and screenshot capabilities
- **Prompts**: Templates for common automation tasks

## Features

- Full wrapping of all AutoIt functions as MCP tools
- Support for both stdio and WebSocket transports
- File access resources for reading files and directories
- Screenshot resources for capturing the screen or specific windows
- Prompt templates for common automation tasks
- Strict TypeScript typing throughout

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/mcp-windows-desktop-automation.git
cd mcp-windows-desktop-automation

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### Starting the Server

```bash
# Start with stdio transport (default)
npm start

# Start with WebSocket transport
npm start -- --transport=websocket --port=3000

# Enable verbose logging
npm start -- --verbose
```

### Command Line Options

- `--transport=stdio|websocket`: Specify the transport protocol (default: stdio)
- `--port=<number>`: Specify the port for WebSocket transport (default: 3000)
- `--verbose`: Enable verbose logging

## Troubleshooting

### JSON-RPC Communication Issues

If you see "Unexpected token" or "not valid JSON" errors when using MCP clients:

1. **Ensure the project is built**: Run `npm run build` to compile TypeScript
2. **Check configuration**: Make sure your MCP client configuration is correct
3. **Restart the client**: Always restart your MCP client after configuration changes
4. **Check logs**: The server writes logs to stderr, which you can see in your client's developer console

### Logging

When using stdio transport (most MCP clients), all application logs are written to stderr to avoid interfering with the JSON-RPC protocol on stdout. Use the `--verbose` flag for detailed logging:

```bash
# For debugging (if running standalone)
npm start -- --verbose
```

## Tools

The server provides tools for:

- **Mouse operations**: Move, click, drag, etc.
- **Keyboard operations**: Send keystrokes, clipboard operations, etc.
- **Window management**: Find, activate, close, resize windows, etc.
- **Control manipulation**: Interact with UI controls, buttons, text fields, etc.
- **Process management**: Start, stop, and monitor processes
- **System operations**: Shutdown, sleep, etc.

## Resources

The server provides resources for:

- **File access**: Read files and list directories
- **Screenshots**: Capture the screen or specific windows

## Prompts

The server provides prompt templates for:

- **Window interaction**: Find and interact with windows
- **Form filling**: Automate form filling tasks
- **Automation tasks**: Create scripts for repetitive tasks
- **Monitoring**: Wait for specific conditions

## Development

```bash
# Run in development mode
npm run dev

# Lint the code
npm run lint

# Run tests
npm run test
```

## License

MIT