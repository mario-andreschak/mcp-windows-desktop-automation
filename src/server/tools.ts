import { McpServer, type CallToolResult, type GetPromptResult, type ServerContext } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { DesktopRuntime, NativeError } from '../native/runtime.js';
export class ToolRegistry {
  private readonly active = new Map<string | number, AbortController>();
  constructor(readonly server: McpServer, readonly runtime: DesktopRuntime, private readonly timeoutMs = 30000) {
    server.server.setNotificationHandler('notifications/cancelled', notification => {
      const id = notification.params?.requestId;
      if (id !== undefined) this.active.get(id)?.abort();
    });
    server.server.onclose = () => { for (const controller of this.active.values()) controller.abort(); };
  }
  async execute<T>(ctx: ServerContext, callback: () => Promise<T>): Promise<T> {
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, ctx.mcpReq.signal, AbortSignal.timeout(this.timeoutMs)]);
    this.active.set(ctx.mcpReq.id, controller);
    try { return await this.runtime.run(signal, callback); }
    finally { this.active.delete(ctx.mcpReq.id); }
  }
  tool<S extends z.ZodRawShape>(name: string, shape: S, callback: (args: z.output<z.ZodObject<S>>) => Promise<CallToolResult>): void {
    const readOnly = name === 'takeScreenshot' || /^(mouseGet|clipGet|win(Get|Exists|Active$|Wait)|controlGet|process(Exists|Wait))/.test(name);
    this.server.registerTool(name, {
      description: 'Windows AutoIt ' + name + '. Requires a trusted owner and an interactive Windows x64 desktop.',
      inputSchema: z.object(shape),
      annotations: { readOnlyHint: readOnly, destructiveHint: !readOnly, idempotentHint: readOnly, openWorldHint: true }
    }, async (args, ctx) => {
      try { return await this.execute(ctx, () => callback(args)); }
      catch (error) { return { isError: true, content: [{ type: 'text', text: error instanceof NativeError ? error.message : 'Desktop operation failed.' }] }; }
    });
  }
  prompt<S extends z.ZodRawShape>(name: string, shape: S, callback: (args: z.output<z.ZodObject<S>>) => GetPromptResult): void {
    this.server.registerPrompt(name, { argsSchema: z.object(shape) }, callback);
  }
}
