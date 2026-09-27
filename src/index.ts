#!/usr/bin/env node
import { DesktopServer } from './server/server.js';
import { log } from './utils/logger/logger.js';
export function parseArgs(args: readonly string[]): { transport: 'stdio' | 'streamable-http'; port?: number; host?: string } {
  const options: { transport: 'stdio' | 'streamable-http'; port?: number; host?: string } = { transport: 'stdio' };
  for (const arg of args) {
    if (arg === '--verbose') { log.setLevel(0); continue; }
    if (arg === '--transport=stdio') { options.transport = 'stdio'; continue; }
    if (arg === '--transport=streamable-http' || arg === '--transport=http') { options.transport = 'streamable-http'; continue; }
    if (/^--port=\d+$/.test(arg)) { options.port = Number(arg.slice(7)); if (options.port < 1 || options.port > 65535) throw new Error('Invalid port'); continue; }
    if (arg.startsWith('--host=') && arg.slice(7)) { options.host = arg.slice(7); continue; }
    throw new Error('Unsupported argument. Use --transport=stdio or --transport=streamable-http, --port=1..65535, --host=ADDRESS, --verbose. The former WebSocket placeholder is removed.');
  }
  return options;
}
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help')) { process.stdout.write('mcp-windows-desktop-automation --transport=stdio|streamable-http [--port=3000] [--host=127.0.0.1] [--verbose]\nHTTP requires MCP_AUTH_TOKEN (32+ characters) and MCP_FILE_ROOTS (JSON array).\n'); return; }
  const server = new DesktopServer({
    ...parseArgs(args), authToken: process.env.MCP_AUTH_TOKEN,
    fileRoots: process.env.MCP_FILE_ROOTS ? JSON.parse(process.env.MCP_FILE_ROOTS) : undefined,
    allowedHosts: process.env.MCP_ALLOWED_HOSTS?.split(',').filter(Boolean),
    allowedOrigins: process.env.MCP_ALLOWED_ORIGINS?.split(',').filter(Boolean)
  });
  for (const signal of ['SIGINT','SIGTERM'] as const) process.once(signal, () => { void server.stop(); });
  await server.start();
}
main().catch(error => { log.error(error instanceof Error && /^(HTTP requires|Unsupported argument|Invalid port|Invalid MCP_|MCP_FILE_ROOTS)/.test(error.message) ? error.message : 'Desktop server startup failed.'); process.exitCode = 1; });
