import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { autoIt, currentSignal, NativeError } from './runtime.js';
export const screenshotShape = {
  target: z.enum(['fullscreen', 'window', 'region']).default('fullscreen'),
  windowTitle: z.string().min(1).max(4096).optional(),
  x: z.number().int().min(-32768).max(32767).optional(),
  y: z.number().int().min(-32768).max(32767).optional(),
  width: z.number().int().min(1).max(16384).optional(),
  height: z.number().int().min(1).max(16384).optional()
};
export async function screenshot(input: z.output<z.ZodObject<typeof screenshotShape>>): Promise<string> {
  if (process.platform !== 'win32' || process.arch !== 'x64') throw new NativeError('Screenshots require Windows x64 with an interactive desktop.');
  if (input.target === 'window' && !input.windowTitle) throw new NativeError('windowTitle is required for a window screenshot.');
  if (input.target === 'region' && [input.x,input.y,input.width,input.height].some(value => value === undefined))
    throw new NativeError('A region screenshot requires x, y, width and height.');
  const request: Record<string, unknown> = { ...input };
  if (input.target === 'window') {
    request.handle = await autoIt.winGetHandle(input.windowTitle!);
    if (!request.handle) throw new NativeError('Screenshot window not found.');
  }
  const signal = currentSignal();
  if (signal.aborted) throw new NativeError('Screenshot cancelled.');
  return new Promise<string>((resolve, reject) => {
    const child = spawn(path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', fileURLToPath(new URL('./capture.ps1', import.meta.url))],
      { windowsHide: true, stdio: ['pipe','pipe','pipe'], env: { ...Object.fromEntries(Object.entries(process.env).filter(([name]) => /^(SystemRoot|SystemDrive|WINDIR|ComSpec|PATH|PATHEXT|TEMP|TMP|USERPROFILE|APPDATA|LOCALAPPDATA|ProgramFiles|ProgramFiles\(x86\)|ProgramW6432)$/i.test(name))),
        // Resolve only the built-in modules, without scanning machine/user module stores.
        PSModulePath: path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'Modules') } });
    const chunks: Buffer[] = []; let size = 0; let done = false; let stage = 'startup'; let diagnostic = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      diagnostic = (diagnostic + chunk).slice(-2048);
      for (const match of diagnostic.matchAll(/MCP_CAPTURE_STAGE=(assemblies|compiler|input|bounds|bitmap|capture|encoding|complete)/g)) stage = match[1]!;
    });
    const finish = (error?: NativeError) => {
      if (done) return; done = true;
      signal.removeEventListener('abort', abort); clearTimeout(timer);
      if (error) { child.kill(); reject(error); return; }
      const encoded = Buffer.concat(chunks).toString('ascii').trim();
      const png = Buffer.from(encoded, 'base64');
      if (png.length > 8388608 || png.length < 24 || !png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))
        reject(new NativeError('Screenshot returned invalid or oversized PNG data.'));
      else resolve(encoded);
    };
    const abort = () => finish(new NativeError('Screenshot cancelled or timed out during ' + stage + '.'));
    const timer = setTimeout(abort, 15000);
    signal.addEventListener('abort', abort, { once: true });
    child.stdout.on('data', (chunk: Buffer) => { size += chunk.length; if (size > 12 * 1024 * 1024) finish(new NativeError('Screenshot exceeds byte limit.')); else chunks.push(chunk); });
    child.once('error', () => finish(new NativeError('Windows PowerShell screenshot helper unavailable.')));
    child.once('close', code => finish(code === 0 ? undefined : new NativeError('Screenshot failed; check the interactive desktop and window support.')));
    child.stdin.on('error', () => {});
    child.stdin.end(JSON.stringify(request) + '\n');
  });
}
