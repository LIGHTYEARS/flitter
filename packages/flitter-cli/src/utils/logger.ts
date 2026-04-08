// Logging utility — writes to a log file when TUI is running to avoid corrupting the display.
// Falls back to stderr when no log file is configured (e.g., during tests).

import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
  type WriteStream,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type { LogLevel } from '../state/config';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

let currentLevel: LogLevel = 'info';
let logStream: WriteStream | null = null;
let currentLogPath: string | null = null;
let _logContext: Record<string, unknown> = {};

/**
 * Set the minimum log level. Messages below this level are discarded.
 */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

/**
 * Merge additional key-value pairs into the global log context.
 * Context fields are included in every subsequent structured (NDJSON) log entry.
 */
export function setLogContext(ctx: Record<string, unknown>): void {
  Object.assign(_logContext, ctx);
}

/**
 * Reset the global log context to an empty object.
 */
export function clearLogContext(): void {
  _logContext = {};
}

/**
 * Initialize file-based logging. Must be called before TUI starts.
 * Logs are written to ~/.flitter-cli/logs/flitter-cli-YYYY-MM-DD.log
 * Optionally prunes log files older than the retention period.
 */
export function initLogFile(retentionDays: number = 7): string | null {
  try {
    const logDir = join(homedir(), '.flitter-cli', 'logs');
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }

    pruneOldLogs(logDir, retentionDays);

    const date = new Date().toISOString().slice(0, 10);
    currentLogPath = join(logDir, `flitter-cli-${date}.log`);
    logStream = createWriteStream(currentLogPath, { flags: 'a' });
    logStream.on('error', () => {
      logStream = null;
      currentLogPath = null;
    });
    return currentLogPath;
  } catch {
    logStream = null;
    currentLogPath = null;
    return null;
  }
}

export function getCurrentLogPath(): string | null {
  return currentLogPath;
}

export function closeLogFile(): void {
  if (logStream) {
    logStream.end();
    logStream = null;
  }
}

/**
 * Write a raw NDJSON entry to the log file, bypassing level checks.
 * Used by the tracer for span records and structured error records.
 * Falls back to stderr JSON output if no log file is open.
 */
export function writeEntry(entry: Record<string, unknown>): void {
  const line = JSON.stringify(entry) + '\n';
  if (logStream) {
    logStream.write(line);
  } else {
    process.stderr.write(line);
  }
}

function pruneOldLogs(logDir: string, retentionDays: number): void {
  if (retentionDays <= 0) return;

  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const pattern = /^flitter-cli-(\d{4}-\d{2}-\d{2})\.log$/;

    for (const file of readdirSync(logDir)) {
      const match = file.match(pattern);
      if (match && match[1] < cutoffStr) {
        try {
          unlinkSync(join(logDir, file));
        } catch {
          // Best effort.
        }
      }
    }
  } catch {
    // Log pruning should never block startup.
  }
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

/**
 * Extract a serialisable error descriptor from an Error instance.
 */
function extractError(err: Error): { name: string; message: string; stack?: string } {
  return { name: err.name, message: err.message, stack: err.stack };
}

/**
 * Build a plain-text line for stderr output (no log-file / non-JSON mode).
 */
function formatTextLine(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString().slice(11, 23); // HH:mm:ss.SSS
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
}

/**
 * Build an NDJSON object for file-mode output.
 */
function buildJsonEntry(
  level: LogLevel,
  message: string,
  error?: Error,
  data?: Record<string, unknown>,
): Record<string, unknown> {
  const entry: Record<string, unknown> = {
    kind: 'log',
    ts: new Date().toISOString(),
    level: level.toUpperCase(),
    msg: message,
  };
  if (Object.keys(_logContext).length > 0) {
    entry.ctx = { ..._logContext };
  }
  if (error) {
    entry.err = extractError(error);
  }
  if (data && Object.keys(data).length > 0) {
    entry.data = data;
  }
  return entry;
}

/**
 * Core write routine for debug / info / warn levels.
 * In file mode emits NDJSON; in stderr mode emits human-readable text.
 */
function writeDataLog(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;
  if (logStream) {
    const entry = buildJsonEntry(level, message, undefined, data);
    logStream.write(JSON.stringify(entry) + '\n');
  } else {
    const extra = data && Object.keys(data).length > 0
      ? ` ${JSON.stringify(data)}`
      : '';
    process.stderr.write(formatTextLine(level, message + extra) + '\n');
  }
}

/**
 * Core write routine for error / fatal levels with optional Error extraction.
 *
 * If `error` is an Error instance its name, message, and stack are extracted
 * into the `err` NDJSON field and `context` is treated as `data`.
 * If `error` is a non-Error truthy value it is treated as `data` for
 * backward compatibility with existing call-sites that pass arbitrary args.
 */
function writeErrorLog(
  level: LogLevel,
  message: string,
  error?: Error | unknown,
  context?: Record<string, unknown>,
): void {
  if (!shouldLog(level)) return;

  let err: Error | undefined;
  let data: Record<string, unknown> | undefined;

  if (error instanceof Error) {
    err = error;
    data = context;
  } else if (error !== undefined) {
    data = { value: error, ...context };
  } else {
    data = context;
  }

  if (logStream) {
    const entry = buildJsonEntry(level, message, err, data);
    entry.kind = 'error';
    logStream.write(JSON.stringify(entry) + '\n');
  } else {
    let text = message;
    if (err) {
      text += ` ${err.stack ?? err.message}`;
    } else if (error !== undefined) {
      text += ` ${JSON.stringify(error)}`;
    }
    process.stderr.write(formatTextLine(level, text) + '\n');
  }
}

export const log = {
  /**
   * Log a debug-level message with optional structured data.
   */
  debug(message: string, data?: Record<string, unknown>): void {
    writeDataLog('debug', message, data);
  },

  /**
   * Log an info-level message with optional structured data.
   */
  info(message: string, data?: Record<string, unknown>): void {
    writeDataLog('info', message, data);
  },

  /**
   * Log a warn-level message with optional structured data.
   */
  warn(message: string, data?: Record<string, unknown>): void {
    writeDataLog('warn', message, data);
  },

  /**
   * Log an error-level message with optional Error extraction and context.
   * If `error` is an Error, its stack is extracted; otherwise treated as data.
   */
  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    writeErrorLog('error', message, error, context);
  },

  /**
   * Log a fatal-level message with optional Error extraction and context.
   * Behaves identically to error() but at the highest severity level.
   */
  fatal(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    writeErrorLog('fatal', message, error, context);
  },
};
