/**
 * Shared type definitions for MCP Windows Desktop Automation
 */

import { z } from 'zod';
import { NativeError } from '../native/runtime.js';
import { CallToolResult, TextContent } from '@modelcontextprotocol/server';

/**
 * Point coordinates
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Rectangle coordinates
 */
export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Standard tool response creator
 */
export function createToolResponse(message: string, isError = false): CallToolResult {
  return {
    ...(isError ? { isError: true } : {}),
    content: [
      {
        type: 'text',
        text: message
      } as TextContent
    ]
  };
}

/**
 * Standard error response creator
 */
export function createErrorResponse(error: Error | string): CallToolResult {
  const errorMessage = error instanceof NativeError ? error.message : 'Desktop operation failed.';
  return {
    content: [
      {
        type: 'text',
        text: `Error: ${errorMessage}`
      } as TextContent
    ],
    isError: true
  };
}

/**
 * Common Zod schemas for tool parameters
 */
export const schemas = {
  // Window identification
  windowTitle: z.string().max(65535).describe('Window title'),
  windowText: z.string().max(65535).optional().describe('Window text'),
  
  // Mouse parameters
  mouseButton: z.enum(['left', 'right', 'middle']).optional().default('left').describe('Mouse button'),
  mouseSpeed: z.number().int().min(-2147483648).max(2147483647).min(1).max(100).optional().default(10).describe('Mouse movement speed (1-100)'),
  mouseX: z.number().int().min(-2147483648).max(2147483647).describe('X coordinate'),
  mouseY: z.number().int().min(-2147483648).max(2147483647).describe('Y coordinate'),
  mouseClicks: z.number().int().min(-2147483648).max(2147483647).min(1).max(100).optional().default(1).describe('Number of clicks'),
  
  // Control parameters
  controlName: z.string().max(65535).describe('Control identifier'),
  controlText: z.string().max(65535).describe('Text to set/send to control'),
  
  // Process parameters
  processName: z.string().max(65535).describe('Process name or executable path'),
  processTimeout: z.number().int().min(1).max(25).default(10).describe('Timeout in seconds (1-25; default 10)'),
  
  // Common parameters
  handle: z.number().int().min(-2147483648).max(2147483647).describe('Window or control handle'),
  bufferSize: z.number().int().min(2).max(65536).optional().describe('Buffer size for string operations')
};
