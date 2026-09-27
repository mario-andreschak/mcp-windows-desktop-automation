/**
 * Keyboard-related tools for MCP Windows Desktop Automation
 */

import { autoIt } from '../native/runtime.js';
import { z } from 'zod';
import { ToolRegistry as McpServer } from '../server/tools.js';
import { createToolResponse, createErrorResponse } from '../utils/types.js';
import { log } from '../utils/logger/logger.js';

/**
 * Register keyboard-related tools with the MCP server
 */
export function registerKeyboardTools(server: McpServer): void {
  // send - Send keystrokes to the active window
  server.tool(
    'send',
    {
      text: z.string().max(65535).describe('Text or keys to send'),
      mode: z.number().int().min(-2147483648).max(2147483647).optional().default(0).describe('Send mode flag')
    },
    async ({ text, mode }) => {
      try {
        log.verbose('send called', { text, mode });
        await autoIt.init();
        await autoIt.send(text, mode);
        return createToolResponse(`Sent keystrokes: "${text}" with mode ${mode}`);
      } catch (error) {
        log.error('send failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // clipGet - Get the text from the clipboard
  server.tool(
    'clipGet',
    {
      bufSize: z.number().int().min(-2147483648).max(2147483647).optional().describe('Buffer size for clipboard content')
    },
    async ({ bufSize }) => {
      try {
        log.verbose('clipGet called', { bufSize });
        await autoIt.init();
        const clipboardContent = await autoIt.clipGet(bufSize);
        log.verbose('clipGet result', JSON.stringify({ clipboardContent }));
        return createToolResponse(`Clipboard content: "${clipboardContent}"`);
      } catch (error) {
        log.error('clipGet failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // clipPut - Put text into the clipboard
  server.tool(
    'clipPut',
    {
      text: z.string().max(65535).describe('Text to put in the clipboard')
    },
    async ({ text }) => {
      try {
        log.verbose('clipPut called', { text });
        await autoIt.init();
        await autoIt.clipPut(text);
        return createToolResponse(`Text set to clipboard: "${text}"`);
      } catch (error) {
        log.error('clipPut failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // autoItSetOption - Set AutoIt options
  server.tool(
    'autoItSetOption',
    {
      option: z.string().max(65535).describe('Option name'),
      value: z.number().int().min(-2147483648).max(2147483647).describe('Option value')
    },
    async ({ option, value }) => {
      try {
        log.verbose('autoItSetOption called', { option, value });
        await autoIt.init();
        const result = await autoIt.autoItSetOption(option, value);
        return createToolResponse(`AutoIt option "${option}" set to ${value} with result: ${result}`);
      } catch (error) {
        log.error('autoItSetOption failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // opt - Alias for autoItSetOption
  server.tool(
    'opt',
    {
      option: z.string().max(65535).describe('Option name'),
      value: z.number().int().min(-2147483648).max(2147483647).describe('Option value')
    },
    async ({ option, value }) => {
      try {
        log.verbose('opt called', { option, value });
        await autoIt.init();
        const result = await autoIt.opt(option, value);
        return createToolResponse(`AutoIt option "${option}" set to ${value} with result: ${result}`);
      } catch (error) {
        log.error('opt failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // toolTip - Display a tooltip
  server.tool(
    'toolTip',
    {
      text: z.string().max(65535).describe('Tooltip text'),
      x: z.number().int().min(-2147483648).max(2147483647).optional().describe('X coordinate'),
      y: z.number().int().min(-2147483648).max(2147483647).optional().describe('Y coordinate')
    },
    async ({ text, x, y }) => {
      try {
        log.verbose('toolTip called', { text, x, y });
        await autoIt.init();
        await autoIt.toolTip(text, x, y);
        const position = x !== undefined && y !== undefined ? ` at position (${x}, ${y})` : '';
        return createToolResponse(`Tooltip displayed: "${text}"${position}`);
      } catch (error) {
        log.error('toolTip failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );
}
