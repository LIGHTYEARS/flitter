/**
 * @flitter/schemas — 配置系统 Zod Schema + TypeScript 接口
 *
 * 三级配置层级、Settings 键定义、ConfigService 接口
 * 从 amp-cli-reversed/vendor/esm/config-keys.js 和 app/process-runner.js 提取
 */
import { z } from "zod";
import { MCPServerSpecSchema } from "./mcp";
import { PermissionEntrySchema } from "./permissions";

// ─── 配置层级枚举 ──────────────────────────────────────

export const ConfigScopeSchema = z.enum(["default", "global", "workspace", "admin", "override"]);
export type ConfigScope = z.infer<typeof ConfigScopeSchema>;

// ─── 密钥键枚举 ────────────────────────────────────────

export const SecretKeySchema = z.enum([
  "apiKey",
  "buildkite-access-token",
  "github-access-token",
  "gitlab-access-token",
  "gitlab-instance-url",
  "mcp-oauth-client-secret",
  "mcp-oauth-token",
  "sync-auth-token",
]);
export type SecretKey = z.infer<typeof SecretKeySchema>;

// ─── 配置键分类常量 ────────────────────────────────────

/** Admin 可覆盖的键 */
export const ADMIN_OVERRIDE_KEYS = [
  "agent.deepReasoningEffort",
  "agent.mode",
  "agent.skipTitleGenerationIfMessageContains",
  "anthropic.effort",
  "anthropic.interleavedThinking.enabled",
  "anthropic.provider",
  "anthropic.speed",
  "anthropic.temperature",
  "anthropic.thinking.enabled",
  "anthropic.baseURL",
  "anthropic.apiKey",
  "gemini.thinkingLevel",
  "gemini.apiKey",
  "internal.compactionThresholdPercent",
  "internal.model",
  "internal.oracleReasoningEffort",
  "openai.speed",
  "openai.baseURL",
  "openai.apiKey",
  "tools.disable",
  "tools.enable",
  "update.url",
  "update.mode",
] as const;

/** 数组合并键 (concat + dedup) */
export const MERGED_ARRAY_KEYS = [
  "guardedFiles.allowlist",
  "mcpPermissions",
  "tools.disable",
  "tools.enable",
  "permissions",
] as const;

/** 仅全局键 */
export const GLOBAL_ONLY_KEYS = ["mcpServers", "mcpPermissions", "url", "sync.url"] as const;

// ─── MCP Permission Entry (简化版，在 permissions.ts 中精确定义) ─

export const MCPPermissionEntrySchema = z.object({
  matches: z.unknown(),
  action: z.literal("allow"),
});
export type MCPPermissionEntry = z.infer<typeof MCPPermissionEntrySchema>;

// ─── Settings Schema ───────────────────────────────────

