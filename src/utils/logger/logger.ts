// Protocol stdout is exclusively owned by the MCP transport. Never log arguments.
class Logger {
  private verboseEnabled = false;
  setLevel(level: number): void { this.verboseEnabled = level === 0; }
  verbose(message: string, _data?: unknown): void { if (this.verboseEnabled) this.info(message); }
  debug(message: string, _data?: unknown): void { if (this.verboseEnabled) this.info(message); }
  info(message: string, _data?: unknown): void { process.stderr.write(message.replace(/[\r\n]/g, ' ').slice(0, 200) + '\n'); }
  warn(message: string, _data?: unknown): void { this.info(message); }
  error(message: string, _data?: unknown): void { this.info(message); }
}
export const log = new Logger();
