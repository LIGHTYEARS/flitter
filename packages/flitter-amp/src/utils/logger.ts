// Logging utility — all output goes to stderr since stdout is used for TUI rendering

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

let currentLevel: LogLevel = 'info';

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatMessage(level: LogLevel, message: string, ...args: unknown[]): string {
  const timestamp = new Date().toISOString().slice(11, 23); // HH:mm:ss.SSS
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  const formatted = args.length > 0
    ? `${prefix} ${message} ${args.map(a => JSON.stringify(a)).join(' ')}`
    : `${prefix} ${message}`;
  return formatted;
}

export const log = {
  debug(message: string, ...args: unknown[]): void {
    if (shouldLog('debug')) {
      process.stderr.write(formatMessage('debug', message, ...args) + '\n');
    }
  },

  info(message: string, ...args: unknown[]): void {
    if (shouldLog('info')) {
      process.stderr.write(formatMessage('info', message, ...args) + '\n');
    }
  },

  warn(message: string, ...args: unknown[]): void {
    if (shouldLog('warn')) {
      process.stderr.write(formatMessage('warn', message, ...args) + '\n');
    }
  },

  error(message: string, ...args: unknown[]): void {
    if (shouldLog('error')) {
      process.stderr.write(formatMessage('error', message, ...args) + '\n');
    }
  },
};
