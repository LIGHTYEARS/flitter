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
