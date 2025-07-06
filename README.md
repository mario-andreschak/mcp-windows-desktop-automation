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

## Claude Desktop Configuration

To use this MCP server with Claude Desktop, you need to add it to your Claude Desktop configuration file.

### Configuration File Location

The Claude Desktop configuration file is located at:
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### Configuration

Add the following configuration to your `claude_desktop_config.json` file:

```json
{
  "mcpServers": {
    "windows-desktop-automation": {
      "command": "node",
      "args": [
        "/path/to/mcp-windows-desktop-automation/dist/index.js"
      ],
      "env": {}
    }
  }
}
```

**Important Notes:**

1. **Build the project first**: Make sure you've run `npm run build` to create the `dist/index.js` file
2. **Update the path**: Replace `/path/to/mcp-windows-desktop-automation/` with the actual path to your cloned repository
3. **Use absolute paths**: Always use absolute paths in the configuration
4. **Path format examples**:
   - **Windows**: `C:\\Users\\YourName\\Projects\\mcp-windows-desktop-automation\\dist\\index.js`
   - **macOS/Linux**: `/home/username/projects/mcp-windows-desktop-automation/dist/index.js`
5. **Restart Claude Desktop**: After updating the configuration, restart Claude Desktop for changes to take effect

### Alternative Configuration (Using npm)

If you prefer to use npm to run the server:

```json
{
  "mcpServers": {
    "windows-desktop-automation": {
      "command": "npm",
      "args": [
        "start"
      ],
      "cwd": "/path/to/mcp-windows-desktop-automation",
      "env": {}
    }
  }
}
```

### Verification

After configuring and restarting Claude Desktop:

1. Start a new conversation
2. Look for the 🔌 icon in the input area, which indicates MCP servers are connected
3. You should be able to ask Claude to help with Windows automation tasks

### Example Usage

Once configured, you can ask Claude things like:
- "Take a screenshot of my desktop"
- "Open Notepad and type some text"
- "Find the Calculator window and close it"
- "Automate clicking a specific button on screen"

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
