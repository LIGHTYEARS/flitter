/**
 * Structured JSON logging system
 *
 * Provides createLogger factory function that outputs JSON logs to stderr
 *
 * @example
 * ```ts
 * import { createLogger } from '@flitter/util';
 * const log = createLogger('my-module');
 * log.info('Server started', { port: 3000 });
 * const child = log.child({ requestId: '123' });
 * child.debug('Processing request');
 * ```
 */

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  wsMessage(direction: "SEND" | "RECV", clientId: string, data: unknown): void;
  child(context: Record<string, unknown>): Logger;
}

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const VALID_LOG_LEVELS = new Set<string>(["debug", "info", "warn", "error"]);

/**
 * Global minimum log level. Logs below this level are suppressed.
 * Default: "debug" (everything shown). Set to "warn" for quiet mode.
 *
 * Can be overridden by:
 * 1. FLITTER_LOG_LEVEL env var at startup
 * 2. setLogLevel() at runtime
 */
let globalLogLevel: LogLevel = VALID_LOG_LEVELS.has(process.env.FLITTER_LOG_LEVEL ?? "")
  ? (process.env.FLITTER_LOG_LEVEL as LogLevel)
  : "debug";

/**
 * Set the global minimum log level at runtime.
 *
 * @param level - Minimum level to output ("debug", "info", "warn", "error")
 */
export function setLogLevel(level: LogLevel): void {
  globalLogLevel = level;
}

/**
 * Get the current global log level.
 */
export function getLogLevel(): LogLevel {
  return globalLogLevel;
}

class LoggerImpl implements Logger {
  private _name: string;
  private _context: Record<string, unknown>;
  private _output: (line: string) => void;

  constructor(
    name: string,
    context: Record<string, unknown> = {},
    output?: (line: string) => void,
  ) {
    this._name = name;
    this._context = context;
    this._output = output ?? ((line: string) => process.stderr.write(line + "\n"));
  }

  private _log(level: LogLevel, message: string, extra: Record<string, unknown> = {}): void {
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[globalLogLevel]) return;
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      name: this._name,
      message,
      ...this._context,
      ...extra,
    };
    this._output(JSON.stringify(entry));
  }

  debug(message: string, ...args: unknown[]): void {
    this._log("debug", message, args.length > 0 ? { args } : {});
  }
  info(message: string, ...args: unknown[]): void {
    this._log("info", message, args.length > 0 ? { args } : {});
  }
  warn(message: string, ...args: unknown[]): void {
    this._log("warn", message, args.length > 0 ? { args } : {});
  }
  error(message: string, ...args: unknown[]): void {
    this._log("error", message, args.length > 0 ? { args } : {});
  }

  wsMessage(direction: "SEND" | "RECV", clientId: string, data: unknown): void {
    this._log("debug", "WebSocket message", { direction, clientId, data });
  }

  child(context: Record<string, unknown>): Logger {
    return new LoggerImpl(this._name, { ...this._context, ...context }, this._output);
  }
}

export function createLogger(name: string, output?: (line: string) => void): Logger {
  return new LoggerImpl(name, {}, output);
}
