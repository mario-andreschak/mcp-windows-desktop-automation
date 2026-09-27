/**
 * Control-related tools for MCP Windows Desktop Automation
 */

import { autoIt } from '../native/runtime.js';
import { z } from 'zod';
import { ToolRegistry as McpServer } from '../server/tools.js';
import { createToolResponse, createErrorResponse, schemas } from '../utils/types.js';
import { log } from '../utils/logger/logger.js';

/**
 * Register control-related tools with the MCP server
 */
export function registerControlTools(server: McpServer): void {
  // controlClick - Click on a control
  server.tool(
    'controlClick',
    {
      title: schemas.windowTitle,
      text: schemas.windowText,
      control: schemas.controlName,
      button: schemas.mouseButton,
      clicks: schemas.mouseClicks,
      x: z.number().int().min(-2147483648).max(2147483647).optional().describe('X coordinate within control'),
      y: z.number().int().min(-2147483648).max(2147483647).optional().describe('Y coordinate within control')
    },
    async ({ title, text, control, button, clicks, x, y }) => {
      try {
        log.verbose('controlClick called', { title, text, control, button, clicks, x, y });
        await autoIt.init();
        const result = await autoIt.controlClick(title, text, control, button, clicks, x, y);
        const success = result === 1;
        return createToolResponse(
          success
            ? `Clicked on control "${control}" in window "${title}"`
            : `Failed to click on control "${control}" in window "${title}"`, !success
        );
      } catch (error) {
        log.error('controlClick failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // controlClickByHandle - Click on a control by handle
  server.tool(
    'controlClickByHandle',
    {
      windowHandle: schemas.handle,
      controlHandle: schemas.handle,
      button: schemas.mouseButton,
      clicks: schemas.mouseClicks,
      x: z.number().int().min(-2147483648).max(2147483647).optional().describe('X coordinate within control'),
      y: z.number().int().min(-2147483648).max(2147483647).optional().describe('Y coordinate within control')
    },
    async ({ windowHandle, controlHandle, button, clicks, x, y }) => {
      try {
        log.verbose('controlClickByHandle called', { windowHandle, controlHandle, button, clicks, x, y });
        await autoIt.init();
        const result = await autoIt.controlClickByHandle(windowHandle, controlHandle, button, clicks, x, y);
        const success = result === 1;
        return createToolResponse(
          success
            ? `Clicked on control handle ${controlHandle} in window handle ${windowHandle}`
            : `Failed to click on control handle ${controlHandle} in window handle ${windowHandle}`, !success
        );
      } catch (error) {
        log.error('controlClickByHandle failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // controlCommand - Send a command to a control
  server.tool(
    'controlCommand',
    {
      title: schemas.windowTitle,
      text: schemas.windowText,
      control: schemas.controlName,
      command: z.string().max(65535).describe('Command to send'),
      extra: z.string().max(65535).optional().describe('Extra parameter for the command'),
      bufSize: schemas.bufferSize
    },
    async ({ title, text, control, command, extra, bufSize }) => {
      try {
        log.verbose('controlCommand called', { title, text, control, command, extra, bufSize });
        await autoIt.init();
        const result = await autoIt.controlCommand(title, text, control, command, extra, bufSize);
        log.verbose('controlCommand result', JSON.stringify({ result }));
        return createToolResponse(`Command "${command}" sent to control "${control}" with result: ${result}`);
      } catch (error) {
        log.error('controlCommand failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // controlGetText - Get text from a control
  server.tool(
    'controlGetText',
    {
      title: schemas.windowTitle,
      text: schemas.windowText,
      control: schemas.controlName,
      bufSize: schemas.bufferSize
    },
    async ({ title, text, control, bufSize }) => {
      try {
        log.verbose('controlGetText called', { title, text, control, bufSize });
        await autoIt.init();
        const controlText = await autoIt.controlGetText(title, text, control, bufSize);
        log.verbose('controlGetText result', JSON.stringify({ controlText }));
        return createToolResponse(`Text from control "${control}": "${controlText}"`);
      } catch (error) {
        log.error('controlGetText failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // controlSetText - Set text in a control
  server.tool(
    'controlSetText',
    {
      title: schemas.windowTitle,
      text: schemas.windowText,
      control: schemas.controlName,
      controlText: schemas.controlText
    },
    async ({ title, text, control, controlText }) => {
      try {
        log.verbose('controlSetText called', { title, text, control, controlText });
        await autoIt.init();
        const result = await autoIt.controlSetText(title, text, control, controlText);
        const success = result === 1;
        return createToolResponse(
          success
            ? `Text set in control "${control}" to "${controlText}"`
            : `Failed to set text in control "${control}"`, !success
        );
      } catch (error) {
        log.error('controlSetText failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // controlSend - Send keystrokes to a control
  server.tool(
    'controlSend',
    {
      title: schemas.windowTitle,
      text: schemas.windowText,
      control: schemas.controlName,
      sendText: schemas.controlText,
      mode: z.number().int().min(-2147483648).max(2147483647).optional().describe('Send mode flag')
    },
    async ({ title, text, control, sendText, mode }) => {
      try {
        log.verbose('controlSend called', { title, text, control, sendText, mode });
        await autoIt.init();
        const result = await autoIt.controlSend(title, text, control, sendText, mode);
        const success = result === 1;
        return createToolResponse(
          success
            ? `Keystrokes "${sendText}" sent to control "${control}"`
            : `Failed to send keystrokes to control "${control}"`, !success
        );
      } catch (error) {
        log.error('controlSend failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // controlFocus - Set focus to a control
  server.tool(
    'controlFocus',
    {
      title: schemas.windowTitle,
      text: schemas.windowText,
      control: schemas.controlName
    },
    async ({ title, text, control }) => {
      try {
        log.verbose('controlFocus called', { title, text, control });
        await autoIt.init();
        const result = await autoIt.controlFocus(title, text, control);
        const success = result === 1;
        return createToolResponse(
          success
            ? `Focus set to control "${control}"`
            : `Failed to set focus to control "${control}"`, !success
        );
      } catch (error) {
        log.error('controlFocus failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // controlGetHandle - Get a control handle
  server.tool(
    'controlGetHandle',
    {
      windowHandle: schemas.handle,
      control: schemas.controlName
    },
    async ({ windowHandle, control }) => {
      try {
        log.verbose('controlGetHandle called', { windowHandle, control });
        await autoIt.init();
        const handle = await autoIt.controlGetHandle(windowHandle, control);
        log.verbose('controlGetHandle result', JSON.stringify({ handle }));
        return createToolResponse(`Control "${control}" handle: ${handle}`);
      } catch (error) {
        log.error('controlGetHandle failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // controlGetPos - Get control position and size
  server.tool(
    'controlGetPos',
    {
      title: schemas.windowTitle,
      text: schemas.windowText,
      control: schemas.controlName
    },
    async ({ title, text, control }) => {
      try {
        log.verbose('controlGetPos called', { title, text, control });
        await autoIt.init();
        const rect = await autoIt.controlGetPos(title, text, control);
        log.verbose('controlGetPos result', JSON.stringify(rect));
        const width = rect.right - rect.left;
        const height = rect.bottom - rect.top;
        return createToolResponse(
          `Control "${control}" position: Left=${rect.left}, Top=${rect.top}, Width=${width}, Height=${height}`
        );
      } catch (error) {
        log.error('controlGetPos failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // controlMove - Move and resize a control
  server.tool(
    'controlMove',
    {
      title: schemas.windowTitle,
      text: schemas.windowText,
      control: schemas.controlName,
      x: z.number().int().min(-2147483648).max(2147483647).describe('X coordinate'),
      y: z.number().int().min(-2147483648).max(2147483647).describe('Y coordinate'),
      width: z.number().int().min(-2147483648).max(2147483647).optional().describe('Control width'),
      height: z.number().int().min(-2147483648).max(2147483647).optional().describe('Control height')
    },
    async ({ title, text, control, x, y, width, height }) => {
      try {
        log.verbose('controlMove called', { title, text, control, x, y, width, height });
        await autoIt.init();
        const result = await autoIt.controlMove(title, text, control, x, y, width, height);
        const success = result === 1;
        const sizeInfo = width && height ? ` and resized to ${width}x${height}` : '';
        return createToolResponse(
          success
            ? `Control "${control}" moved to (${x}, ${y})${sizeInfo}`
            : `Failed to move control "${control}"`, !success
        );
      } catch (error) {
        log.error('controlMove failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // controlShow - Show a control
  server.tool(
    'controlShow',
    {
      title: schemas.windowTitle,
      text: schemas.windowText,
      control: schemas.controlName
    },
    async ({ title, text, control }) => {
      try {
        log.verbose('controlShow called', { title, text, control });
        await autoIt.init();
        const result = await autoIt.controlShow(title, text, control);
        const success = result === 1;
        return createToolResponse(
          success
            ? `Control "${control}" shown`
            : `Failed to show control "${control}"`, !success
        );
      } catch (error) {
        log.error('controlShow failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );

  // controlHide - Hide a control
  server.tool(
    'controlHide',
    {
      title: schemas.windowTitle,
      text: schemas.windowText,
      control: schemas.controlName
    },
    async ({ title, text, control }) => {
      try {
        log.verbose('controlHide called', { title, text, control });
        await autoIt.init();
        const result = await autoIt.controlHide(title, text, control);
        const success = result === 1;
        return createToolResponse(
          success
            ? `Control "${control}" hidden`
            : `Failed to hide control "${control}"`, !success
        );
      } catch (error) {
        log.error('controlHide failed', error);
        return createErrorResponse(error instanceof Error ? error : String(error));
      }
    }
  );
}
