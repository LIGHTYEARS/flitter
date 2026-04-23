/**
 * @flitter/flitter — ServiceContainer DI 组装层
 *
 * createContainer(opts) 异步创建所有服务实例并连接依赖,
 * asyncDispose() 按反序清理所有资源
 *
 * 逆向: X3() in claude-config-system.js:1097-1324
 *
 * @example
 * ```ts
 * import { createContainer, type ContainerOptions } from 'flitter';
 *
 * const container = await createContainer({
 *   settings: mySettingsStorage,
 *   secrets: mySecretStorage,
 *   workspaceRoot: process.cwd(),
 * });
 *
 * // 使用服务...
 * const worker = container.createThreadWorker('thread-1');
 *
 * // 清理
 * await container.asyncDispose();
 * ```
 */

import { homedir } from "node:os";
import { join } from "node:path";
import type {
  PermissionEngine,
  ThreadWorker,
  ThreadWorkerOptions,
  ToolRegistry,
  ToolThreadEvent,
} from "@flitter/agent-core";
import {
  applyHookAction,
  buildSystemPrompt as assembleSystemPrompt,
  collectContextBlocks,
  createCodeReviewTool,
  createCodeTourTool,
  createDeleteFileTool,
  createFinderTool,
  createFindThreadTool,
  createLibrarianTool,
  createLookAtTool,
  createMermaidTool,
  createOracleTool,
  createReadMcpResourceTool,
  createReadThreadTool,
  createReplTool,
  createSendMessageToThreadTool,
  createSkillTool,
  createTaskListTool,
  createTaskTool,
  createThreadStatusTool,
  createUndoEditTool,
  createWalkthroughDiagramTool,
  createWalkthroughTool,
  executePostHook,
  executePreHook,
  FileChangeTracker,
  matchHookToTool,
  matchPostExecuteHook,
  matchPreExecuteHook,
  type OrchestratorCallbacks,
  PluginService,
  parseHooksConfig,
  ReadWebPageTool,
  type ReplInferenceFn,
  resolveToolboxPaths,
  SubAgentManager,
  ThreadWorker as ThreadWorkerImpl,
  ToolboxService,
  ToolOrchestrator,
  WebSearchTool,
} from "@flitter/agent-core";
import type {
  ConfigService,
  ContextManager,
  FileSettingsStorage,
  GuidanceFile,
  GuidanceLoadOptions,
  SkillService,
  ThreadPersistence,
  ThreadStore,
} from "@flitter/data";
import type { LLMProvider, MCPServerManager, ModelInfo, ProviderName } from "@flitter/llm";
import {
  getProviderForModel,
  ModelFallbackChain,
  registerModel,
  resolveProvider,
} from "@flitter/llm";
import { type Message, resolveModelName, type ThreadSnapshot } from "@flitter/schemas";
import { BehaviorSubject, createLogger } from "@flitter/util";
// Direct imports to avoid worktree symlink resolution issues with new files
import type { CliToolFilters } from "../../agent-core/src/tools/registry";
import { ThreadWorkerService } from "../../agent-core/src/worker/thread-worker-service";
import {
  createConfigService,
  createContextManager,
  createGuidanceLoader,
  createMCPServerManager,
  createPermissionEngine,
  createSkillService,
  createThreadPersistence,
  createThreadStore,
  createToolRegistry,
  registerBuiltinTools,
} from "./factory";
import { syncMCPToolsToRegistry } from "./mcp-bridge";

const log = createLogger("container");

/**
 * Gemini context-overflow fallback model.
 * 逆向: amp-cli-reversed/chunk-005.js:106075
 *   eP = ya("GEMINI3_FLASH_PREVIEW") — maps to "gemini-3-flash-preview"
 *   Used in modules/1063_unknown_f4R.js:33-39 when totalInputTokens >= maxInputTokens
 */
const GEMINI_FALLBACK_MODEL = "gemini-2.5-flash";

/**
 * Create a provider wrapped with ModelFallbackChain for context-overflow resilience.
 *
 * 逆向: amp-cli-reversed/modules/1063_unknown_f4R.js:33-39
 *   When totalInputTokens >= contextWindow - maxOutputTokens, amp falls back
 *   to eP (GEMINI3_FLASH_PREVIEW) which has a 1M token context window.
 *
 * The routing provider delegates to getProviderForModel() so that each model
 * in the fallback chain uses the correct provider backend (e.g., Anthropic for
 * Claude, Gemini for gemini-*).
 *
 * @param primaryModel - The user's configured primary model
 * @returns LLMProvider-compatible object with fallback chain
 */
function createFallbackProvider(primaryModel: string): LLMProvider {
  // Build model list: primary + Gemini fallback (unless primary is already Gemini)
  const primaryProvider = resolveProvider(primaryModel);
  const models =
    primaryProvider === "gemini"
      ? [primaryModel] // No redundant Gemini fallback
      : [primaryModel, GEMINI_FALLBACK_MODEL];

  // Routing provider: delegates to the correct backend per model name
  const routingProvider: LLMProvider = {
    name: "routing" as ProviderName,
    stream: (params) => getProviderForModel(params.model).stream(params),
  };

  const chain = new ModelFallbackChain({
    models,
    provider: routingProvider,
    maxRetriesPerModel: 2,
  });

  // Wrap ModelFallbackChain as LLMProvider (ThreadWorker only calls .stream())
  return {
    name: routingProvider.name,
    stream: (params) => chain.stream(params),
  };
}

// ── 公共类型 ────────────────────────────────────────────

/**
 * 秘密存储接口 (API Key, OAuth Token 等)
 * 逆向: BXT (claude-config-system.js:~980)
 */
