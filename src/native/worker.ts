import * as autoIt from 'node-autoit-koffi';
import { createRequire } from 'node:module';
import path from 'node:path';
// AutoIt calls stay outside the MCP event loop. This private IPC helper is never a public server.
const require = createRequire(import.meta.url);
const koffi = require('koffi');
const allowed = new Set('mouseMove mouseClick mouseClickDrag mouseDown mouseUp mouseGetPos mouseGetCursor mouseWheel send clipGet clipPut autoItSetOption opt toolTip winActivate winActivateByHandle winActive winClose winExists winGetHandle winGetPos winGetText winGetTitle winMove winSetState winWait winWaitActive winWaitClose controlClick controlClickByHandle controlCommand controlGetText controlSetText controlSend controlFocus controlGetHandle controlGetPos controlMove controlShow controlHide run runWait runAs runAsWait processExists processClose processSetPriority processWait processWaitClose shutdown'.split(' '));
// The wrapper auto-grows text buffers without a ceiling. Use the documented AutoIt DLL
// ABI for these five getters, with one fixed UTF-16 buffer and an explicit truncation error.
const dll = koffi.load(path.join(path.dirname(require.resolve('node-autoit-koffi/package.json')), 'dlls', 'AutoItX3_x64.dll'));
const boundedGetters: Record<string, { name: string; types: string[] }> = {
  clipGet: { name: 'AU3_ClipGet', types: [] },
  winGetText: { name: 'AU3_WinGetText', types: ['string16', 'string16'] },
  winGetTitle: { name: 'AU3_WinGetTitle', types: ['string16', 'string16'] },
  controlGetText: { name: 'AU3_ControlGetText', types: ['string16', 'string16', 'string16'] },
  controlCommand: { name: 'AU3_ControlCommand', types: ['string16', 'string16', 'string16', 'string16', 'string16'] }
};
async function invoke(method: string, args: unknown[]): Promise<unknown> {
  const getter = boundedGetters[method];
  if (getter) {
    const size = Math.max(2, Math.min(Number(args[getter.types.length] ?? 65536), 65536));
    const buffer = Buffer.alloc(size * 2);
    const fn = dll.func(getter.name, 'void', [...getter.types, 'uint16_t *', 'int']);
    const parameters = getter.types.map((_, index) => args[index] ?? '');
    await new Promise<void>((resolve, reject) => fn.async(...parameters, buffer, size, (error: Error | null) => error ? reject(error) : resolve()));
    const text = buffer.toString('utf16le').split('\0')[0]!;
    if (text.length >= size - 1) throw new Error('Native text exceeds buffer limit');
    return text;
  }
  const fn = (autoIt as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>)[method];
  return fn!(...args);
}
const initialized = autoIt.init();
process.on('message', async (message: { id: number; method: string; args: unknown[] }) => {
  try {
    await initialized;
    if (!allowed.has(message.method) || !Array.isArray(message.args)) throw new Error('Unsupported');
    // JSON IPC represents undefined array arguments as null; public schemas reject null.
    // Restore optional arguments so the native wrapper applies its documented defaults.
    const value = await invoke(message.method, message.args.map(value => value === null ? undefined : value));
    if (Buffer.byteLength(JSON.stringify(value ?? null)) > 512 * 1024) throw new Error('Output limit');
    process.send?.({ id: message.id, ok: true, value });
  } catch { process.send?.({ id: message.id, ok: false }); }
});
process.on('disconnect', () => process.exit(0));
