/**
 * Window-related tools for MCP Windows Desktop Automation
 */

import { autoIt } from '../native/runtime.js';
import { z } from 'zod';
import { ToolRegistry as McpServer } from '../server/tools.js';
import { createToolResponse, createErrorResponse, schemas } from '../utils/types.js';
import { log } from '../utils/logger/logger.js';

/**
 * Register window-related tools with the MCP server
 */
export function registerWindowTools(server: McpServer): void {
  // winActivate - Activate a window
  server.tool(
    'winActivate',
    {
      title: schemas.windowTitle,
      text: schemas.windowText
    },
    async ({ title, text }) => {
      try {
        log.verbose('winActivate called', { title, text });
        await autoIt.init();
        const result = await autoIt.winActivate(title, text);
        return createToolResponse(`Window "${title}" activated with result: ${result}`);
      } catch (error) {
        log.error('winActivate failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // winActivateByHandle - Activate a window by handle
  server.tool(
    'winActivateByHandle',
    {
      handle: schemas.handle
    },
    async ({ handle }) => {
      try {
        log.verbose('winActivateByHandle called', { handle });
        await autoIt.init();
        const result = await autoIt.winActivateByHandle(handle);
        return createToolResponse(`Window with handle ${handle} activated with result: ${result}`);
      } catch (error) {
        log.error('winActivateByHandle failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // winActive - Check if a window is active
  server.tool(
    'winActive',
    {
      title: schemas.windowTitle,
      text: z.string().max(65535).describe('Window text')
    },
    async ({ title, text }) => {
      try {
        log.verbose('winActive called', { title, text });
        await autoIt.init();
        const result = await autoIt.winActive(title, text);
        const isActive = result === 1;
        return createToolResponse(`Window "${title}" is ${isActive ? 'active' : 'not active'}`);
      } catch (error) {
        log.error('winActive failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // winClose - Close a window
  server.tool(
    'winClose',
    {
      title: schemas.windowTitle,
      text: schemas.windowText
    },
    async ({ title, text }) => {
      try {
        log.verbose('winClose called', { title, text });
        await autoIt.init();
        const result = await autoIt.winClose(title, text);
        return createToolResponse(`Window "${title}" closed with result: ${result}`);
      } catch (error) {
        log.error('winClose failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // winExists - Check if a window exists
  server.tool(
    'winExists',
    {
      title: schemas.windowTitle,
      text: schemas.windowText
    },
    async ({ title, text }) => {
      try {
        log.verbose('winExists called', { title, text });
        await autoIt.init();
        const result = await autoIt.winExists(title, text);
        const exists = result === 1;
        return createToolResponse(`Window "${title}" ${exists ? 'exists' : 'does not exist'}`);
      } catch (error) {
        log.error('winExists failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // winGetHandle - Get a window handle
  server.tool(
    'winGetHandle',
    {
      title: schemas.windowTitle,
      text: schemas.windowText
    },
    async ({ title, text }) => {
      try {
        log.verbose('winGetHandle called', { title, text });
        await autoIt.init();
        const handle = await autoIt.winGetHandle(title, text);
        log.verbose('winGetHandle result', JSON.stringify({ handle }));
        return createToolResponse(`Window "${title}" handle: ${handle}`);
      } catch (error) {
        log.error('winGetHandle failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // winGetPos - Get window position and size
  server.tool(
    'winGetPos',
    {
      title: schemas.windowTitle,
      text: schemas.windowText
    },
    async ({ title, text }) => {
      try {
        log.verbose('winGetPos called', { title, text });
        await autoIt.init();
        const rect = await autoIt.winGetPos(title, text);
        log.verbose('winGetPos result', JSON.stringify(rect));
        const width = rect.right - rect.left;
        const height = rect.bottom - rect.top;
        return createToolResponse(
          `Window "${title}" position: Left=${rect.left}, Top=${rect.top}, Width=${width}, Height=${height}`
        );
      } catch (error) {
        log.error('winGetPos failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // winGetText - Get window text
  server.tool(
    'winGetText',
    {
      title: schemas.windowTitle,
      text: schemas.windowText,
      bufSize: schemas.bufferSize
    },
    async ({ title, text, bufSize }) => {
      try {
        log.verbose('winGetText called', { title, text, bufSize });
        await autoIt.init();
        const windowText = await autoIt.winGetText(title, text, bufSize);
        log.verbose('winGetText result', JSON.stringify({ windowText }));
        return createToolResponse(`Window "${title}" text: "${windowText}"`);
      } catch (error) {
        log.error('winGetText failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // winGetTitle - Get window title
  server.tool(
    'winGetTitle',
    {
      title: schemas.windowTitle,
      text: schemas.windowText,
      bufSize: schemas.bufferSize
    },
    async ({ title, text, bufSize }) => {
      try {
        log.verbose('winGetTitle called', { title, text, bufSize });
        await autoIt.init();
        const windowTitle = await autoIt.winGetTitle(title, text, bufSize);
        log.verbose('winGetTitle result', JSON.stringify({ windowTitle }));
        return createToolResponse(`Window "${title}" title: "${windowTitle}"`);
      } catch (error) {
        log.error('winGetTitle failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // winMove - Move and resize a window
  server.tool(
    'winMove',
    {
      title: schemas.windowTitle,
      text: schemas.windowText,
      x: z.number().int().min(-2147483648).max(2147483647).describe('X coordinate'),
      y: z.number().int().min(-2147483648).max(2147483647).describe('Y coordinate'),
      width: z.number().int().min(-2147483648).max(2147483647).optional().describe('Window width'),
      height: z.number().int().min(-2147483648).max(2147483647).optional().describe('Window height')
    },
    async ({ title, text, x, y, width, height }) => {
      try {
        log.verbose('winMove called', { title, text, x, y, width, height });
        await autoIt.init();
        const result = await autoIt.winMove(title, text, x, y, width, height);
        const sizeInfo = width && height ? ` and resized to ${width}x${height}` : '';
        return createToolResponse(`Window "${title}" moved to (${x}, ${y})${sizeInfo} with result: ${result}`);
      } catch (error) {
        log.error('winMove failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // winSetState - Set window state (minimized, maximized, etc.)
  server.tool(
    'winSetState',
    {
      title: schemas.windowTitle,
      text: schemas.windowText,
      flags: z.number().int().min(-2147483648).max(2147483647).describe('State flags')
    },
    async ({ title, text, flags }) => {
      try {
        log.verbose('winSetState called', { title, text, flags });
        await autoIt.init();
        const result = await autoIt.winSetState(title, text, flags);
        return createToolResponse(`Window "${title}" state set to ${flags} with result: ${result}`);
      } catch (error) {
        log.error('winSetState failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // winWait - Wait for a window to exist
  server.tool(
    'winWait',
    {
      title: schemas.windowTitle,
      text: schemas.windowText,
      timeout: z.number().int().min(1).max(25).default(10).describe('Timeout in seconds (1-25; default 10)')
    },
    async ({ title, text, timeout }) => {
      try {
        log.verbose('winWait called', { title, text, timeout });
        await autoIt.init();
        const result = await autoIt.winWait(title, text, timeout);
        const success = result === 1;
        return createToolResponse(
          success
            ? `Window "${title}" appeared within the timeout`
            : `Window "${title}" did not appear within the timeout`, !success
        );
      } catch (error) {
        log.error('winWait failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // winWaitActive - Wait for a window to be active
  server.tool(
    'winWaitActive',
    {
      title: schemas.windowTitle,
      text: schemas.windowText,
      timeout: z.number().int().min(1).max(25).default(10).describe('Timeout in seconds (1-25; default 10)')
    },
    async ({ title, text, timeout }) => {
      try {
        log.verbose('winWaitActive called', { title, text, timeout });
        await autoIt.init();
        const result = await autoIt.winWaitActive(title, text, timeout);
        const success = result === 1;
        return createToolResponse(
          success
            ? `Window "${title}" became active within the timeout`
            : `Window "${title}" did not become active within the timeout`, !success
        );
      } catch (error) {
        log.error('winWaitActive failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // winWaitClose - Wait for a window to close
  server.tool(
    'winWaitClose',
    {
      title: schemas.windowTitle,
      text: schemas.windowText,
      timeout: z.number().int().min(1).max(25).default(10).describe('Timeout in seconds (1-25; default 10)')
    },
    async ({ title, text, timeout }) => {
      try {
        log.verbose('winWaitClose called', { title, text, timeout });
        await autoIt.init();
        const result = await autoIt.winWaitClose(title, text, timeout);
        const success = result === 1;
        return createToolResponse(
          success
            ? `Window "${title}" closed within the timeout`
            : `Window "${title}" did not close within the timeout`, !success
        );
      } catch (error) {
        log.error('winWaitClose failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );
}
