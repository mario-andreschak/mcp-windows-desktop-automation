/**
 * Tools module for MCP Windows Desktop Automation
 */

import { ToolRegistry as McpServer } from '../server/tools.js';
import { registerMouseTools } from './mouse.js';
import { registerKeyboardTools } from './keyboard.js';
import { registerWindowTools } from './window.js';
import { registerProcessTools } from './process.js';
import { registerControlTools } from './control.js';

/**
 * Register all AutoIt tools with the MCP server
 */
export function registerAllTools(server: McpServer): void {
  registerMouseTools(server);
  registerKeyboardTools(server);
  registerWindowTools(server);
  registerProcessTools(server);
  registerControlTools(server);
}
