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
  createTaskTool,
  executePostHook,
  executePreHook,
  matchHookToTool,
  matchPostExecuteHook,
  matchPreExecuteHook,
  type OrchestratorCallbacks,
  parseHooksConfig,
  SubAgentManager,
  ThreadWorker as ThreadWorkerImpl,
  ToolOrchestrator,
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
import type { MCPServerManager } from "@flitter/llm";
import { getProviderForModel } from "@flitter/llm";
import type { ThreadSnapshot } from "@flitter/schemas";
import { BehaviorSubject, createLogger } from "@flitter/util";
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
}

/**
 * 服务容器 — 包含所有已初始化的服务实例
 * 逆向: X3 返回值 (claude-config-system.js:1097-1324)
 */
export interface ServiceContainer {
  /** 配置服务 (三级合并 + 热重载) */
  configService: ConfigService;
  /** 工具注册表 (已注册 7 个内置工具) */
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

  /**
   * 创建 ThreadWorker 实例 (工厂模式)
   * 每次调用创建新的 worker, 绑定到指定线程
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

    // 2. ToolRegistry + 注册 7 个内置工具
    const toolRegistry = createToolRegistry();
    registerBuiltinTools(toolRegistry);
    log.info("ToolRegistry created, builtin tools registered");

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

    // Bridge MCP tools into ToolRegistry (reactive sync)
    const mcpBridge = syncMCPToolsToRegistry(mcpServerManager, toolRegistry);
    disposables.push({ dispose: () => mcpBridge.dispose() });
    log.info("MCP tools bridge started");

    // 6. SkillService
    const skillService = createSkillService(configService);
    log.info("SkillService created");

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

    // 9. ContextManager
    // 逆向: amp includes environment/tool context when building summaries
    // (chunk-002.js:20586, fwR collectContextBlocks)
    const contextManager = createContextManager({
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
        return containerRef.createThreadWorker(workerOpts.threadId);
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

    log.info("Service container initialized successfully.");

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
            // content block. Flitter simplifies: on "completed", append a new user
            // message with the tool_result block so the LLM sees it on the next
            // recursive runInference().
            if (event.status === "completed" && event.result) {
              const snapshot = threadStore.getThreadSnapshot(threadId);
              if (!snapshot) return;
              const toolResultMessage = {
                role: "user" as const,
                content: [
                  {
                    type: "tool_result" as const,
                    tool_use_id: event.toolUseId,
                    content: event.result.content ?? "",
                    is_error: event.result.status === "error",
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
              const result = applyHookAction(match, { toolUseId: hookResult.toolUseId });
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
              const result = applyHookAction(match, { toolUseId: hookResult.toolUseId });
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
            getProviderForModel(
              configService.get().settings["internal.model"] ?? "claude-sonnet-4-20250514",
            ),
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
          toolRegistry,
        };

        const worker = new ThreadWorkerImpl(fullOpts);
        workerRef = worker;

        // 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:259-270
        // resume() truncates incomplete streaming messages left over from a
        // previous session.  Idempotent — safe even for brand-new threads.
        worker.resume();

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
