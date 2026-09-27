import { spawn, type ChildProcess } from 'node:child_process';
import { AsyncLocalStorage } from 'node:async_hooks';
import { fileURLToPath } from 'node:url';
import type * as AutoIt from 'node-autoit-koffi';

export class NativeError extends Error {}
export type NativeInvoke = (method: string, args: unknown[], signal: AbortSignal) => Promise<unknown>;
const context = new AsyncLocalStorage<{ runtime: DesktopRuntime; signal: AbortSignal }>();
export function currentSignal(): AbortSignal { const value = context.getStore(); if (!value) throw new NativeError('Missing desktop request context.'); return value.signal; }
export const autoIt = new Proxy({}, { get: (_target, method) => (...args: unknown[]) => {
  const value = context.getStore();
  if (!value) return Promise.reject(new NativeError('Missing desktop request context.'));
  if (method === 'init') return Promise.resolve();
  return value.runtime.invoke(String(method), args, value.signal);
}}) as typeof AutoIt;

export class DesktopRuntime {
  private child?: ChildProcess;
  private pending?: { resolve: (value: unknown) => void; reject: (error: Error) => void; id: number };
  private serial: Promise<unknown> = Promise.resolve();
  private waiting = 0;
  private nextId = 0;
  private readonly shutdown = new AbortController();
  constructor(private readonly injected?: NativeInvoke) {}
  get workerPid(): number | undefined { return this.child?.pid; }
  async run<T>(signal: AbortSignal, callback: () => Promise<T>): Promise<T> {
    if (this.shutdown.signal.aborted) throw new NativeError('Desktop server stopped.');
    if (this.waiting >= 16) throw new NativeError('Desktop request queue full; retry later.');
    this.waiting++;
    const combined = AbortSignal.any([signal, this.shutdown.signal]);
    const operation = this.serial.catch(() => {}).then(async () => {
      if (combined.aborted) throw new NativeError('Desktop operation cancelled or timed out.');
      const cancel = () => this.stopWorker();
      combined.addEventListener('abort', cancel, { once: true });
      try { return await context.run({ runtime: this, signal: combined }, callback); }
      finally { combined.removeEventListener('abort', cancel); }
    });
    this.serial = operation;
    try { return await operation; } finally { this.waiting--; }
  }
  async invoke(method: string, args: unknown[], signal: AbortSignal): Promise<unknown> {
    if (signal.aborted) throw new NativeError('Desktop operation cancelled or timed out.');
    if (this.injected) return this.injected(method, args, signal);
    if (process.platform !== 'win32' || process.arch !== 'x64')
      throw new NativeError('Native desktop operations require Windows x64 with an interactive desktop.');
    if (!this.child) {
      const child = spawn(process.execPath, ['--max-old-space-size=128', fileURLToPath(new URL('./worker.js', import.meta.url))], {
        stdio: ['ignore', 'ignore', 'ignore', 'ipc'], windowsHide: true,
        // Never pass the HTTP bearer token or unrelated process credentials to native code.
        env: Object.fromEntries(Object.entries(process.env).filter(([name]) => /^(SystemRoot|SystemDrive|WINDIR|ComSpec|PATH|PATHEXT|TEMP|TMP|USERPROFILE|APPDATA|LOCALAPPDATA|ProgramFiles|ProgramFiles\(x86\)|ProgramW6432)$/i.test(name)))
      });
      this.child = child;
      child.on('message', (message: unknown) => {
        const result = message as { id?: number; ok?: boolean; value?: unknown };
        if (this.child !== child || result.id !== this.pending?.id) return;
        const pending = this.pending; this.pending = undefined;
        if (result.ok) pending?.resolve(result.value);
        else pending?.reject(new NativeError('Native desktop operation failed.'));
      });
      const failed = () => {
        if (this.child !== child) return;
        this.child = undefined;
        this.pending?.reject(new NativeError('Native worker stopped; desktop changes may already have occurred.'));
        this.pending = undefined;
      };
      child.once('error', failed); child.once('exit', failed);
    }
    return new Promise((resolve, reject) => {
      const id = ++this.nextId;
      this.pending = { id, resolve, reject };
      const child = this.child!;
      child.send({ id, method, args }, error => { if (error && this.child === child) this.stopWorker(); });
    });
  }
  private stopWorker(): void {
    const child = this.child; this.child = undefined;
    this.pending?.reject(new NativeError('Desktop operation cancelled or timed out; completed changes are not undone.'));
    this.pending = undefined;
    // Kill only our helper. Applications deliberately launched by run() belong to the caller.
    if (child) { if (child.connected) child.disconnect(); child.kill('SIGKILL'); }
  }
  async close(): Promise<void> { this.shutdown.abort(); this.stopWorker(); await this.serial.catch(() => {}); }
}
