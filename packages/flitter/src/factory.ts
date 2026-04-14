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
  BashTool,
  EditTool,
  FuzzyFindTool,
  GlobTool,
  GrepTool,
  PermissionEngine,
  ReadTool,
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
  const serviceOpts: ConfigServiceOptions = {
    storage: opts.settings,
    secretStorage: {
      async get(key: string) {
        return opts.secrets.get(key);
      },
      async set(key: string, value: string) {
        await opts.secrets.set(key, value);
      },
      async delete(key: string) {
        await opts.secrets.delete(key);
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
 * 注册 7 个内置工具 (ToolSpec 常量对象)
 * 逆向: cFT 中注册代码 (Read/Write/Edit/Bash/Grep/Glob/FuzzyFind)
 */
export function registerBuiltinTools(registry: ToolRegistry): void {
  registry.register(ReadTool);
  registry.register(WriteTool);
  registry.register(EditTool);
  registry.register(BashTool);
  registry.register(GrepTool);
  registry.register(GlobTool);
  registry.register(FuzzyFindTool);
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
        startDir: loadOpts?.startDir ?? opts.workspaceRoot,
        maxBytes: loadOpts?.maxBytes,
        activeFile: loadOpts?.activeFile,
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
export function createContextManager(): ContextManager {
  const managerOpts: ContextManagerOptions = {
    // compactFn 由上层提供 (ThreadWorker 连接 LLM)
    compactFn: async () => "",
  };
  return new ContextManager(managerOpts);
}
