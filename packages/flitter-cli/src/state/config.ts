import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface UserConfig {
  cwd?: string;
  editor?: string;
  logLevel?: LogLevel;
  logRetentionDays?: number;
}

export interface AppConfig {
  cwd: string;
  editor: string;
  logLevel: LogLevel;
  logRetentionDays: number;
}

export function getUserConfigPath(): string {
  return join(homedir(), '.flitter-cli', 'config.json');
}

function loadUserConfig(): UserConfig {
  const configPath = getUserConfigPath();
  if (!existsSync(configPath)) return {};
  try {
    const raw = readFileSync(configPath, 'utf-8');
    return JSON.parse(raw) as UserConfig;
  } catch {
    return {};
  }
}

export function parseArgs(argv: string[]): AppConfig {
  const args = argv.slice(2);
  const userConfig = loadUserConfig();

  let cwd = userConfig.cwd ? resolve(userConfig.cwd) : process.cwd();
  let editor = userConfig.editor || process.env.EDITOR || process.env.VISUAL || 'vi';
  let logLevel: LogLevel = userConfig.logLevel ?? 'info';

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--cwd': {
        const dir = args[++i];
        if (!dir) {
          process.stderr.write('Error: --cwd requires a directory argument\n');
          process.exit(1);
        }
        cwd = resolve(dir);
        break;
      }
      case '--editor': {
        const command = args[++i];
        if (!command) {
          process.stderr.write('Error: --editor requires a command argument\n');
          process.exit(1);
        }
        editor = command;
        break;
      }
      case '--debug':
        logLevel = 'debug';
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        process.stderr.write(`Unknown option: ${args[i]}\n`);
        printHelp();
        process.exit(1);
    }
  }

  return {
    cwd,
    editor,
    logLevel,
    logRetentionDays: userConfig.logRetentionDays ?? 7,
  };
}

function printHelp(): void {
  process.stderr.write(`
flitter-cli — Native flitter CLI scaffold

Usage: flitter-cli [options]

Options:
  --cwd <dir>      Working directory (default: current directory)
  --editor <cmd>   External editor command (default: $EDITOR / $VISUAL / vi)
  --debug          Enable debug logging
  --help, -h       Show help message

Examples:
  flitter-cli
  flitter-cli --cwd /path/to/project
  flitter-cli --editor nvim
  flitter-cli --debug
`);
}
