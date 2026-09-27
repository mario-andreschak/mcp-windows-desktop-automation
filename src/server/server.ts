import { McpServer, createMcpHandler } from '@modelcontextprotocol/server';
import { serveStdio, StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { createServer, type Server as HttpServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { realpath, stat } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { log } from '../utils/logger/logger.js';
import { DesktopRuntime } from '../native/runtime.js';
import { ToolRegistry } from './tools.js';
import { registerAllTools } from '../tools/index.js';
import { registerAllPrompts } from '../prompts/index.js';
import { registerAllResources } from '../resources/index.js';
export interface ServerConfig {
 transport: 'stdio' | 'streamable-http'; port?: number; host?: string; authToken?: string;
 fileRoots?: string[]; allowedHosts?: string[]; allowedOrigins?: string[]; requestTimeoutMs?: number; runtime?: DesktopRuntime;
}
export class DesktopServer {
 private httpServer?: HttpServer;
 private httpHandler?: ReturnType<typeof createMcpHandler>;
 private stdioHandle?: ReturnType<typeof serveStdio>;
 private roots: string[] = [];
 private stopping?: Promise<void>;
 private started = false;
 readonly runtime: DesktopRuntime;
 constructor(private readonly config: ServerConfig) { this.runtime = config.runtime ?? new DesktopRuntime(); }
 createMcpServer(): McpServer {
  const server = new McpServer({ name: 'mcp-windows-desktop-automation', version: '2.0.0' });
  const registry = new ToolRegistry(server, this.runtime, this.config.requestTimeoutMs);
  registerAllTools(registry); registerAllPrompts(registry); registerAllResources(server, registry, this.roots);
  return server;
 }
 async start(): Promise<void> {
  if (this.started || this.stopping) throw new Error('Server already started or stopped'); this.started = true;
  const roots = this.config.fileRoots ?? (this.config.transport === 'stdio' ? [process.cwd()] : []);
  if (!Array.isArray(roots) || roots.length > 32 || !roots.every(root => typeof root === 'string')) throw new Error('MCP_FILE_ROOTS must be a JSON array of up to 32 directory paths');
  this.roots = await Promise.all(roots.map(async root => { const resolved = await realpath(root); if (!(await stat(resolved)).isDirectory()) throw new Error('MCP_FILE_ROOTS must contain directories'); return resolved; }));
  if (this.config.transport === 'stdio') {
   this.stdioHandle = serveStdio(() => this.createMcpServer(), { legacy: 'serve', transport: new StdioServerTransport(process.stdin, process.stdout, { maxBufferSize: 1024 * 1024 }), onerror: () => log.error('MCP transport error') });
   process.stdin.once('end', () => { void this.stop(); }); return;
  }
    if (!this.config.authToken || this.config.authToken.length < 32 || /[\r\n]/u.test(this.config.authToken))
      throw new Error('HTTP requires MCP_AUTH_TOKEN of at least 32 characters');
    if (!this.roots.length) throw new Error('HTTP requires MCP_FILE_ROOTS');
    const allowedHosts = new Set(this.config.allowedHosts ?? []);
    const allowedOrigins = new Set(this.config.allowedOrigins ?? []);
    for (const host of allowedHosts)
      if (!/^(\[[a-fA-F0-9:]+\]|[a-zA-Z0-9.-]+)(:[0-9]{1,5})?$/u.test(host)) throw new Error('Invalid MCP_ALLOWED_HOSTS');
    for (const origin of allowedOrigins) {
      const url = new URL(origin);
      if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) throw new Error('Invalid MCP_ALLOWED_ORIGINS');
    }
    this.httpHandler = createMcpHandler(() => this.createMcpServer(), { legacy: 'stateless' });
    const handle = toNodeHandler(this.httpHandler);
    const secret = Buffer.from('Bearer ' + this.config.authToken);
    this.httpServer = createServer(async (req, res) => {
      const reject = (status: number, text: string) => { res.writeHead(status, { 'content-type': 'text/plain' }); res.end(text); };
      res.setHeader('cache-control', 'no-store');
      res.setHeader('x-content-type-options', 'nosniff');
      try {
        for (const name of ['host', 'origin', 'authorization']) {
          let count = 0; for (let i = 0; i < req.rawHeaders.length; i += 2) if (req.rawHeaders[i]?.toLowerCase() === name) count++;
          if (count > 1) return reject(400, 'Duplicate security header');
        }
        const port = this.getHttpPort();
        const localHosts = ['127.0.0.1', 'localhost', '[::1]'].map(host => host + ':' + port);
        if (!allowedHosts.has(req.headers.host ?? '') && !localHosts.includes(req.headers.host ?? '')) return reject(421, 'Invalid Host');
        const origin = req.headers.origin;
        if (origin !== undefined && !allowedOrigins.has(origin) && !localHosts.map(host => 'http://' + host).includes(origin)) return reject(403, 'Invalid Origin');
        const token = Buffer.from(req.headers.authorization ?? '');
        if (token.length !== secret.length || !timingSafeEqual(token, secret)) {
          res.setHeader('www-authenticate', 'Bearer');
          return reject(401, 'Bearer authentication required');
        }
        if (req.url !== '/mcp') return reject(404, 'Use /mcp');
        if (this.stopping) return reject(503, 'Server stopping');
        let parsed: unknown;
        if (req.method === 'POST') {
          if (!(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) return reject(415, 'Expected application/json');
          let size = 0;
          const chunks: Buffer[] = [];
          const deadline = setTimeout(() => req.destroy(), 10000);
          try {
            for await (const chunk of req) {
              size += chunk.length;
              if (size > 1024 * 1024) return reject(413, 'Request too large');
              chunks.push(chunk);
            }
          } finally { clearTimeout(deadline); }
          parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        }
        if (req.headers['mcp-protocol-version'] === '2026-07-28') res.setHeader('MCP-Protocol-Version', '2026-07-28');
        await handle(req, res, parsed);
      } catch {
        if (!res.headersSent) reject(400, 'Invalid request');
        else res.end();
      }
    });
    this.httpServer.headersTimeout = 10000;
    this.httpServer.requestTimeout = 15000;
    this.httpServer.maxConnections = 64;
    await new Promise<void>((resolve, reject) => {
      this.httpServer?.once('error', reject);
      this.httpServer?.listen(this.config.port ?? 3000, this.config.host ?? '127.0.0.1', resolve);
    });
    log.info('Desktop server started with authenticated Streamable HTTP');
  }
  getHttpPort(): number | undefined { return (this.httpServer?.address() as AddressInfo | null)?.port; }
  stop(): Promise<void> {
    this.stopping ??= (async () => {
      await this.runtime.close(); await this.stdioHandle?.close(); await this.httpHandler?.close();
      this.httpServer?.closeAllConnections();
      if (this.httpServer) await new Promise<void>(resolve => this.httpServer?.close(() => resolve()));
    })(); return this.stopping;
  }
}
export async function setupServer(config: ServerConfig): Promise<DesktopServer> { const server = new DesktopServer(config); await server.start(); return server; }
