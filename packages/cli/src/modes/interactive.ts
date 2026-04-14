/**
 * 交互式 TUI 模式入口
 *
 * 组装 Widget 组件树、启动 runApp、连接 ThreadWorker 事件到 UI。
 *
 * 组件树:
 *   ThemeController (动态主题)
 *     └── ConfigProvider (配置注入)
 *         └── AppWidget (线程管理)
 *             └── ThreadStateWidget (对话 UI)
 *
 * 逆向: _70() in html-sanitizer-repl.js:1327-1388
 *
 * @example
 * ```typescript
 * import { launchInteractiveMode } from "./interactive";
 * import { createContainer } from "@flitter/flitter";
 *
 * const container = await createContainer(opts);
 * const context = resolveCliContext(program);
 * await launchInteractiveMode(container, context);
 * ```
 */

import type { ThreadWorker } from "@flitter/agent-core";
import type { ServiceContainer } from "@flitter/flitter";
import type { ThreadSnapshot } from "@flitter/schemas";
import type { CliContext } from "../context";

// ─── 日志 ─────────────────────────────────────────────────

/**
 * 轻量日志辅助 (避免直接依赖 @flitter/util 运行时)
 */
const log = {
  info: (msg: string, meta?: Record<string, unknown>) => {
    if (process.env.FLITTER_DEBUG) {
      const suffix = meta ? ` ${JSON.stringify(meta)}` : "";
      process.stderr.write(`[interactive] ${msg}${suffix}\n`);
    }
  },
};

// ─── RunApp 类型 ──────────────────────────────────────────

/**
 * runApp 选项
 * 逆向: T1T 参数 (html-sanitizer-repl.js:~1300)
 */
export interface RunAppOptions {
  /** 根 Element 挂载完成后回调 */
  onRootElementMounted?: () => void;
}

/**
 * 抽象 Widget 基接口
 *
 * 在 interactive 模块中定义轻量级 Widget 接口,
 * 运行时由 @flitter/tui 的具体类替代。
 * 此处用于类型安全的组件树组装。
 */
export interface IWidget {
  /** Widget 类名 (用于测试验证) */
  readonly constructor: { name: string };
}

/**
 * runApp 函数签名: 挂载根 Widget 并启动帧调度器和渲染循环
 * 逆向: T1T (html-sanitizer-repl.js:~1300)
 */
type RunAppFn = (widget: IWidget, opts?: RunAppOptions) => Promise<void>;

/**
 * 默认 runApp 实现
 *
 * 在真实 TUI 模式下, 此函数将由 @flitter/tui 提供的 runApp 替代。
 * 当前作为占位实现。
 */
let _runApp: RunAppFn = async (_widget: IWidget, opts?: RunAppOptions) => {
  opts?.onRootElementMounted?.();
};

// ─── Widget 组件定义 ──────────────────────────────────────

/**
 * ThemeController — 动态主题控制器
 *
 * 从 configService 读取 terminal.theme 设置, 默认 'terminal'。
 * 订阅 config 变更, 动态切换主题。
 *
 * 逆向: FJT (html-sanitizer-repl.js:~1200)
 */
export class ThemeController implements IWidget {
  /** 主题名称 */
  readonly themeName: string;
  /** 子 Widget */
  readonly child: IWidget;

  constructor(opts: { themeName: string; child: IWidget }) {
    this.themeName = opts.themeName;
    this.child = opts.child;
  }
}

/**
 * ConfigProvider — 配置注入 (InheritedWidget 模式)
 *
 * 向子树提供 configService 引用。
 * 逆向: UJT (html-sanitizer-repl.js:~1250)
 */
export class ConfigProvider implements IWidget {
  /** 配置服务引用 */
  readonly configService: unknown;
  /** 子 Widget */
  readonly child: IWidget;

  constructor(opts: { configService: unknown; child: IWidget }) {
    this.configService = opts.configService;
    this.child = opts.child;
  }
}

/**
 * AppWidget — 主应用 Widget (StatefulWidget)
 *
 * 管理 ThreadPool / ThreadHandle 生命周期。
 * 逆向: QJT (html-sanitizer-repl.js:~900)
 */
export class AppWidget implements IWidget {
  /** 服务容器引用 */
  readonly container: ServiceContainer;
  /** ThreadWorker 引用 */
  readonly worker: ThreadWorker;

  constructor(opts: { container: ServiceContainer; worker: ThreadWorker }) {
    this.container = opts.container;
    this.worker = opts.worker;
  }
}

/**
 * ThreadStateWidget — 会话状态 Widget (StatefulWidget)
 *
 * 连接 ThreadWorker 事件流到对话 UI。
 * ThreadWorker 事件通过 agentEvents$ 驱动 UI 更新。
 * 逆向: Z8R (html-sanitizer-repl.js:~1100)
 */
