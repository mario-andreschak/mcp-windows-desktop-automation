import { McpServer, ResourceTemplate, type ReadResourceResult } from '@modelcontextprotocol/server';
import { open, opendir, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ToolRegistry } from '../server/tools.js';
import { screenshot, screenshotShape } from '../native/screenshot.js';
import { NativeError } from '../native/runtime.js';
const MAX_FILE = 1024 * 1024;
export async function readFileResource(uri: URL, roots: readonly string[]): Promise<ReadResourceResult['contents'][number]> {
  if (uri.protocol !== 'file:' || uri.hostname) throw new NativeError('Only local file URIs are supported.');
  let file: string;
  try { file = await realpath(fileURLToPath(uri)); } catch { throw new NativeError('File resource unavailable.'); }
  if (!roots.some(root => { const rel = path.relative(root, file); return rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel)); }))
    throw new NativeError('File resource is outside the configured roots.');
  const info = await stat(file);
  if (info.isDirectory()) {
    const dir = await opendir(file); const entries: string[] = [];
    for await (const entry of dir) { if (entries.length === 1000) throw new NativeError('Directory exceeds 1000 entry limit.'); entries.push(entry.name + (entry.isDirectory() ? '/' : '')); }
    return { uri: uri.href, mimeType: 'text/plain', text: entries.sort().join('\n') };
  }
  if (!info.isFile() || info.size > MAX_FILE) throw new NativeError('File must be regular and at most 1 MiB.');
  const handle = await open(file, 'r');
  try {
    const buffer = Buffer.alloc(MAX_FILE + 1);
    let bytesRead = 0;
    while (bytesRead < buffer.length) {
      const read = await handle.read(buffer, bytesRead, buffer.length - bytesRead, bytesRead);
      if (!read.bytesRead) break;
      bytesRead += read.bytesRead;
    }
    if (bytesRead > MAX_FILE) throw new NativeError('File exceeds 1 MiB.');
    return { uri: uri.href, mimeType: 'application/octet-stream', blob: buffer.subarray(0, bytesRead).toString('base64') };
  } finally { await handle.close(); }
}
export function registerAllResources(server: McpServer, registry: ToolRegistry, roots: readonly string[]): void {
  server.registerResource('file', new ResourceTemplate('file://{+path}', { list: undefined }), { description: 'Local file or directory within configured roots. Maximum 1 MiB or 1000 entries.' },
    async uri => { try { return { contents: [await readFileResource(uri, roots)] }; } catch { throw new Error('File resource unavailable, outside configured roots, or above its size limit.'); } });
  server.registerResource('desktop-screenshot', 'screenshot://desktop', { mimeType: 'image/png', description: 'Actual visible Windows desktop pixels; requires an interactive session.' },
    async (uri, ctx) => ({ contents: [{ uri: uri.href, mimeType: 'image/png', blob: await registry.execute(ctx, () => screenshot({ target: 'fullscreen' })) }] }));
  server.registerResource('window-screenshot', new ResourceTemplate('screenshot://window/{title}', { list: undefined }), { mimeType: 'image/png', description: 'Window PNG using AutoIt title selection and Win32 PrintWindow. Some applications cannot be captured.' },
    async (uri, variables, ctx) => ({ contents: [{ uri: uri.href, mimeType: 'image/png', blob: await registry.execute(ctx, () => screenshot({ target: 'window', windowTitle: decodeURIComponent(String(variables.title)) })) }] }));
  registry.tool('takeScreenshot', screenshotShape, async input => ({ content: [{ type: 'image', mimeType: 'image/png', data: await screenshot(input) }] }));
}