export interface SecretStorage {
  /** 获取秘密值 */
  get(key: string, scope?: string): Promise<string | undefined>;
  /** 设置秘密值 */
  set(key: string, value: string, scope?: string): Promise<void>;
  /** 删除秘密值 */
  delete(key: string, scope?: string): Promise<void>;
}

/**
 * Guidance 文件加载器接口
 * 封装 discoverGuidanceFiles 配置
 */
export interface GuidanceLoader {
  /** 发现 guidance 文件 (AGENTS.md / CLAUDE.md) */
  discover(opts?: Partial<GuidanceLoadOptions>): Promise<GuidanceFile[]>;
}

/**
 * 容器创建选项
 * 逆向: X3 参数 (claude-config-system.js:1097)
 */
export interface ContainerOptions {
  /** 用户设置存储 */
  settings: FileSettingsStorage;
  /** 秘密存储 (API Key 等) */
  secrets: SecretStorage;
  /** 是否延迟认证 (TUI 模式下先启动再登录) */
  deferAuth?: boolean;
  /** 工作目录 */
  workspaceRoot: string;
  /** 数据目录 (thread 持久化路径, 可选) */
  dataDir?: string;
  /** 用户主目录 */
  homeDir?: string;
  /** 用户配置目录 (~/.config/flitter) */
  configDir?: string;
  /** CLI-level tool filters (--allowedTools, --disallowedTools, --disableShellCommand) */
  cliToolFilters?: CliToolFilters;
}

/**
 * 服务容器 — 包含所有已初始化的服务实例
 * 逆向: X3 返回值 (claude-config-system.js:1097-1324)
 */
export interface ServiceContainer {
  /** 配置服务 (三级合并 + 热重载) */
  configService: ConfigService;
  /** 工具注册表 (已注册内置工具 + 动态 MCP 工具) */
  toolRegistry: ToolRegistry;
  /** 工具执行引擎 (容器级别, 用于生命周期管理) */
  toolOrchestrator: ToolOrchestrator;
  /** 权限引擎 (四级决策) */
  permissionEngine: PermissionEngine;
  /** MCP 服务器管理器 */
  mcpServerManager: MCPServerManager;
  /** 技能服务 */
  skillService: SkillService;
  /** 线程内存存储 */
  threadStore: ThreadStore;
  /** 线程持久化 (如有 dataDir, 否则 null) */
  threadPersistence: ThreadPersistence | null;
  /** Guidance 文件加载器 */
  guidanceLoader: GuidanceLoader;
  /** 上下文管理器 (token 计数 + 压缩) */
  contextManager: ContextManager;
  /** 秘密存储引用 */
  secrets: SecretStorage;
  /** 设置存储引用 */
  settings: FileSettingsStorage;
  /** 子代理管理器 (Task tool) */
  subAgentManager: SubAgentManager;

  /** 插件服务 (子进程 JSON-RPC, 工具拦截) */
  pluginService: PluginService;

  /**
   * Toolbox service — discovers and registers user-provided shell-script tools.
   * 逆向: S5R in modules/1371_Toolbox_S5R.js
   */
  toolboxService: ToolboxService;

  /**
   * ThreadWorkerService: manages ThreadWorker instances by thread ID.
   * 逆向: amp-cli-reversed/modules/1246_ThreadWorkerService_QWT.js
   */
  threadWorkerService: ThreadWorkerService;

  /**
   * 创建 ThreadWorker 实例 (工厂模式)
   * 每次调用创建新的 worker, 绑定到指定线程
   * Delegates to ThreadWorkerService for lifecycle management.
   */
  createThreadWorker(threadId: string, opts?: Partial<ThreadWorkerOptions>): ThreadWorker;

  /** 异步清理所有资源 (反序 dispose) */
  asyncDispose(): Promise<void>;
}

// ── Disposable 接口 ─────────────────────────────────────

interface Disposable {
  dispose(): void | Promise<void>;
}

/**
 * 创建服务容器 — 组装所有服务并连接依赖
 *
 * 创建顺序:
 * 1. ConfigService (基础, 其他服务都依赖它)
 * 2. ToolRegistry + 注册内置工具
 * 3. PermissionEngine
 * 4. ToolOrchestrator (容器级)
 * 5. MCPServerManager
 * 6. SkillService
 * 7. GuidanceLoader
 * 8. ThreadStore + ThreadPersistence
 * 9. ContextManager
 *
 * 逆向: X3() in claude-config-system.js:1097-1324
 */