export class ThreadStateWidget implements IWidget {
  /** ThreadWorker 引用 */
  readonly worker: ThreadWorker;

  constructor(opts: { worker: ThreadWorker }) {
    this.worker = opts.worker;
  }
}

// ─── 核心函数 ─────────────────────────────────────────────

/**
 * 解析要使用的 thread
 *
 * - context.threadId 指定 → 恢复已有 thread
 * - 否则 → 新建 thread
 *
 * 逆向: _70 内 thread 解析逻辑
 */
async function resolveThread(
  container: ServiceContainer,
  context: CliContext & { threadId?: string },
): Promise<string> {
  if (context.threadId) {
    // 恢复已有 thread
    log.info("Resuming thread", { threadId: context.threadId });
    return context.threadId;
  }

  // 创建新 thread
  const id = crypto.randomUUID();
  container.threadStore.setCachedThread({
    id,
    v: 0,
    messages: [],
    relationships: [],
  } as unknown as ThreadSnapshot);
  log.info("Created new thread", { threadId: id });
  return id;
}

/**
 * 组装 Widget 树
 *
 * 层级:
 *   ThemeController (动态主题)
 *     └── ConfigProvider (配置注入)
 *         └── AppWidget (线程管理)
 *             └── ThreadStateWidget (对话 UI)
 *
 * 逆向: _70 内组件树组装 (html-sanitizer-repl.js:1340-1370)
 */
function buildWidgetTree(
  container: ServiceContainer,
  worker: ThreadWorker,
  themeName: string,
): IWidget {
  // 最内层: AppWidget (管理线程生命周期)
  const appWidget = new AppWidget({ container, worker });

  // ConfigProvider 注入 configService
  const configProvider = new ConfigProvider({
    configService: container.configService,
    child: appWidget,
  });

  // 最外层: ThemeController (动态主题)
  const themeController = new ThemeController({
    themeName,
    child: configProvider,
  });

  return themeController;
}

/**
 * 处理优雅关闭
 *
 * Ctrl+C 触发: cancel 当前推理 → dispose → exit
 */
function handleShutdown(worker: ThreadWorker, _container: ServiceContainer): void {
  worker.cancelInference();
  log.info("Shutdown: cancelled inference, disposing container...");
}

/**
 * 启动交互式 TUI 模式
 *
 * 完整流程:
 * 1. 读取主题设置
 * 2. 创建或恢复 thread
 * 3. 创建 ThreadWorker
 * 4. 组装 Widget 树
 * 5. 启动 TUI (runApp)
 * 6. 清理资源 (finally)
 * 7. 输出 thread URL (如有消息)
 *
 * 逆向: _70() in html-sanitizer-repl.js:1327-1388
 */
export async function launchInteractiveMode(
  container: ServiceContainer,
  context: CliContext & { threadId?: string },
): Promise<void> {
  log.info("Launching interactive TUI mode...");

  // 1. 读取主题设置
  const config = container.configService.get();
  const themeName =
    ((config.settings as Record<string, unknown>)["terminal.theme"] as string) ?? "terminal";

  // 2. 创建或恢复 thread
  const threadId = await resolveThread(container, context);
  log.info("Thread resolved", { threadId });

  // 3. 创建 ThreadWorker
  const worker = container.createThreadWorker(threadId);

  // 4. 组装 Widget 树
  const app = buildWidgetTree(container, worker, themeName);

  // 5. 启动 TUI
  const startTime = process.hrtime.bigint();

  try {
    await _runApp(app, {
      onRootElementMounted: () => {
        const elapsed = Number(process.hrtime.bigint() - startTime) / 1_000_000;
        log.info(`Boot complete: ${elapsed.toFixed(0)}ms to interactive`);
      },
    });
  } finally {
    // 6. 清理
    log.info("TUI exited, cleaning up...");
    await container.asyncDispose();

    // 7. 退出前输出 thread URL
    const thread = container.threadStore.getThreadSnapshot(threadId);
    if (thread && thread.messages?.length > 0) {
      process.stdout.write(`\nThread: /threads/${threadId}\n`);
    }
  }
}

// ─── 测试辅助导出 ─────────────────────────────────────────

/**
 * 测试用内部方法导出
 *
 * 允许测试替换 runApp 实现和直接调用内部函数
 */
export const _testing = {
  /** 替换 runApp 实现 (用于测试 mock) */
  setRunApp: (fn: RunAppFn) => {
    _runApp = fn;
  },
  /** 暴露 resolveThread 供测试直接调用 */
  resolveThread,
  /** 暴露 buildWidgetTree 供测试直接调用 */
  buildWidgetTree,
  /** 暴露 handleShutdown 供测试验证 */
  handleShutdown,
};
