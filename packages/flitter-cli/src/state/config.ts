import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { cliThemes } from '../themes';
import type { ProviderId, ProviderConfig } from '../provider/provider';
import { autoDetectProvider, DEFAULT_MODELS } from '../provider/factory';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface UserConfig {
  cwd?: string;
  editor?: string;
  logLevel?: LogLevel;
  logRetentionDays?: number;
  /** API key (alternative to provider-specific env vars). */
  apiKey?: string;
  /** Provider identifier override (anthropic, openai, openai-compatible, gemini, etc.). */
  provider?: ProviderId;
  /** Model identifier override. */
  model?: string;
  /** Base URL override (for OpenAI-compatible providers). */
  baseUrl?: string;
  /** Theme name (must be a key in cliThemes). */
  theme?: string;
  /** Maximum number of prompt history entries to retain. */
  historySize?: number;
  /** Path to the prompt history file. */
  historyFile?: string;
}

/** Valid targets for the --connect flag (OAuth providers). */
export type ConnectTarget = 'chatgpt' | 'copilot' | 'antigravity';

export interface AppConfig {
  cwd: string;
  editor: string;
  logLevel: LogLevel;
  logRetentionDays: number;
  /** Resolved provider configuration for creating the provider instance. */
  providerConfig: ProviderConfig;
  /** Model identifier (resolved from --model, config, provider default). */
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
  /** When set, run OAuth authentication for the target and exit. */
  connectTarget: ConnectTarget | null;
  /** Whether tool calls are expanded by default in the UI (N10). */
  defaultToolExpanded: boolean;
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
  let providerId: ProviderId | undefined = userConfig.provider;
  let model: string | undefined = userConfig.model;
  let baseUrl: string | undefined = userConfig.baseUrl;
  let apiKey: string | undefined = userConfig.apiKey;
  let theme = userConfig.theme ?? 'dark';
  let historySize = userConfig.historySize ?? 100;
  let historyFile = userConfig.historyFile ?? join(homedir(), '.flitter-cli', 'history');
  let sessionDir = join(homedir(), '.flitter-cli', 'sessions');
  let sessionRetentionDays = 30;
  let resumeSessionId: string | null = null;
  let listSessions = false;
  let exportSession: AppConfig['exportSession'] = null;
  let connectTarget: ConnectTarget | null = null;
  let defaultToolExpanded = false;

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
      case '--provider': {
        const id = args[++i];
        if (!id) {
          process.stderr.write('Error: --provider requires a provider identifier argument\n');
          process.exit(1);
        }
        providerId = id as ProviderId;
        break;
      }
      case '--base-url': {
        const url = args[++i];
        if (!url) {
          process.stderr.write('Error: --base-url requires a URL argument\n');
          process.exit(1);
        }
        baseUrl = url;
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
      case '--connect': {
        const target = args[++i];
        const validTargets: ConnectTarget[] = ['chatgpt', 'copilot', 'antigravity'];
        if (!target || !validTargets.includes(target as ConnectTarget)) {
          process.stderr.write(
            `Error: --connect requires a target: ${validTargets.join(', ')}\n`,
          );
          process.exit(1);
        }
        connectTarget = target as ConnectTarget;
        break;
      }
      case '--expand-tools':
        defaultToolExpanded = true;
        break;
      default:
        process.stderr.write(`Unknown option: ${args[i]}\n`);
        printHelp();
        process.exit(1);
    }
  }

  // ---------------------------------------------------------------------------
  // Resolve provider configuration
  // ---------------------------------------------------------------------------
  // Priority: --provider CLI flag -> config.json provider -> auto-detect from env
  // Within each provider: --model flag -> config.json model -> DEFAULT_MODELS[provider]

  let providerConfig: ProviderConfig;

  if (providerId) {
    // Explicit provider selected via CLI or config
    const resolvedApiKey = apiKey ?? resolveApiKeyForProvider(providerId);
    const resolvedModel = model ?? DEFAULT_MODELS[providerId] ?? 'claude-sonnet-4-20250514';
    providerConfig = {
      id: providerId,
      apiKey: resolvedApiKey,
      model: resolvedModel,
      baseUrl,
    };
  } else {
    // Auto-detect from environment variables
    const detected = autoDetectProvider();
    if (detected) {
      providerConfig = {
        ...detected,
        model: model ?? detected.model ?? DEFAULT_MODELS[detected.id] ?? 'claude-sonnet-4-20250514',
        baseUrl: baseUrl ?? detected.baseUrl,
        apiKey: apiKey ?? detected.apiKey,
      };
    } else {
      // Fallback: anthropic with whatever key we have (may be undefined → provider will error)
      providerConfig = {
        id: 'anthropic',
        apiKey: apiKey,
        model: model ?? 'claude-sonnet-4-20250514',
        baseUrl,
      };
    }
  }

  return {
    cwd,
    editor,
    logLevel,
    logRetentionDays: userConfig.logRetentionDays ?? 7,
    providerConfig,
    model: providerConfig.model ?? 'claude-sonnet-4-20250514',
    theme,
    historySize,
    historyFile,
    sessionDir,
    sessionRetentionDays,
    resumeSessionId,
    listSessions,
    exportSession,
    connectTarget,
    defaultToolExpanded,
  };
}

/**
 * Resolve API key from environment for a given provider ID.
 * Checks provider-specific env vars first, falls back to generic patterns.
 */
function resolveApiKeyForProvider(id: ProviderId): string | undefined {
  switch (id) {
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY;
    case 'openai':
    case 'openai-compatible':
    case 'chatgpt-codex':
    case 'copilot':
      return process.env.OPENAI_API_KEY;
    case 'gemini':
    case 'antigravity':
      return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
    default:
      // Unknown provider — try OPENAI_API_KEY as a generic fallback
      return process.env.OPENAI_API_KEY;
  }
}

function printHelp(): void {
  process.stderr.write(`
flitter-cli — Native flitter CLI

Usage: flitter-cli [options]

Options:
  --cwd <dir>              Working directory (default: current directory)
  --editor <cmd>           External editor command (default: $EDITOR / $VISUAL / vi)
  --provider <id>          Provider: anthropic, openai, openai-compatible, gemini
                           chatgpt-codex, copilot, antigravity
                           (default: auto-detect from environment)
  --model <id>             Model identifier (default: provider-specific)
  --base-url <url>         Base URL override (for OpenAI-compatible providers)
  --connect <target>       Authenticate with an OAuth provider and exit
                           Targets: chatgpt, copilot, antigravity
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
  --expand-tools           Expand tool calls by default in the UI
  --debug                  Enable debug logging
  --help, -h               Show help message

Environment:
  ANTHROPIC_API_KEY   Anthropic provider API key
  OPENAI_API_KEY      OpenAI / OpenAI-compatible provider API key
  OPENAI_BASE_URL     Base URL for OpenAI-compatible providers
  GEMINI_API_KEY      Google Gemini / Antigravity API key
  GOOGLE_API_KEY      Alternative to GEMINI_API_KEY

Examples:
  flitter-cli
  flitter-cli --provider openai --model gpt-4o
  flitter-cli --provider openai-compatible --base-url http://localhost:11434/v1
  flitter-cli --connect chatgpt                      # OAuth with ChatGPT
  flitter-cli --connect copilot                      # OAuth with GitHub Copilot
  flitter-cli --connect antigravity                  # OAuth with Google Gemini
  flitter-cli --cwd /path/to/project
  flitter-cli --model claude-sonnet-4-20250514
  flitter-cli --editor nvim --debug
  flitter-cli --resume
  flitter-cli --list-sessions
  flitter-cli --export md
`);
}
