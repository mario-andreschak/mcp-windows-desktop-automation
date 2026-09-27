/**
 * Mouse-related tools for MCP Windows Desktop Automation
 */

import { autoIt } from '../native/runtime.js';
import { z } from 'zod';
import { ToolRegistry as McpServer } from '../server/tools.js';
import { createToolResponse, createErrorResponse, schemas } from '../utils/types.js';
import { log } from '../utils/logger/logger.js';

/**
 * Register mouse-related tools with the MCP server
 */
export function registerMouseTools(server: McpServer): void {
  // mouseMove - Move the mouse cursor to the specified coordinates
  server.tool(
    'mouseMove',
    {
      x: schemas.mouseX,
      y: schemas.mouseY,
      speed: schemas.mouseSpeed
    },
    async ({ x, y, speed }) => {
      try {
        log.verbose('mouseMove called', { x, y, speed });
        await autoIt.init();
        const result = await autoIt.mouseMove(x, y, speed);
        return createToolResponse(`Mouse moved to (${x}, ${y}) with result: ${result}`);
      } catch (error) {
        log.error('mouseMove failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // mouseClick - Click the mouse at the current or specified position
  server.tool(
    'mouseClick',
    {
      button: schemas.mouseButton,
      x: schemas.mouseX.optional(),
      y: schemas.mouseY.optional(),
      clicks: schemas.mouseClicks,
      speed: schemas.mouseSpeed
    },
    async ({ button, x, y, clicks, speed }) => {
      try {
        log.verbose('mouseClick called', { button, x, y, clicks, speed });
        await autoIt.init();
        const result = await autoIt.mouseClick(button, x, y, clicks, speed);
        return createToolResponse(`Mouse clicked ${button} button ${clicks} time(s) with result: ${result}`);
      } catch (error) {
        log.error('mouseClick failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // mouseClickDrag - Click and drag the mouse from one position to another
  server.tool(
    'mouseClickDrag',
    {
      button: schemas.mouseButton,
      x1: schemas.mouseX,
      y1: schemas.mouseY,
      x2: schemas.mouseX,
      y2: schemas.mouseY,
      speed: schemas.mouseSpeed
    },
    async ({ button, x1, y1, x2, y2, speed }) => {
      try {
        log.verbose('mouseClickDrag called', { button, x1, y1, x2, y2, speed });
        await autoIt.init();
        const result = await autoIt.mouseClickDrag(button, x1, y1, x2, y2, speed);
        return createToolResponse(`Mouse dragged from (${x1}, ${y1}) to (${x2}, ${y2}) with result: ${result}`);
      } catch (error) {
        log.error('mouseClickDrag failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // mouseDown - Press and hold the specified mouse button
  server.tool(
    'mouseDown',
    {
      button: schemas.mouseButton
    },
    async ({ button }) => {
      try {
        log.verbose('mouseDown called', { button });
        await autoIt.init();
        await autoIt.mouseDown(button);
        return createToolResponse(`Mouse ${button} button pressed down`);
      } catch (error) {
        log.error('mouseDown failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // mouseUp - Release the specified mouse button
  server.tool(
    'mouseUp',
    {
      button: schemas.mouseButton
    },
    async ({ button }) => {
      try {
        log.verbose('mouseUp called', { button });
        await autoIt.init();
        await autoIt.mouseUp(button);
        return createToolResponse(`Mouse ${button} button released`);
      } catch (error) {
        log.error('mouseUp failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // mouseGetPos - Get the current mouse cursor position
  server.tool(
    'mouseGetPos',
    {},
    async () => {
      try {
        log.verbose('mouseGetPos called');
        await autoIt.init();
        const position = await autoIt.mouseGetPos();
        log.verbose('mouseGetPos result', JSON.stringify(position));
        return createToolResponse(`Mouse position: (${position.x}, ${position.y})`);
      } catch (error) {
        log.error('mouseGetPos failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // mouseGetCursor - Get the current mouse cursor type
  server.tool(
    'mouseGetCursor',
    {},
    async () => {
      try {
        log.verbose('mouseGetCursor called');
        await autoIt.init();
        const cursor = await autoIt.mouseGetCursor();
        log.verbose('mouseGetCursor result', JSON.stringify(cursor));
        return createToolResponse(`Mouse cursor type: ${cursor}`);
      } catch (error) {
        log.error('mouseGetCursor failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // mouseWheel - Scroll the mouse wheel
  server.tool(
    'mouseWheel',
    {
      direction: z.enum(['up', 'down']).describe('Scroll direction'),
      clicks: z.number().int().min(-2147483648).max(2147483647).min(1).max(100).describe('Number of clicks to scroll')
    },
    async ({ direction, clicks }) => {
      try {
        log.verbose('mouseWheel called', { direction, clicks });
        await autoIt.init();
        await autoIt.mouseWheel(direction, clicks);
        return createToolResponse(`Mouse wheel scrolled ${direction} ${clicks} click(s)`);
      } catch (error) {
        log.error('mouseWheel failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );
}