export const SettingsSchema = z.object({
  // 认证 & API
  url: z.string().optional(),
  proxy: z.string().optional(),

  // Anthropic
  "anthropic.speed": z.string().optional(),
  "anthropic.temperature": z.number().optional(),
  "anthropic.thinking.enabled": z.boolean().optional(),
  "anthropic.interleavedThinking.enabled": z.boolean().optional(),
  "anthropic.effort": z.string().optional(),
  "anthropic.provider": z.string().optional(),
  "anthropic.baseURL": z.string().optional(),
  "anthropic.apiKey": z.string().optional(),

  // OpenAI
  "openai.speed": z.string().optional(),
  "openai.baseURL": z.string().optional(),
  "openai.apiKey": z.string().optional(),

  // Gemini
  "gemini.thinkingLevel": z.string().optional(),
  "gemini.apiKey": z.string().optional(),

  // Update
  "update.url": z.string().optional(),
  "update.mode": z.enum(["auto", "warn", "disabled"]).optional(),

  // Sync (self-hosted thread sync server)
  "sync.url": z.string().optional(),

  // Internal
  "internal.model": z.string().optional(),
  "internal.compactionThresholdPercent": z.number().optional(),
  "internal.oracleReasoningEffort": z.string().optional(),
  "internal.scaffoldCustomizationFile": z.string().optional(),
  "internal.fireworks.directRouting": z.boolean().optional(),
  "internal.kimi.reasoning": z.string().optional(),

  // Custom model configuration
  // Allows mapping custom endpoint IDs (e.g., "ep-XXXXX") to model metadata.
  // 逆向: amp supports custom models via provider-specific config; Flitter extends
  // with a generic models.custom map for compatible endpoints like ARK.
  "models.custom": z
    .record(
      z.string(),
      z.object({
        provider: z.enum(["anthropic", "openai", "gemini", "openai-compat", "bedrock"]).optional(),
        contextWindow: z.number().optional(),
        maxOutputTokens: z.number().optional(),
        supportsThinking: z.boolean().optional(),
        supportsTools: z.boolean().optional(),
        supportsImages: z.boolean().optional(),
        supportsCacheControl: z.boolean().optional(),
      }),
    )
    .optional(),
  // Model alias mapping: e.g., {"claude-sonnet-4": "ep-20260331120931-5lxqv"}
  "models.alias": z.record(z.string(), z.string()).optional(),

  // Agent
  "agent.mode": z.enum(["smart", "fast", "deep", "auto", "rush", "large"]).optional(),
  "agent.deepReasoningEffort": z.string().optional(),
  "agent.skipTitleGenerationIfMessageContains": z.string().optional(),
  "agent.showUsageDebugInfo": z.boolean().optional(),

  // Tools
  "tools.disable": z.array(z.string()).optional(),
  "tools.enable": z.array(z.string()).optional(),
  "tools.inactivityTimeout": z.number().optional(),
  "tools.stopTimeout": z.number().optional(),
  "network.timeout": z.number().optional(),

  // MCP
  mcpServers: z.record(z.string(), MCPServerSpecSchema).optional(),
  mcpPermissions: z.array(MCPPermissionEntrySchema).optional(),
  mcpTrustedServers: z.array(z.string()).optional(),

  // Permissions
  permissions: z.array(PermissionEntrySchema).optional(),

  // Skills
  "skills.path": z.string().optional(),
  "skills.disableClaudeCodeSkills": z.boolean().optional(),
  "toolbox.path": z.string().optional(),

  // Terminal
  "terminal.animation": z.string().optional(),
  "terminal.theme": z.string().optional(),
  "terminal.commands.nodeSpawn.loadProfile": z.boolean().optional(),

  // Other
  systemPrompt: z.string().optional(),
  /** 逆向: dangerouslyAllowAll (chunk-005.js:158771-158775) */
  dangerouslyAllowAll: z.boolean().optional(),
  hooks: z.record(z.string(), z.unknown()).optional(),
  workspaces: z.record(z.string(), z.unknown()).optional(),
  "notifications.system.enabled": z.boolean().optional(),
  "fuzzy.alwaysIncludePaths": z.array(z.string()).optional(),
  "experimental.autoSnapshot": z.boolean().optional(),
  "experimental.agentMode": z.string().optional(),
  "experimental.cli.commandTelemetry.enabled": z.boolean().optional(),
  "git.commit.ampThread.enabled": z.boolean().optional(),
  "git.commit.coauthor.enabled": z.boolean().optional(),
  "guardedFiles.allowlist": z.array(z.string()).optional(),
});
export type Settings = z.infer<typeof SettingsSchema>;

// ─── Config 接口 (纯 TypeScript，含异步方法不适合 Zod) ──

/** 密钥存储接口 */
export interface SecretStore {
  getToken(key: SecretKey, url?: string): Promise<string | undefined>;
  isSet(key: SecretKey): boolean;
}

/** 运行时配置对象 */
export interface Config {
  settings: Settings;
  secrets: SecretStore;
}

/** 配置服务接口 */
// ─── Model resolution helpers ─────────────────────────────

