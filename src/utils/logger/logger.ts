/**
 * Logger utility for MCP Windows Desktop Automation
 */

enum LogLevel {
  VERBOSE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4
}

class Logger {
  private level: LogLevel = LogLevel.INFO;
  private useStderr: boolean = false;

  /**
   * Set the minimum log level
   * @param level The minimum level to log
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Configure logger to use stderr instead of stdout
   * This is important when using stdio transport for MCP
   * @param useStderr Whether to write logs to stderr
   */
  setUseStderr(useStderr: boolean): void {
    this.useStderr = useStderr;
  }

  /**
   * Write log message to appropriate stream
   * @param level Log level
   * @param message The message to log
   * @param data Additional data to log
   */
  private writeLog(level: string, message: string, data?: any): void {
    const logMessage = `[${level}] ${message}${data ? ' ' + (typeof data === 'string' ? data : JSON.stringify(data)) : ''}`;
    
    if (this.useStderr) {
      // Write to stderr to avoid interfering with JSON-RPC on stdout
      process.stderr.write(logMessage + '\n');
    } else {
      // Use console methods for non-stdio transports
      if (level === 'ERROR' || level === 'WARN') {
        console.error(logMessage);
      } else {
        console.log(logMessage);
      }
    }
  }

  /**
   * Log verbose information
   * @param message The message to log
   * @param data Additional data to log (will be JSON stringified)
   */
  verbose(message: string, data?: any): void {
    if (this.level <= LogLevel.VERBOSE) {
      this.writeLog('VERBOSE', message, data);
    }
  }

  /**
   * Log debug information
   * @param message The message to log
   * @param data Additional data to log
   */
  debug(message: string, data?: any): void {
    if (this.level <= LogLevel.DEBUG) {
      this.writeLog('DEBUG', message, data);
    }
  }

  /**
   * Log general information
   * @param message The message to log
   * @param data Additional data to log
   */
  info(message: string, data?: any): void {
    if (this.level <= LogLevel.INFO) {
      this.writeLog('INFO', message, data);
    }
  }

  /**
   * Log warnings
   * @param message The message to log
   * @param data Additional data to log
   */
  warn(message: string, data?: any): void {
    if (this.level <= LogLevel.WARN) {
      this.writeLog('WARN', message, data);
    }
  }

  /**
   * Log errors
   * @param message The message to log
   * @param data Additional data to log
   */
  error(message: string, data?: any): void {
    if (this.level <= LogLevel.ERROR) {
      this.writeLog('ERROR', message, data);
    }
  }
}

export const log = new Logger();
