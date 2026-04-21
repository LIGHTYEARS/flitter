/**
 * @flitter/flitter — 各服务工厂函数
 *
 * 封装各包的创建逻辑, 保持依赖耦合集中在此文件
 * 逆向: X3() 中各服务创建片段 (claude-config-system.js:1097-1324)
 *
 * @example
 * ```ts
 * import { createConfigService, createToolRegistry, registerBuiltinTools } from './factory';
 * const configService = createConfigService(opts);
 * const toolRegistry = createToolRegistry();
 * registerBuiltinTools(toolRegistry);
 * ```
 */

import type { PermissionEngineOpts } from "@flitter/agent-core";
import {
  ApplyPatchTool,
  BashTool,
  EditTool,
  FormatFileTool,
  FuzzyFindTool,
  GetDiagnosticsTool,
  GlobTool,
  GrepTool,
  PermissionEngine,
  ReadTool,
  RestoreSnapshotTool,
  ShellCommandTool,
  ToolRegistry,
  WriteTool,
} from "@flitter/agent-core";
import {
  ConfigService,
  type ConfigServiceOptions,
  ContextManager,
  type ContextManagerOptions,
  discoverGuidanceFiles,
  type GuidanceLoadOptions,
  SkillService,
  type SkillServiceOptions,
  ThreadPersistence,
  type ThreadPersistenceOptions,
  ThreadStore,
} from "@flitter/data";
import { MCPServerManager, type MCPServerManagerOptions, MODEL_REGISTRY } from "@flitter/llm";
import type { ToolApprovalRequest } from "@flitter/schemas";
import { DEFAULT_MODEL } from "@flitter/schemas";
import { Subject } from "@flitter/util";
import type { ContainerOptions, GuidanceLoader } from "./container";

/**
 * 创建 ConfigService 实例
 * 逆向: LX (claude-config-system.js:~1110)
 */
export function createConfigService(opts: ContainerOptions): ConfigService {
  // Cache for settings-based apiKey lookup (avoids async read on every isSet() call)
  let cachedSettingsApiKey: string | undefined;
  let settingsApiKeyCached = false;

  /**
   * Determine the current provider from settings, for provider-aware API key lookup.
   * Uses cached model value when available (set during getToken), falls back to env.
   *
   * 逆向: amp uses separate code paths per provider (e.g., OpenRouter reads
   * settings["openrouter.apiKey"] then env OPENROUTER_API_KEY). Flitter uses
   * a unified getToken("apiKey") call, so we need to determine the provider
   * here to check the right settings key and env vars.
   */
  let cachedProvider: string | undefined;

  async function detectActiveProvider(): Promise<"anthropic" | "gemini" | "openai" | string> {
    if (cachedProvider) return cachedProvider;
    const modelId = (await opts.settings.get("internal.model")) as string | undefined;
    const model = modelId ?? DEFAULT_MODEL;
    const entry = MODEL_REGISTRY[model];
    const provider = entry?.provider ?? "anthropic";
    cachedProvider = provider;
    return provider;
  }

  const serviceOpts: ConfigServiceOptions = {
    storage: opts.settings,
    secretStorage: {
      async getToken(key, url?) {
        // 1. Primary: check secrets store (secrets.json)
        const fromSecrets = await opts.secrets.get(key, url);
        if (fromSecrets) return fromSecrets;

        // 2. Provider-aware fallback: settings key → env var(s)
        // 逆向: amp's OpenRouter pattern (chunk-002.js:18070-18072):
        //   settings["openrouter.apiKey"] → process.env.OPENROUTER_API_KEY → throw
        // 逆向: amp's Gemini YdR() (modules/0975_unknown_YdR.js):
        //   GOOGLE_API_KEY → GEMINI_API_KEY → undefined
        if (key === "apiKey") {
          const provider = await detectActiveProvider();

          if (provider === "gemini") {
            // Gemini: settings["gemini.apiKey"] → GOOGLE_API_KEY → GEMINI_API_KEY
            const fromSettings = await opts.settings.get("gemini.apiKey");
            if (typeof fromSettings === "string" && fromSettings.length > 0) {
              cachedSettingsApiKey = fromSettings;
              settingsApiKeyCached = true;
              return fromSettings;
            }
            // 逆向: YdR() checks GOOGLE_API_KEY first, then GEMINI_API_KEY
            const fromGoogleEnv = process.env.GOOGLE_API_KEY;
            if (fromGoogleEnv) return fromGoogleEnv;
            const fromGeminiEnv = process.env.GEMINI_API_KEY;
            if (fromGeminiEnv) return fromGeminiEnv;
          } else if (provider === "openai") {
            // OpenAI: settings["openai.apiKey"] → OPENAI_API_KEY
            const fromSettings = await opts.settings.get("openai.apiKey");
            if (typeof fromSettings === "string" && fromSettings.length > 0) {
              cachedSettingsApiKey = fromSettings;
              settingsApiKeyCached = true;
              return fromSettings;
            }
            const fromEnv = process.env.OPENAI_API_KEY;
            if (fromEnv) return fromEnv;
          } else {
            // Anthropic (default): settings["anthropic.apiKey"] → ANTHROPIC_API_KEY
            const fromSettings = await opts.settings.get("anthropic.apiKey");
            if (typeof fromSettings === "string" && fromSettings.length > 0) {
              cachedSettingsApiKey = fromSettings;
              settingsApiKeyCached = true;
              return fromSettings;
            }
            const fromEnv = process.env.ANTHROPIC_API_KEY;
            if (fromEnv) return fromEnv;
          }
        }
        return undefined;
      },
      isSet(key) {
        if (key === "apiKey") {
          // Check cached value first (populated after first getToken call)
          if (settingsApiKeyCached && cachedSettingsApiKey) return true;

          // Provider-aware env var check using cached provider (set by getToken)
          // Falls back to checking ALL provider env vars if provider not yet known.
          // isSet() is a guard — false-positive is safe (provider throws 401 later),
          // false-negative would skip the provider entirely.
          const provider = cachedProvider;
          if (!provider) {
            // Before first getToken call, check all env vars
            if (
              process.env.ANTHROPIC_API_KEY ||
              process.env.GOOGLE_API_KEY ||
              process.env.GEMINI_API_KEY ||
              process.env.OPENAI_API_KEY
            )
              return true;
          } else if (provider === "gemini") {
            if (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY) return true;
          } else if (provider === "openai") {
            if (process.env.OPENAI_API_KEY) return true;
          } else {
            if (process.env.ANTHROPIC_API_KEY) return true;
          }
        }
        return false;
      },
    },
    workspaceRoot: opts.workspaceRoot,
    homeDir: opts.homeDir ?? "",
    userConfigDir: opts.configDir ?? "",
  };
  return new ConfigService(serviceOpts);
}

