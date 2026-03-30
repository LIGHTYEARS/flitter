// CLI configuration — agent command, working directory, theme

import { resolve, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';

interface UserConfig {
  agent?: string;
  editor?: string;
  cwd?: string;
  expandToolCalls?: boolean;
  historySize?: number;
  historyFile?: string;
  sessionRetentionDays?: number;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface AppConfig {
  /** Agent command to spawn (e.g. "claude" or "gemini") */
  agentCommand: string;
  /** Agent command arguments */
  agentArgs: string[];
  /** Working directory for the session */
  cwd: string;
  /** Show all tool call details expanded by default */
  expandToolCalls: boolean;
  /** Log level */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  /** External editor command */
  editor: string;
  /** Maximum prompt history size */
  historySize: number;
  /** Path to the prompt history file */
  historyFile: string;
  /** Days to keep session files (0 = keep forever) */
  sessionRetentionDays: number;
  /** Session ID to resume (null = fresh, 'latest' = most recent, or UUID) */
  resumeSessionId: string | null;
  /** --list-sessions: print and exit */
  listSessions: boolean;
  /** --export <fmt>: export and exit */
  exportFormat: 'json' | 'md' | 'txt' | null;
}

const DEFAULT_AGENT = 'claude';
const DEFAULT_AGENT_ARGS = ['--agent'];

function loadUserConfig(): UserConfig {
  const configPath = join(homedir(), '.flitter-amp', 'config.json');
  if (!existsSync(configPath)) return {};
  try {
    const raw = readFileSync(configPath, 'utf-8');
    return JSON.parse(raw) as UserConfig;
  } catch {
    return {};
  }
}

/**
 * Parse CLI arguments into AppConfig.
 *
 * Usage: flitter-amp [options]
 *   --agent <cmd>     Agent command to spawn (default: claude --agent)
 *   --cwd <dir>       Working directory (default: .)
 *   --expand           Expand tool calls by default
 *   --debug            Enable debug logging
 *   --help             Show help
 */
export function parseArgs(argv: string[]): AppConfig {
  const args = argv.slice(2); // skip bun and script path
  const userConfig = loadUserConfig();

  let agentCommand = DEFAULT_AGENT;
  let agentArgs = [...DEFAULT_AGENT_ARGS];
  let cwd = process.cwd();
  let expandToolCalls = false;
  let logLevel: AppConfig['logLevel'] = 'info';
  let resumeSessionId: string | null = null;
  let listSessions = false;
  let exportFormat: AppConfig['exportFormat'] = null;

  // Apply config file defaults (CLI flags override these below)
  if (userConfig.agent) {
    const parts = userConfig.agent.split(/\s+/);
    agentCommand = parts[0];
    agentArgs = parts.slice(1);
  }
  if (userConfig.cwd) cwd = resolve(userConfig.cwd);
  if (userConfig.expandToolCalls) expandToolCalls = true;
  if (userConfig.logLevel) logLevel = userConfig.logLevel;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--agent': {
        const raw = args[++i];
        if (!raw) {
          process.stderr.write('Error: --agent requires a command argument\n');
          process.exit(1);
        }
        // Parse "command --flag1 --flag2" style
        const parts = raw.split(/\s+/);
        agentCommand = parts[0];
        agentArgs = parts.slice(1);
        break;
      }
      case '--cwd': {
        const dir = args[++i];
        if (!dir) {
          process.stderr.write('Error: --cwd requires a directory argument\n');
          process.exit(1);
        }
        cwd = resolve(dir);
        break;
      }
      case '--expand':
        expandToolCalls = true;
        break;
      case '--debug':
        logLevel = 'debug';
        break;
      case '--resume': {
        const next = args[i + 1];
        if (next && !next.startsWith('--')) {
          resumeSessionId = next;
          i++;
        } else {
          resumeSessionId = 'latest';
        }
        break;
      }
      case '--list-sessions':
        listSessions = true;
        break;
      case '--export': {
        const fmt = args[++i] as AppConfig['exportFormat'];
        if (!fmt || !['json', 'md', 'txt'].includes(fmt)) {
          process.stderr.write('Error: --export requires format: json, md, or txt\n');
          process.exit(1);
        }
        exportFormat = fmt;
        break;
      }
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        // Unknown flags are passed through as agent args
        if (args[i].startsWith('--')) {
          process.stderr.write(`Unknown option: ${args[i]}\n`);
          printHelp();
          process.exit(1);
        }
        break;
    }
  }

  const defaultHistoryFile = join(homedir(), '.flitter', 'prompt_history');

  return {
    agentCommand, agentArgs, cwd, expandToolCalls, logLevel,
    editor: userConfig.editor || process.env.EDITOR || process.env.VISUAL || 'vi',
    historySize: userConfig.historySize ?? 100,
    historyFile: userConfig.historyFile
      ? resolve(userConfig.historyFile)
      : defaultHistoryFile,
    sessionRetentionDays: userConfig.sessionRetentionDays ?? 30,
    resumeSessionId,
    listSessions,
    exportFormat,
  };
}

function printHelp(): void {
  process.stderr.write(`
flitter-amp — ACP Client TUI

Usage: flitter-amp [options]

Options:
  --agent <cmd>    Agent command to spawn (default: "claude --agent")
  --cwd <dir>      Working directory (default: current directory)
  --expand         Expand tool call details by default
  --debug          Enable debug logging
  --resume [id]    Resume the most recent session (or specific session by ID)
  --list-sessions  Print recent sessions and exit
  --export <fmt>   Export last session to file (json, md, or txt) and exit
  --help, -h       Show this help message

Examples:
  flitter-amp                                    # Use claude as agent
  flitter-amp --agent "gemini --experimental-acp"  # Use Gemini CLI
  flitter-amp --agent "codex --agent"              # Use Codex CLI
  flitter-amp --cwd /path/to/project               # Set working directory
  flitter-amp --resume                             # Resume most recent session
  flitter-amp --resume abc123                      # Resume specific session
`);
}
