import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { cliThemes } from '../themes';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface UserConfig {
  cwd?: string;
  editor?: string;
  logLevel?: LogLevel;
  logRetentionDays?: number;
  /** Anthropic API key (alternative to ANTHROPIC_API_KEY env var). */
  apiKey?: string;
  /** Model identifier override. */
  model?: string;
  /** Theme name (must be a key in cliThemes). */
  theme?: string;
  /** Maximum number of prompt history entries to retain. */
  historySize?: number;
  /** Path to the prompt history file. */
  historyFile?: string;
}

export interface AppConfig {
  cwd: string;
  editor: string;
  logLevel: LogLevel;
  logRetentionDays: number;
  /** API key resolved from config, then ANTHROPIC_API_KEY env var, then null. */
  apiKey: string | null;
  /** Model identifier. Defaults to claude-sonnet-4-20250514. */
  model: string;
  /** Active theme name. Defaults to 'dark'. */
  theme: string;
  /** Maximum number of prompt history entries. Defaults to 100. */
  historySize: number;
  /** Path to the prompt history file. Defaults to ~/.flitter-cli/history. */
  historyFile: string;
  /** Directory for session persistence. Defaults to ~/.flitter-cli/sessions/. */
  sessionDir: string;
  /** Number of days to retain saved sessions. Defaults to 30. */
  sessionRetentionDays: number;
  /** Session ID to resume on startup, or null. */
  resumeSessionId: string | null;
  /** When true, print session list and exit. */
  listSessions: boolean;
  /** When set, export a session to the given format and exit. */
  exportSession: { sessionId: string; format: 'json' | 'md' | 'txt' } | null;
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
  let model = userConfig.model ?? 'claude-sonnet-4-20250514';
  let theme = userConfig.theme ?? 'dark';
  let historySize = userConfig.historySize ?? 100;
  let historyFile = userConfig.historyFile ?? join(homedir(), '.flitter-cli', 'history');
  let sessionDir = join(homedir(), '.flitter-cli', 'sessions');
  let sessionRetentionDays = 30;
  let resumeSessionId: string | null = null;
  let listSessions = false;
  let exportSession: AppConfig['exportSession'] = null;

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
      case '--model': {
        const id = args[++i];
        if (!id) {
          process.stderr.write('Error: --model requires a model identifier argument\n');
          process.exit(1);
        }
        model = id;
        break;
      }
      case '--debug':
        logLevel = 'debug';
        break;
      case '--theme': {
        const name = args[++i];
        if (!name) {
          process.stderr.write('Error: --theme requires a theme name argument\n');
          process.exit(1);
        }
        if (!(name in cliThemes)) {
          const valid = Object.keys(cliThemes).join(', ');
          process.stderr.write(`Warning: unknown theme '${name}', falling back to 'dark'. Valid themes: ${valid}\n`);
          theme = 'dark';
        } else {
          theme = name;
        }
        break;
      }
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      case '--history-size': {
        const n = args[++i];
        if (!n) {
          process.stderr.write('Error: --history-size requires a number argument\n');
          process.exit(1);
        }
        const parsed = Number(n);
        if (!Number.isFinite(parsed) || parsed < 1) {
          process.stderr.write(`Error: --history-size must be a positive integer, got '${n}'\n`);
          process.exit(1);
        }
        historySize = Math.floor(parsed);
        break;
      }
      case '--history-file': {
        const path = args[++i];
        if (!path) {
          process.stderr.write('Error: --history-file requires a path argument\n');
          process.exit(1);
        }
        historyFile = resolve(path);
        break;
      }
      case '--session-dir': {
        const dir = args[++i];
        if (!dir) {
          process.stderr.write('Error: --session-dir requires a directory argument\n');
          process.exit(1);
        }
        sessionDir = resolve(dir);
        break;
      }
      case '--session-retention-days': {
        const n = args[++i];
        if (!n) {
          process.stderr.write('Error: --session-retention-days requires a number argument\n');
          process.exit(1);
        }
        const parsed = Number(n);
        if (!Number.isFinite(parsed) || parsed < 0) {
          process.stderr.write(`Error: --session-retention-days must be a non-negative integer, got '${n}'\n`);
          process.exit(1);
        }
        sessionRetentionDays = Math.floor(parsed);
        break;
      }
      case '--resume': {
        const id = args[i + 1];
        if (id && !id.startsWith('--')) {
          resumeSessionId = id;
          i++;
        } else {
          resumeSessionId = '__most_recent__';
        }
        break;
      }
      case '--list-sessions':
        listSessions = true;
        break;
      case '--export': {
        const fmt = args[++i];
        if (!fmt || !['json', 'md', 'txt'].includes(fmt)) {
          process.stderr.write(`Error: --export requires a format argument (json, md, txt)\n`);
          process.exit(1);
        }
        const sid = args[i + 1];
        if (sid && !sid.startsWith('--')) {
          exportSession = { sessionId: sid, format: fmt as 'json' | 'md' | 'txt' };
          i++;
        } else {
          exportSession = { sessionId: '__most_recent__', format: fmt as 'json' | 'md' | 'txt' };
        }
        break;
      }
      default:
        process.stderr.write(`Unknown option: ${args[i]}\n`);
        printHelp();
        process.exit(1);
    }
  }

  // Resolve API key: config.json -> ANTHROPIC_API_KEY env var -> null
  const apiKey = userConfig.apiKey ?? process.env.ANTHROPIC_API_KEY ?? null;

  return {
    cwd,
    editor,
    logLevel,
    logRetentionDays: userConfig.logRetentionDays ?? 7,
    apiKey,
    model,
    theme,
    historySize,
    historyFile,
    sessionDir,
    sessionRetentionDays,
    resumeSessionId,
    listSessions,
    exportSession,
  };
}

function printHelp(): void {
  process.stderr.write(`
flitter-cli — Native flitter CLI

Usage: flitter-cli [options]

Options:
  --cwd <dir>              Working directory (default: current directory)
  --editor <cmd>           External editor command (default: $EDITOR / $VISUAL / vi)
  --model <id>             Model identifier (default: claude-sonnet-4-20250514)
  --theme <name>           Color theme (default: dark)
                           Valid: dark, light, catppuccin-mocha, solarized-dark,
                                  solarized-light, gruvbox-dark, nord
  --history-size <n>       Max prompt history entries (default: 100)
  --history-file <path>    Prompt history file (default: ~/.flitter-cli/history)
  --session-dir <dir>      Session persistence directory (default: ~/.flitter-cli/sessions/)
  --session-retention-days <n>
                           Days to retain saved sessions (default: 30)
  --resume [id]            Resume a session (most recent if no id given)
  --list-sessions          List saved sessions and exit
  --export <format> [id]   Export session to format (json, md, txt) and exit
  --debug                  Enable debug logging
  --help, -h               Show help message

Environment:
  ANTHROPIC_API_KEY   API key for the Anthropic provider

Examples:
  flitter-cli
  flitter-cli --cwd /path/to/project
  flitter-cli --model claude-sonnet-4-20250514
  flitter-cli --editor nvim --debug
  flitter-cli --resume
  flitter-cli --list-sessions
  flitter-cli --export md
`);
}