/**
 * 创建 ToolRegistry 并注册所有内置工具
 * 逆向: cFT (claude-config-system.js:~1190)
 */
export function createToolRegistry(): ToolRegistry {
  return new ToolRegistry();
}

/**
 * 注册 8 个内置工具 (ToolSpec 常量对象)
 * 逆向: cFT 中注册代码 (Read/Write/Edit/Bash/Grep/Glob/FuzzyFind/ApplyPatch)
 */
export function registerBuiltinTools(registry: ToolRegistry): void {
  registry.register(ReadTool);
  registry.register(WriteTool);
  registry.register(EditTool);
  registry.register(ApplyPatchTool);
  registry.register(BashTool);
  registry.register(GrepTool);
  registry.register(GlobTool);
  registry.register(FuzzyFindTool);
  registry.register(FormatFileTool);
  registry.register(RestoreSnapshotTool);
  registry.register(GetDiagnosticsTool);
  registry.register(ShellCommandTool);
}

/**
 * 创建 PermissionEngine
 * 逆向: X3 中权限引擎初始化
 */
export function createPermissionEngine(
  configService: ConfigService,
  workspaceRoot: string,
): PermissionEngine {
  const engineOpts: PermissionEngineOpts = {
    getConfig: () => configService.get(),
    pendingApprovals$: new Subject<ToolApprovalRequest[]>(),
    workspaceRoot,
  };
  return new PermissionEngine(engineOpts);
}

/**
 * 创建 MCPServerManager
 * 逆向: jPR (claude-config-system.js:~1220)
 */
export function createMCPServerManager(configService: ConfigService): MCPServerManager {
  const managerOpts: MCPServerManagerOptions = {
    getConfig: () => {
      const config = configService.get();
      return config.settings.mcpServers ?? {};
    },
  };
  return new MCPServerManager(managerOpts);
}

/**
 * 创建 SkillService
 * 逆向: X5T (claude-config-system.js:~1245)
 */
export function createSkillService(configService: ConfigService): SkillService {
  const serviceOpts: SkillServiceOptions = {
    workspaceRoot: configService.workspaceRoot || null,
    userConfigDir: configService.userConfigDir,
  };
  return new SkillService(serviceOpts);
}

/**
 * 创建 GuidanceLoader — 封装 discoverGuidanceFiles 的配置
 * 逆向: XDT/kkR (skills-agents-system.js)
 */
export function createGuidanceLoader(opts: ContainerOptions): GuidanceLoader {
  return {
    async discover(loadOpts?: Partial<GuidanceLoadOptions>) {
      return discoverGuidanceFiles({
        workspaceRoots: loadOpts?.workspaceRoots ?? [opts.workspaceRoot],
        maxBytesPerFile: loadOpts?.maxBytesPerFile,
      });
    },
  };
}

/**
 * 创建 ThreadStore
 * 逆向: azT (claude-config-system.js:~1280)
 */
export function createThreadStore(): ThreadStore {
  return new ThreadStore();
}

/**
 * 创建 ThreadPersistence (如有 dataDir)
 * 逆向: azT 中 persistence 初始化
 */
export function createThreadPersistence(opts: ContainerOptions): ThreadPersistence | null {
  if (!opts.dataDir) return null;
  const persistOpts: ThreadPersistenceOptions = {
    baseDir: opts.dataDir,
  };
  return new ThreadPersistence(persistOpts);
}

/**
 * 创建 ContextManager
 * 逆向: 上下文管理初始化
 */
export function createContextManager(opts: Partial<ContextManagerOptions> = {}): ContextManager {
  const managerOpts: ContextManagerOptions = {
    // compactFn MUST be provided by container.ts with a real LLM call.
    // This empty fallback exists only to satisfy the type — if it fires,
    // compaction produces an empty summary (ContextManager treats "" as no-op).
    // 逆向: amp wires compactFn to a non-streaming LLM call (chunk-005.js:87826)
    compactFn: opts.compactFn ?? (async () => ""),
    ...opts,
  };
  return new ContextManager(managerOpts);
}
