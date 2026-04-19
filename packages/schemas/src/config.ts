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
export const GLOBAL_ONLY_KEYS = ["mcpServers", "mcpPermissions", "url"] as const;

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

  // Internal
  "internal.model": z.string().optional(),
  "internal.compactionThresholdPercent": z.number().optional(),
  "internal.oracleReasoningEffort": z.string().optional(),
  "internal.scaffoldCustomizationFile": z.string().optional(),
  "internal.fireworks.directRouting": z.boolean().optional(),
  "internal.kimi.reasoning": z.string().optional(),

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
export interface ConfigService {
  get(): Config;
  updateSettings(scope: ConfigScope, key: string, value: unknown): void;
  appendSettings(scope: ConfigScope, key: string, value: unknown): void;
  prependSettings(scope: ConfigScope, key: string, value: unknown): void;
  deleteSettings(scope: ConfigScope, key: string): void;
  updateSecret(key: SecretKey, value: string): void;
  readonly workspaceRoot: string;
  readonly homeDir: string;
  readonly userConfigDir: string;
  displayPathEnvInfo(): void;
  getLatest(): Promise<Config>;
  unsubscribe(): void;
}
