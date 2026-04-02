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
};

let currentLevel: LogLevel = 'info';
let logStream: WriteStream | null = null;
let currentLogPath: string | null = null;

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

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

function formatLine(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString().slice(11, 23);
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
}

function write(level: LogLevel, message: string): void {
  if (!shouldLog(level)) return;

  const line = formatLine(level, message);
  if (logStream) {
    logStream.write(line + '\n');
    return;
  }

  process.stderr.write(line + '\n');
}

export const log = {
  debug(message: string): void {
    write('debug', message);
  },
  info(message: string): void {
    write('info', message);
  },
  warn(message: string): void {
    write('warn', message);
  },
  error(message: string): void {
    write('error', message);
  },
};