export async function createContainer(opts: ContainerOptions): Promise<ServiceContainer> {
  log.info("Initializing service container...");
  const disposables: Disposable[] = [];
  let disposed = false;

  try {
    // 1. ConfigService — 所有其他服务的配置源
    const configService = createConfigService(opts);
    disposables.push({ dispose: () => configService.unsubscribe() });
    log.info("ConfigService created");

    // 1a. Load initial settings from disk so config.settings is populated
    try {
      await configService.reload();
    } catch {
      // reload may fail in test environments with mock storage — continue with defaults
    }

    // 1b. Register custom models from settings["models.custom"]
    // 逆向: amp supports custom models via provider-specific config
    // Flitter extends with settings-based custom model registration for
    // compatible endpoints (ARK, Azure, etc.)
    {
      const settings = configService.get().settings;
      const customModels = settings["models.custom"] as
        | Record<string, Partial<ModelInfo>>
        | undefined;
      if (customModels) {
        for (const [id, info] of Object.entries(customModels)) {
          registerModel({
            id,
            provider: (info.provider as ProviderName) ?? "anthropic",
            contextWindow: info.contextWindow ?? 200_000,
            maxOutputTokens: info.maxOutputTokens ?? 16_384,
            supportsThinking: info.supportsThinking ?? false,
            supportsTools: info.supportsTools ?? true,
            supportsImages: info.supportsImages ?? false,
            supportsCacheControl: info.supportsCacheControl ?? false,
          });
          log.info("Registered custom model", { id, provider: info.provider ?? "anthropic" });
        }
      }
    }

    // 2. ToolRegistry + 注册内置工具 (Read, Write, Edit, Bash, Grep, Glob, FuzzyFind)
    const toolRegistry = createToolRegistry();
    registerBuiltinTools(toolRegistry);

    // 2a. Apply CLI-level tool filters if provided
    if (opts.cliToolFilters) {
      toolRegistry.setCliFilters(opts.cliToolFilters);
    }
    log.info("ToolRegistry created, builtin tools registered");

    // 2b. FileChangeTracker + undo_edit / delete_file tools
    // 逆向: amp injects fileChangeTracker into tool context for edit/write/undo
    const fileChangeTracker = new FileChangeTracker();
    toolRegistry.register(createUndoEditTool(fileChangeTracker));
    toolRegistry.register(createDeleteFileTool(fileChangeTracker));
    log.info("FileChangeTracker created, undo_edit and delete_file tools registered");

    // 2c. Toolbox — scan user-provided tool scripts
    // 逆向: S5R (modules/1371_Toolbox_S5R.js) — toolbox service registration
    const homeDir = opts.homeDir ?? homedir();
    const config = configService.get();
    const toolboxPaths = resolveToolboxPaths(config.settings["toolbox.path"], homeDir);
    const toolboxService = new ToolboxService(toolRegistry, toolboxPaths);
    try {
      await toolboxService.scan();
      log.info("ToolboxService scanned", {
        paths: toolboxPaths,
        toolCount: toolboxService.getStatus().toolCount,
      });
    } catch (err) {
      log.warn("ToolboxService scan failed, continuing without toolbox tools", {
        error: err,
      });
    }
    disposables.push(toolboxService);

    // 3. PermissionEngine — 四级决策
    const permissionEngine = createPermissionEngine(configService, opts.workspaceRoot);
    log.info("PermissionEngine created");

    // 4. ToolOrchestrator — 容器级 (用于生命周期管理)
    const noopCallbacks: OrchestratorCallbacks = {
      getConfig: async () => configService.get(),
      updateThread: async () => {},
      getToolRunEnvironment: async (_toolUseId, signal) => ({
        workingDirectory: opts.workspaceRoot,
        signal,
        threadId: "__container__",
        config: configService.get(),
      }),
      applyHookResult: async () => ({ abortOp: false }),
      applyPostHookResult: async () => {},
      updateFileChanges: async () => {},
      getDisposed$: () => new BehaviorSubject(false),
    };
    const toolOrchestrator = new ToolOrchestrator("__container__", toolRegistry, noopCallbacks);
    disposables.push(toolOrchestrator);
    log.info("ToolOrchestrator created");

    // 5. MCPServerManager
    const mcpServerManager = createMCPServerManager(configService);
    disposables.push(mcpServerManager);
    log.info("MCPServerManager created");

    // 5b. Register read_mcp_resource tool (depends on MCPServerManager)
    toolRegistry.register(createReadMcpResourceTool(mcpServerManager));
    log.info("read_mcp_resource tool registered");

    // Bridge MCP tools into ToolRegistry (reactive sync)
    const mcpBridge = syncMCPToolsToRegistry(mcpServerManager, toolRegistry);
    disposables.push({ dispose: () => mcpBridge.dispose() });
    log.info("MCP tools bridge started");

    // 6. SkillService
    const skillService = createSkillService(configService);
    log.info("SkillService created");

    // 6b. Register Skill tool (depends on SkillService)
    toolRegistry.register(createSkillTool(skillService));
    log.info("Skill tool registered");

    // 6c. Plugin service — discover and load plugins
    // 逆向: X3() in modules/1990_unknown_X3.js — pluginService = X5T({...})
    const pluginService = new PluginService({
      workspaceDir: opts.workspaceRoot,
      userConfigDir: opts.configDir ?? join(homedir(), ".config", "flitter"),
      pluginFilter: process.env.FLITTER_PLUGINS,
    });
    await pluginService.loadPlugins();
    disposables.push(pluginService);
    log.info("PluginService created", { pluginCount: pluginService.pluginCount });

    // 7. GuidanceLoader
    const guidanceLoader = createGuidanceLoader(opts);
    log.info("GuidanceLoader created");

    // 8. ThreadStore + ThreadPersistence
    const threadStore = createThreadStore();
    log.info("ThreadStore created");
    const threadPersistence = createThreadPersistence(opts);
    if (threadPersistence) {
      log.info("ThreadPersistence created", { dataDir: opts.dataDir });

      // Task 1: Start auto-save — polls getDirtyThreadIds on a timer and persists
      // 逆向: amp 1244_ThreadWorker_ov.js:248-254 (threadReadWriter auto-persist)
      const autoSaveHandle = threadPersistence.startAutoSave(threadStore);
      disposables.push({ dispose: () => autoSaveHandle.dispose() });
      log.info("ThreadPersistence auto-save started");

      // Task 2: Hydrate ThreadStore with previously persisted threads on startup
      // 逆向: amp 1244_ThreadWorker_ov.js:248-254 (threadReadWriter auto-persist)
      try {
        const persisted = await threadPersistence.loadAll();
        for (const thread of persisted) {
          threadStore.setCachedThread(thread); // no scheduleUpload — don't re-dirty loaded threads
        }
        log.info("Loaded persisted threads", { count: persisted.length });
      } catch (err) {
        log.warn("Failed to load persisted threads", { error: err });
      }
    }

    // 8b. Thread remote sync — optional self-hosted sync via HttpRemoteTransport
    // 逆向: amp uses N3 RPC proxy (modules/1343_unknown_ezT.js) for remote thread ops.
    // Flitter uses a direct REST transport when sync.url + sync-auth-token are configured.
    {
      const syncUrl = configService.get().settings["sync.url"] as string | undefined;
      const syncToken = syncUrl ? await opts.secrets.get("sync-auth-token") : undefined;
      if (syncUrl && syncToken) {
        const { HttpRemoteTransport } = await import("@flitter/data");
        const { ThreadUploadManager } = await import("@flitter/data");

        const remote = new HttpRemoteTransport({ baseUrl: syncUrl, authToken: syncToken });
        const uploadManager = new ThreadUploadManager({
          getThreadSnapshot: (id) => threadStore.getThreadSnapshot(id),
          remote,
        });
        threadStore.setUploadManager(uploadManager);
        disposables.push({ dispose: () => uploadManager.dispose() });
        log.info("Thread sync enabled", { url: syncUrl });

        // Hydration: merge remote threads into local store (version-aware)
        // Remote-newer → overwrite local; local-newer → will upload on next dirty cycle
        try {
          const remoteEntries = await remote.listThreads({ limit: null });
          let merged = 0;
          for (const entry of remoteEntries) {
            const local = threadStore.getThreadSnapshot(entry.id);
            if (!local || local.v < entry.v) {
              const snapshot = await remote.getThread(entry.id);
              if (snapshot) {
                threadStore.setCachedThread(snapshot);
                uploadManager.setUploadedVersion(entry.id, snapshot.v);
                merged++;
              }
            } else {
              uploadManager.setUploadedVersion(entry.id, entry.v);
            }
          }
          log.info("Remote thread hydration complete", {
            remoteCount: remoteEntries.length,
            merged,
          });
        } catch (err) {
          log.warn("Remote thread hydration failed, continuing local-only", { error: err });
        }
      }
    }

    // 9. ContextManager
    // 逆向: amp includes environment/tool context when building summaries
    // (chunk-002.js:20586, fwR collectContextBlocks)
    // 逆向: amp compaction prompt nfR (chunk-005.js:16533-16555)
    const COMPACTION_PROMPT =
      `You have been working on the task described above but have not yet completed it. ` +
      `Write a continuation summary that will allow you (or another instance of yourself) ` +
      `to resume work efficiently in a future context window where the conversation history ` +
      `will be replaced with this summary. Your summary should be structured, concise, and actionable. Include:\n` +
      `1. Task Overview\nThe user's core request and success criteria\nAny clarifications or constraints they specified\n` +
      `2. Current State\nWhat has been completed so far\nFiles created, modified, or analyzed (with paths if relevant)\n` +
      `Key outputs or artifacts produced\n` +
      `3. Important Discoveries\nTechnical constraints or requirements uncovered\nDecisions made and their rationale\n` +
      `Errors encountered and how they were resolved\nWhat approaches were tried that didn't work (and why)\n` +
      `4. Next Steps\nSpecific actions needed to complete the task\nAny blockers or open questions to resolve\n` +
      `Priority order if multiple steps remain\n` +
      `5. Context to Preserve\nUser preferences or style requirements\nDomain-specific details that aren't obvious\n` +
      `Any promises made to the user\n` +
      `Be concise but complete—err on the side of including information that would prevent duplicate work or repeated mistakes. ` +
      `Write in a way that enables immediate resumption of the task.\n` +
      `Wrap your summary in <summary></summary> tags.`;

    const contextManager = createContextManager({
      compactFn: async (messages) => {
        // 逆向: amp's Q5R uses same model as main conversation, non-streaming
        // (chunk-005.js:87826-87855)
        const config = configService.get();
        const model = resolveModelName(config.settings);
        const provider = getProviderForModel(model);

        // Append the compaction prompt as a final user message
        const messagesForLLM: Message[] = [
          ...(messages as unknown as Message[]),
          {
            role: "user" as const,
            messageId: -99,
            content: [{ type: "text" as const, text: COMPACTION_PROMPT }],
          } as unknown as Message,
        ];

        let fullText = "";
        try {
          for await (const delta of provider.stream({
            model,
            messages: messagesForLLM,
            systemPrompt: [],
            tools: [],
            config,
            signal: AbortSignal.timeout(120_000), // 2min timeout for compaction
          })) {
            const textBlock = delta.content.find(
              (b): b is { type: "text"; text: string } => b.type === "text",
            );
            if (textBlock) fullText = textBlock.text;
          }
        } catch (err) {
          log.error("Compaction LLM call failed", { error: err });
          // Return empty to signal failure — ContextManager will skip compaction
          return "";
        }

        // Extract <summary>…</summary> if present, else return full text
        const match = fullText.match(/<summary>([\s\S]*?)<\/summary>/);
        const summary = match ? match[1].trim() : fullText.trim();
        log.info("Compaction summary generated", {
          model,
          inputMessages: messages.length,
          summaryLength: summary.length,
        });
        return summary;
      },
      getSystemContext: async () => {
        try {
          const config = configService.get();
          const contextBlocks = await collectContextBlocks({
            getConfig: () => config,
            listSkills: () => skillService.list(),
            workspaceRoot: opts.workspaceRoot,
            workingDirectory: opts.workspaceRoot,
            discoverGuidanceFiles: (loadOpts) => guidanceLoader.discover(loadOpts),
          });
          // Return a condensed version of the system context
          return contextBlocks
            .map((block) => block.text)
            .filter((t) => t.length > 0)
            .join("\n\n")
            .slice(0, 2000); // Limit to avoid inflating the summary prompt
        } catch {
          return null;
        }
      },
    });
    log.info("ContextManager created");

    // 10. SubAgentManager — wired to use container's createThreadWorker
    // Uses deferred containerRef because container doesn't exist yet at this point.
    // createWorker is only called at spawn() time (after construction), so this is safe.
    // 逆向: amp 1354_unknown_wi.js (subagent inference runner)
    let containerRef: ServiceContainer | null = null;

    const subAgentManager = new SubAgentManager({
      createWorker: (workerOpts) => {
        if (!containerRef) throw new Error("Container not ready");
        // 逆向: _5R (modules/1362_unknown__5R.js) — filtered tool service per subagent
        // Pass toolPatterns so createThreadWorker can filter the tool registry.
        return containerRef.createThreadWorker(workerOpts.threadId, {
          toolRegistry: toolRegistry.createFilteredRegistry(workerOpts.toolPatterns),
        });
      },
      createChildThread: (parentThreadId) => {
        const childId = crypto.randomUUID();
        threadStore.setCachedThread({
          id: childId,
          v: 1,
          title: null,
          messages: [],
          env: "local",
          agentMode: "normal",
          relationships: [{ type: "child-of", threadId: parentThreadId }],
        } as unknown as ThreadSnapshot);
        return childId;
      },
      addMessage: (tid, msg) => {
        const snapshot = threadStore.getThreadSnapshot(tid);
        if (snapshot) {
          threadStore.setCachedThread({
            ...snapshot,
            messages: [...snapshot.messages, msg],
          } as unknown as ThreadSnapshot);
        }
      },
      getThreadSnapshot: (tid) => threadStore.getThreadSnapshot(tid),
    });
    disposables.push(subAgentManager);
    log.info("SubAgentManager created");

    // Register Task tool (depends on SubAgentManager)
    const taskTool = createTaskTool(subAgentManager);
    toolRegistry.register(taskTool);
    log.info("Task tool registered");

    // Register web_search and read_web_page tools (static, no deps)
    // 逆向: chunk-005.js:149714 (OXR — web_search), chunk-005.js:149131 (ZVR — read_web_page)
    toolRegistry.register(WebSearchTool);
    toolRegistry.register(ReadWebPageTool);
    log.info("web_search and read_web_page tools registered");

    // Register read_thread and find_thread tools (depends on ThreadStore)
    // 逆向: chunk-005.js:149068 (GVR — read_thread), chunk-005.js:147050 (iGR — find_thread)
    toolRegistry.register(createReadThreadTool(threadStore));
    toolRegistry.register(createFindThreadTool(threadStore));
    log.info("read_thread and find_thread tools registered");

    // Register task_list tool (in-memory task store)
    // 逆向: chunk-005.js:149274 (_XR — task_list)
    toolRegistry.register(createTaskListTool());
    log.info("task_list tool registered");

    // Register finder, code_review, and code_tour tools (depends on SubAgentManager)
    // 逆向: chunk-005.js:71165 (qe.finder), chunk-005.js:146498 (OzT — code_review)
    // 逆向: modules/2026_tail_anonymous.js:140405 (I2R — code_tour spec)
    toolRegistry.register(createFinderTool(subAgentManager));
    toolRegistry.register(createCodeReviewTool(subAgentManager));
    toolRegistry.register(createCodeTourTool(subAgentManager));
    // 逆向: modules/2026_tail_anonymous.js:143379 (kXR — walkthrough spec)
    // 逆向: modules/2026_tail_anonymous.js:143433 ($XR — walkthrough_diagram spec)
    toolRegistry.register(createWalkthroughTool(subAgentManager));
    toolRegistry.register(createWalkthroughDiagramTool());
    // 逆向: 2026_tail_anonymous.js:142702 (DVR — oracle tool spec)
    toolRegistry.register(createOracleTool(subAgentManager));
    // 逆向: 2026_tail_anonymous.js:141818 (IKR — librarian tool spec)
    toolRegistry.register(createLibrarianTool(subAgentManager));
    // 逆向: chunk-005.js:148520-148598 (kVR — look_at tool spec)
    toolRegistry.register(createLookAtTool());
    // 逆向: chunk-005.js:148612-148686 (gVR — mermaid tool spec)
    toolRegistry.register(createMermaidTool());
    // 逆向: chunk-005.js:117268-117337 (iqT — repl tool spec)
    // The REPL tool needs an inference function. We create one that wraps the
    // container's LLM provider stream into a collected response. The actual
    // provider is resolved at execute-time via configService.
    const replInferenceFn: ReplInferenceFn = async (messages, tools, systemPromptText, signal) => {
      const config = configService.get();
      const model = resolveModelName(config.settings);
      const provider = createFallbackProvider(model);

      // Convert simplified REPL messages to flitter Message format
      const flitterMessages: Message[] = messages.map((m) => {
        if (typeof m.content === "string") {
          return {
            role: m.role,
            content: [{ type: "text" as const, text: m.content }],
          } as unknown as Message;
        }
        return {
          role: m.role,
          content: m.content.map((block) => {
            if (block.type === "tool_result") {
              return {
                type: "tool_result" as const,
                tool_use_id: block.tool_use_id ?? "",
                content: block.content ?? "",
              };
            }
            if (block.type === "tool_use") {
              return {
                type: "tool_use" as const,
                id: block.id ?? "",
                name: block.name ?? "",
                input: block.input ?? {},
              };
            }
            return { type: "text" as const, text: block.text ?? "" };
          }),
        } as unknown as Message;
      });

      const stream = provider.stream({
        model,
        messages: flitterMessages,
        systemPrompt: [{ type: "text", text: systemPromptText }],
        tools: tools.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
        config,
        signal,
      });

      // Collect stream into final response
      let lastContent: import("@flitter/schemas").AssistantContentBlock[] = [];
      for await (const delta of stream) {
        if (signal.aborted) break;
        lastContent = delta.content;
      }

      if (lastContent.length === 0) return {};

      return {
        message: {
          content: lastContent.map((block) => {
            if (block.type === "text") {
              return { type: "text" as const, text: block.text };
            }
            if (block.type === "tool_use") {
              return {
                type: "tool_use" as const,
                id: block.id,
                name: block.name,
                input: block.input as Record<string, unknown>,
              };
            }
            return { type: "text" as const, text: "" };
          }),
        },
      };
    };
    toolRegistry.register(createReplTool(replInferenceFn));
    log.info(
      "finder, code_review, code_tour, walkthrough, walkthrough_diagram, oracle, librarian, look_at, mermaid, and repl tools registered",
    );

    log.info("Service container initialized successfully.");

    // 11. ThreadWorkerService — lifecycle management for ThreadWorker instances
    // 逆向: amp-cli-reversed/modules/1246_ThreadWorkerService_QWT.js
    // The factory is set up with a deferred containerRef pattern below.
    let threadWorkerService: ThreadWorkerService | null = null;

    const container: ServiceContainer = {
      configService,
      toolRegistry,
      toolOrchestrator,
      permissionEngine,
      mcpServerManager,
      skillService,
      threadStore,
      threadPersistence,
      guidanceLoader,
      contextManager,
      secrets: opts.secrets,
      settings: opts.settings,
      subAgentManager,
      pluginService,
      toolboxService,
      threadWorkerService: null as unknown as ThreadWorkerService, // set below

      createThreadWorker(
        threadId: string,
        workerOpts?: Partial<ThreadWorkerOptions>,
      ): ThreadWorker {
        // Deferred reference to the worker's events$ Subject.
        // The orchestrator is created before the worker, so we use a closure
        // that captures a mutable reference, assigned after worker construction.
        // 逆向: amp's ov.createOrchestratorCallbacks() has direct access to
        // `this` (the ThreadWorker), so no deferred pattern is needed there.
        let workerRef: ThreadWorkerImpl | null = null;

        // 为每个线程创建独立的 ToolOrchestrator
        const threadCallbacks: OrchestratorCallbacks = {
          getConfig: async () => configService.get(),
          updateThread: async (event: ToolThreadEvent) => {
            // 逆向: amp's BfR "tool:data" case calls xwT() which finds or creates
            // a user message after the assistant message, then upserts a tool_result
            // content block. Fields must match display-items.ts RawContentBlock:
            //   toolUseID (camelCase), run.status, run.result, run.error
            if (event.status === "completed" && event.result) {
              const snapshot = threadStore.getThreadSnapshot(threadId);
              if (!snapshot) return;
              const isError = event.result.status === "error";
              const toolResultMessage = {
                role: "user" as const,
                content: [
                  {
                    type: "tool_result" as const,
                    toolUseID: event.toolUseId,
                    run: {
                      status: isError ? "error" : "done",
                      result: event.result.content ?? "",
                      ...(isError
                        ? { error: { message: event.result.content ?? "Unknown error" } }
                        : {}),
                    },
                  },
                ],
              };
              threadStore.setCachedThread({
                ...snapshot,
                messages: [...snapshot.messages, toolResultMessage],
              } as unknown as ThreadSnapshot);
            }
          },
          getToolRunEnvironment: async (_toolUseId, signal) => ({
            workingDirectory: opts.workspaceRoot,
            signal,
            threadId,
            config: configService.get(),
          }),
          /**
           * Apply pre-execution hook results.
           * 逆向: amp FWT.invokeTool (1234:258-270) calls u7R then BI.
           * Flitter: tries declarative hooks first, then legacy hooks.
           */
          applyHookResult: async (hookResult) => {
            const config = configService.get();
            const hooksConfig = (config.settings as Record<string, unknown>)?.hooks;
            const toolInput = hookResult.toolInput ?? {};

            // 1. Try declarative hooks (new format: array with compatibilityDate)
            if (Array.isArray(hooksConfig)) {
              const match = matchPreExecuteHook(hooksConfig, {
                toolName: hookResult.toolName,
                toolInput,
              });
              const result = applyHookAction(match, { toolUseID: hookResult.toolUseId });
              if (result.abortOp) {
                if (result.userMessage) {
                  const snapshot = threadStore.getThreadSnapshot(threadId);
                  if (snapshot) {
                    threadStore.setCachedThread({
                      ...snapshot,
                      messages: [
                        ...snapshot.messages,
                        {
                          role: "user",
                          content: [{ type: "text", text: result.userMessage }],
                        },
                      ],
                    } as unknown as ThreadSnapshot);
                  }
                }
                return { abortOp: true };
              }
            }

            // 2. Try legacy hooks (old format: { PreToolUse: [...] })
            if (hooksConfig && typeof hooksConfig === "object" && !Array.isArray(hooksConfig)) {
              const parsed = parseHooksConfig(hooksConfig as Record<string, unknown>);
              const preHooks = parsed.filter(
                (h) => h.type === "PreToolUse" && matchHookToTool(h, hookResult.toolName),
              );
              for (const hook of preHooks) {
                const result = await executePreHook(hook, {
                  threadId,
                  toolUse: { name: hookResult.toolName, input: toolInput },
                });
                if (result.abort) {
                  return { abortOp: true };
                }
              }
            }

            return { abortOp: false };
          },
          /**
           * Apply post-execution hook results.
           * 逆向: amp FWT (1234:385-393) calls y7R then BI for post-execute.
           */
          applyPostHookResult: async (hookResult) => {
            const config = configService.get();
            const hooksConfig = (config.settings as Record<string, unknown>)?.hooks;

            // 1. Declarative post-execute hooks
            if (Array.isArray(hooksConfig)) {
              const match = matchPostExecuteHook(hooksConfig, {
                toolName: hookResult.toolName,
              });
              const result = applyHookAction(match, { toolUseID: hookResult.toolUseId });
              if (result.redactedInput) {
                const snapshot = threadStore.getThreadSnapshot(threadId);
                if (snapshot) {
                  const messages = snapshot.messages.map((msg) => {
                    if (msg.role !== "assistant") return msg;
                    const content = (msg.content as unknown[]).map((block) => {
                      const b = block as Record<string, unknown>;
                      if (b.type === "tool_use" && b.id === hookResult.toolUseId) {
                        return { ...b, input: result.redactedInput };
                      }
                      return block;
                    });
                    return { ...msg, content };
                  });
                  threadStore.setCachedThread({
                    ...snapshot,
                    messages,
                  } as unknown as ThreadSnapshot);
                }
              }
            }

            // 2. Legacy post-hooks
            if (hooksConfig && typeof hooksConfig === "object" && !Array.isArray(hooksConfig)) {
              const parsed = parseHooksConfig(hooksConfig as Record<string, unknown>);
              const postHooks = parsed.filter(
                (h) => h.type === "PostToolUse" && matchHookToTool(h, hookResult.toolName),
              );
              for (const hook of postHooks) {
                await executePostHook(hook, {
                  threadId,
                  toolUse: { name: hookResult.toolName, input: hookResult.toolInput ?? {} },
                  result: { status: "done" },
                });
              }
            }
          },
          updateFileChanges: async () => {},
          getDisposed$: () => new BehaviorSubject(false),
          onToolEvent: (event) => {
            workerRef?.events$.next(event);
          },
          /**
           * Request user approval for a tool invocation.
           *
           * 逆向: amp's toolService.requestApproval creates a Promise, stores
           * the resolver in a Map keyed by toolUseId, and pushes the request
           * onto pendingApprovals$ BehaviorSubject. The FWT.syncPendingApprovalsToThreadState
           * method syncs these to thread state for TUI rendering.
           *
           * Flitter: stores the resolver in ThreadWorker._pendingApprovals and
           * emits an approval:request AgentEvent for the TUI layer to render.
           * When the user responds, ThreadWorker.userRespondToApproval looks up
           * the resolver and settles this Promise.
           */
          requestApproval: (request) => {
            return new Promise((resolve) => {
              if (workerRef) {
                workerRef._pendingApprovals.set(request.toolUseId, resolve);
                workerRef.events$.next({
                  type: "approval:request",
                  toolUseId: request.toolUseId,
                  toolName: request.toolName,
                  args: request.args,
                  reason: request.reason,
                });
              }
            });
          },
          /**
           * Clear all pending approvals for this thread, resolving each with accepted: false.
           *
           * 逆向: amp's $mR.clearApprovalsForThread(threadId) — iterates pending
           * approvals BehaviorSubject, resolves all matching Promises with
           * { accepted: false }, then pushes filtered list.
           *
           * Called from ToolOrchestrator.onNewUserMessage() and cancelAll().
           */
          clearPendingApprovals: () => {
            if (workerRef) {
              for (const [, resolve] of workerRef._pendingApprovals) {
                resolve({ accepted: false });
              }
              workerRef._pendingApprovals.clear();
            }
          },
          // Plugin interception hooks
          // 逆向: amp's ThreadWorker wires requestPluginToolCall/requestPluginToolResult
          // to pluginService.event.toolCall/toolResult
          requestPluginToolCall: (event) => pluginService.onToolCall(event),
          requestPluginToolResult: (event) => pluginService.onToolResult(event),
        };
        const threadOrchestrator = new ToolOrchestrator(threadId, toolRegistry, threadCallbacks);

        const fullOpts: ThreadWorkerOptions = {
          getThreadSnapshot:
            workerOpts?.getThreadSnapshot ??
            (() => {
              const stored = threadStore.getThreadSnapshot(threadId);
              if (stored) return stored;
              return {
                id: threadId,
                v: 1,
                title: null,
                messages: [],
                env: "local",
                agentMode: "normal",
                relationships: [],
              } as unknown as ThreadSnapshot;
            }),
          updateThreadSnapshot:
            workerOpts?.updateThreadSnapshot ??
            ((snapshot: ThreadSnapshot) => {
              // Task 3: scheduleUpload=true marks the thread dirty so auto-save persists it
              // 逆向: amp 1244_ThreadWorker_ov.js:248-254 (threadReadWriter auto-persist)
              threadStore.setCachedThread(snapshot, { scheduleUpload: true });
            }),
          getMessages:
            workerOpts?.getMessages ??
            (() => {
              const snapshot = threadStore.getThreadSnapshot(threadId);
              return (snapshot?.messages ?? []) as unknown as import("@flitter/schemas").Message[];
            }),
          provider:
            workerOpts?.provider ??
            createFallbackProvider(resolveModelName(configService.get().settings)),
          toolOrchestrator: threadOrchestrator,
          buildSystemPrompt:
            workerOpts?.buildSystemPrompt ??
            (async () => {
              const config = configService.get();
              const contextBlocks = await collectContextBlocks({
                getConfig: () => config,
                listSkills: () => skillService.list(),
                workspaceRoot: opts.workspaceRoot,
                workingDirectory: opts.workspaceRoot,
                discoverGuidanceFiles: (loadOpts) => guidanceLoader.discover(loadOpts),
              });
              const toolDefs = toolRegistry.getToolDefinitions(config.settings);
              return assembleSystemPrompt({
                toolDefinitions: toolDefs,
                contextBlocks,
              });
            }),
          checkAndCompact:
            workerOpts?.checkAndCompact ??
            (async (snapshot: ThreadSnapshot) => {
              const result = await contextManager.checkAndCompact(snapshot);
              return result.compacted ? result.thread : null;
            }),
          getConfig: workerOpts?.getConfig ?? (() => configService.get()),
          toolRegistry: workerOpts?.toolRegistry ?? toolRegistry,
        };

        const worker = new ThreadWorkerImpl(fullOpts);
        workerRef = worker;

        // Feed actual API token counts from inference:complete events to ContextManager
        // 逆向: amp feeds usage.input_tokens to context tracking (chunk-004.js:32300)
        worker.events$.subscribe((event) => {
          if (
            event.type === "inference:complete" &&
            event.usage &&
            typeof event.usage.inputTokens === "number" &&
            event.usage.inputTokens > 0
          ) {
            contextManager.updateLastApiTokens(event.usage.inputTokens);
          }
        });

        // 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:259-270
        // resume() truncates incomplete streaming messages and resumes
        // in-progress tools. It's async (for onResume), but we fire-and-forget
        // here to keep createThreadWorker synchronous. Errors are swallowed
        // since onResume is best-effort crash recovery.
        worker.resume().catch(() => {});

        return worker;
      },

      async asyncDispose() {
        if (disposed) return;
        disposed = true;
        log.info("Disposing service container...");
        // 反序清理: 最后创建的先清理
        for (let i = disposables.length - 1; i >= 0; i--) {
          try {
            await disposables[i].dispose();
          } catch (err) {
            log.warn("Dispose error", { error: err });
          }
        }
        log.info("Service container disposed.");
      },
    };

    // Wire the deferred containerRef so SubAgentManager.createWorker works
    // 逆向: amp 1354_unknown_wi.js (subagent runner uses container.createThreadWorker)
    containerRef = container;

    // Wire ThreadWorkerService — uses container.createThreadWorker as its factory
    // 逆向: QWT uses container's deps to create workers
    threadWorkerService = new ThreadWorkerService((threadId) =>
      container.createThreadWorker(threadId),
    );
    container.threadWorkerService = threadWorkerService;
    // Wire ThreadStore into ThreadWorkerService for seedThreadMessages / applyParentRelationship
    // 逆向: amp QWT receives deps (including threadStore) in method calls
    threadWorkerService.setThreadStore(threadStore);
    disposables.push({ dispose: () => threadWorkerService.disposeAll() });
    log.info("ThreadWorkerService created");

    // 12. Register cross-thread coordination tools (depends on ThreadWorkerService + ThreadStore)
    // 逆向: amp-cli-reversed — thread_status in SiT (deep tools), send_message_to_thread in jiT (aggman tools)
    // Flitter: both registered as builtin tools, wired to local ThreadWorkerService.
    toolRegistry.register(
      createThreadStatusTool({
        getThreadStatus: (threadId) => {
          const worker = threadWorkerService!.get(threadId);
          if (!worker) return undefined;
          // 逆向: f3T(T, R) — compute status from worker inference state + tool state
          const inferenceState = worker.inferenceState$.getValue();
          const snapshot = threadStore.getThreadSnapshot(threadId);
          // 逆向: E4R(T) — count running/blocked tools from last user message
          let running = 0;
          let blocked = 0;
          if (snapshot && inferenceState !== "running") {
            const lastMsg = snapshot.messages.at(-1);
            if (lastMsg && (lastMsg as { role: string }).role === "user") {
              const content = (lastMsg as { content: unknown[] }).content;
              if (Array.isArray(content)) {
                for (const block of content as Array<Record<string, unknown>>) {
                  if (block.type === "tool_result") {
                    const run = block.run as { status: string } | undefined;
                    if (run?.status === "in-progress") running++;
                    else if (run?.status === "blocked-on-user") blocked++;
                  }
                }
              }
            }
          }
          // 逆向: IUT(T, R, a) — compute interaction state
          let interactionState: string | false = false;
          if (inferenceState !== "running" && inferenceState !== "cancelled" && snapshot) {
            const lastMsg = snapshot.messages.at(-1);
            if (!lastMsg) {
              interactionState = "user-message-initial";
            } else if ((lastMsg as { role: string }).role === "assistant") {
              const state = (lastMsg as { state?: { type: string; stopReason?: string } }).state;
              if (state?.type === "complete" && state.stopReason === "end_turn") {
                interactionState = "user-message-reply";
              }
            } else if (blocked > 0) {
              interactionState = "user-tool-approval";
            } else if (running > 0) {
              interactionState = "tool-running";
            }
          }
          return {
            inferenceState,
            toolState: { running, blocked },
            interactionState,
          };
        },
        getThreadSnapshot: (threadId) => threadStore.getThreadSnapshot(threadId),
        getActiveThreadIds: () => threadWorkerService!.threadIds,
      }),
    );
    toolRegistry.register(
      createSendMessageToThreadTool({
        sendMessage: async (threadId, message, _workflow) => {
          const worker = threadWorkerService!.get(threadId);
          if (!worker) return false;
          // 逆向: amp enqueues a user message via worker.handle({ type: "user:message", ... })
          // Flitter: use ThreadWorker.enqueueMessage()
          const snapshot = threadStore.getThreadSnapshot(threadId);
          const messageId =
            (snapshot as { nextMessageId?: number } | undefined)?.nextMessageId ?? 1;
          worker.enqueueMessage({
            role: "user",
            messageId,
            content: [{ type: "text", text: message }],
          } as import("@flitter/schemas").Message);
          return true;
        },
        hasThread: (threadId) => threadWorkerService!.has(threadId),
      }),
    );
    log.info("thread_status and send_message_to_thread tools registered");

    return container;
  } catch (err) {
    // Partial failure: 清理已创建的服务
    log.error("Container initialization failed, cleaning up...", { error: err });
    for (let i = disposables.length - 1; i >= 0; i--) {
      try {
        await disposables[i].dispose();
      } catch {
        // 忽略清理错误
      }
    }
    throw err;
  }
}