/** Default model when none is configured */
export const DEFAULT_MODEL = "claude-sonnet-4-20250514";

/**
 * Resolve the effective model name from settings.
 *
 * 1. Read settings["internal.model"] (or fallback to DEFAULT_MODEL)
 * 2. Apply alias resolution via settings["models.alias"]
 *
 * E.g., if internal.model = "claude-sonnet-4-20250514" and
 *   models.alias = {"claude-sonnet-4-20250514": "ep-XXXXX"},
 *   returns "ep-XXXXX".
 */
export function resolveModelName(settings: Record<string, unknown>): string {
  const rawModel = (settings["internal.model"] as string) ?? DEFAULT_MODEL;
  const aliases = settings["models.alias"] as Record<string, string> | undefined;
  if (aliases && rawModel in aliases) {
    return aliases[rawModel];
  }
  return rawModel;
}

/**
 * Environment info needed for path display (replacing home dir with ~, etc.)
 *
 * 逆向: amp-cli-reversed/chunk-002.js:25145-25150
 *   A = a.pipe(JR(o => ({
 *     workspaceFolders: o ? [d0(o)] : null,
 *     isWindows: JS().os === "windows",
 *     homeDir: ...,
 *   })))
 *
 * 逆向: amp-cli-reversed/chunk-001.js:4983-5011
 *   KnR (displayPath) destructures { workspaceFolders, isWindows, homeDir } from this info.
 */
export interface DisplayPathEnvInfo {
  /** Workspace folder URIs (or null if no workspace) */
  workspaceFolders: string[] | null;
  /** Whether the platform is Windows (affects path separator) */
  isWindows: boolean;
  /** Home directory path (used to replace with ~) */
  homeDir: string | undefined;
}

/**
 * Module-level storage for display path env info.
 *
 * 逆向: amp-cli-reversed/chunk-001.js:5015-5021
 *   AET(T) sets the global, VnR() reads it (throws if unset).
 */
let _displayPathEnvInfo: DisplayPathEnvInfo | null = null;

/**
 * Store the display path env info for later use by displayPath() and related functions.
 *
 * 逆向: amp-cli-reversed/chunk-001.js:5015-5017  — AET(T) { gD = T; }
 */
export function setDisplayPathEnvInfo(info: DisplayPathEnvInfo): DisplayPathEnvInfo | null {
  const prev = _displayPathEnvInfo;
  _displayPathEnvInfo = info;
  return prev;
}

/**
 * Retrieve the display path env info. Throws if not initialized.
 *
 * 逆向: amp-cli-reversed/chunk-001.js:5019-5022  — VnR() { if (gD) return gD; throw ... }
 */
export function getDisplayPathEnvInfo(): DisplayPathEnvInfo {
  if (_displayPathEnvInfo) return _displayPathEnvInfo;
  throw new Error(
    "must call setDisplayPathEnvInfo before calling displayPath() and related functions",
  );
}

export interface ConfigService {
  get(): Config;
  updateSettings(scope: ConfigScope, key: string, value: unknown): void;
  /** Apply a runtime-only override (in-memory, never persisted to disk) */
  setRuntimeOverride(key: string, value: unknown): void;
  appendSettings(scope: ConfigScope, key: string, value: unknown): void;
  prependSettings(scope: ConfigScope, key: string, value: unknown): void;
  deleteSettings(scope: ConfigScope, key: string): void;
  updateSecret(key: SecretKey, value: string): void;
  readonly workspaceRoot: string;
  readonly homeDir: string;
  readonly userConfigDir: string;
  /**
   * Initialize the global display path env info.
   * Must be called once at startup before any path display.
   *
   * 逆向: amp-cli-reversed/chunk-002.js:25151-25153
   *   l = A.subscribe(o => { AET(o); })
   */
  displayPathEnvInfo(): void;
  getLatest(): Promise<Config>;
  unsubscribe(): void;
}
