/**
 * 交互式 TUI 模式入口
 *
 * 组装真正的 Widget 组件树、启动 runApp、连接 ThreadWorker 事件到 UI。
 * ThreadStateWidget 拥有完整的布局 (ConversationView + StatusBar + InputField)，
 * 不再在此处传递 InputField 作为 child。
 *
 * 组件树:
 *   AppWidget (ThemeController -> ConfigProvider -> child)
 *     └── ThreadStateWidget (对话状态 + 完整布局)
 *         ├── Expanded > Scrollable > ConversationView
 *         ├── StatusBar
 *         └── InputField
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

import type { ServiceContainer } from "@flitter/flitter";
import type { ThreadSnapshot } from "@flitter/schemas";
import { runApp } from "@flitter/tui";
import type { CliContext } from "../context.js";
import { AppWidget } from "../widgets/app-widget.js";
import type { ThemeData } from "../widgets/theme-controller.js";
import { ThreadStateWidget } from "../widgets/thread-state-widget.js";
import { ToastManager } from "../widgets/toast-manager.js";

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

// ─── 默认主题 ─────────────────────────────────────────────

/**
 * 默认终端主题数据
 *
 * 使用 "terminal" 风格的暗色方案作为默认主题。
 * 与 ThemeController InheritedWidget 使用的 ThemeData 接口兼容。
 *
 * 逆向: 默认 terminal 主题色 (html-sanitizer-repl.js)
 */
export const defaultThemeData: ThemeData = {
  name: "terminal",
  primary: "#7aa2f7",
  secondary: "#9ece6a",
  surface: "#1a1b26",
  background: "#16161e",
  error: "#f7768e",
  text: "#a9b1d6",
  mutedText: "#565f89",
  border: "#3b4261",
  accent: "#bb9af7",
  success: "#9ece6a",
  warning: "#e0af68",
};

// ─── 核心函数 ─────────────────────────────────────────────

/**
 * 解析要使用的 thread
 *
 * - context.threadId 指定 -> 恢复已有 thread
 * - context.continueThread -> 恢复最近的 thread
 * - 否则 -> 新建 thread
 *
 * 逆向: _70 内 thread 解析逻辑 (D-13)
 */
async function resolveThread(
  container: ServiceContainer,
  context: CliContext & { threadId?: string; continueThread?: boolean },
): Promise<string> {
  // 指定 threadId -> 直接恢复
  if (context.threadId) {
    log.info("Resuming thread", { threadId: context.threadId });
    return context.threadId;
  }

  // --continue 标志: 恢复最近的 thread
  if (context.continueThread) {
    const listFn = (
      container.threadStore as unknown as { listThreads?: () => Array<{ id: string }> }
    ).listThreads;
    const threads = listFn?.() ?? [];
    if (threads.length > 0) {
      const latest = threads[0]; // 最近的排在前面
      log.info("Continuing most recent thread", { threadId: latest.id });
      return latest.id;
    }
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
 * 启动交互式 TUI 模式
 *
 * 完整流程:
 * 1. 读取主题设置
 * 2. 创建或恢复 thread
 * 3. 创建 ThreadWorker
 * 4. 组装真实 Widget 树 (AppWidget -> ThreadStateWidget)
 *    ThreadStateWidget 内部拥有完整布局 (ConversationView + StatusBar + InputField)
 * 5. 启动 TUI (runApp)
 * 6. 清理资源 (finally)
 * 7. 输出 thread URL (如有消息)
 *
 * 逆向: _70() in html-sanitizer-repl.js:1327-1388
 */
export async function launchInteractiveMode(
  container: ServiceContainer,
  context: CliContext & { threadId?: string; continueThread?: boolean },
): Promise<void> {
  log.info("Launching interactive TUI mode...");

  // 1. 解析主题数据
  const config = container.configService.get();
  const themeName =
    ((config.settings as Record<string, unknown>)["terminal.theme"] as string) ?? "terminal";
  const themeData: ThemeData = { ...defaultThemeData, name: themeName };

  // 2. 创建或恢复 thread
  const threadId = await resolveThread(container, context);
  log.info("Thread resolved", { threadId });

  // 3. 创建 ThreadWorker
  const worker = container.createThreadWorker(threadId);

  // 逆向: toastController = new BQT() (chunk-006.js:34489)
  const toastManager = new ToastManager();

  // 4-5. 组装真实 Widget 树并启动 runApp
  // ThreadStateWidget 拥有完整布局 (ConversationView + StatusBar + InputField)
  try {
    await runApp(
      new AppWidget({
        themeData,
        configService: container.configService,
        child: new ThreadStateWidget({
          threadStore: container.threadStore,
          threadWorker: worker,
          threadId,
          onSubmit: (text: string) => {
            // 将用户消息追加到线程快照 (per KD-47)
            const snapshot = container.threadStore.getThreadSnapshot(threadId);
            if (snapshot) {
              container.threadStore.setCachedThread({
                ...snapshot,
                messages: [
                  ...snapshot.messages,
                  { role: "user", content: [{ type: "text", text }] },
                ],
              } as ThreadSnapshot);
            }
            // 触发推理循环
            worker.runInference();
          },
          modelName:
            ((config.settings as Record<string, unknown>)["llm.model"] as string) ??
            "claude-sonnet-4-20250514",
          tokenCount: 0,
          toastManager,
        }),
      }),
      {
        onRootElementMounted: (rootElement) => {
          // 将根元素绑定到容器，供后续逻辑使用
          log.info("Root element mounted");
          (container as unknown as Record<string, unknown>)._rootElement = rootElement;
        },
      },
    );
  } finally {
    // 6. 清理
    log.info("TUI exited, cleaning up...");
    toastManager.dispose();
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
 * 允许测试直接调用内部函数进行验证
 */
export const _testing = {
  /** 暴露 resolveThread 供测试直接调用 */
  resolveThread,
};
