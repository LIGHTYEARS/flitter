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
  createDeleteFileTool,
  createReadMcpResourceTool,
  createSkillTool,
  createUndoEditTool,
  EditTool,
  FileChangeTracker,
  FuzzyFindTool,
  GlobTool,
  GrepTool,
  PermissionEngine,
  ReadTool,
  RestoreSnapshotTool,
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
import { MCPServerManager, type MCPServerManagerOptions } from "@flitter/llm";
import type { ToolApprovalRequest } from "@flitter/schemas";
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

  const serviceOpts: ConfigServiceOptions = {
    storage: opts.settings,
    secretStorage: {
      async getToken(key, url?) {
        // 1. Primary: check secrets store (secrets.json)
        const fromSecrets = await opts.secrets.get(key, url);
        if (fromSecrets) return fromSecrets;

        // 2. Fallback: check settings for anthropic.apiKey
        // 逆向: amp's _a class (0576_unknown__a.js:8) reads ANTHROPIC_API_KEY from env.
        // Flitter supports settings-based apiKey for compatible endpoints (e.g., ARK).
        if (key === "apiKey") {
          const fromSettings = await opts.settings.get("anthropic.apiKey");
          if (typeof fromSettings === "string" && fromSettings.length > 0) {
            cachedSettingsApiKey = fromSettings;
            settingsApiKeyCached = true;
            return fromSettings;
          }
          // 3. Env var fallback: ANTHROPIC_API_KEY
          const fromEnv = process.env.ANTHROPIC_API_KEY;
          if (fromEnv) return fromEnv;
        }
        return undefined;
      },
      isSet(key) {
        if (key === "apiKey") {
          // Check cached value first (populated after first getToken call)
          if (settingsApiKeyCached && cachedSettingsApiKey) return true;
          // Check env var
          if (process.env.ANTHROPIC_API_KEY) return true;
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
  registry.register(RestoreSnapshotTool);
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
