/**
 * ThreadStateWidget — 线程/对话状态管理 Widget。
 *
 * {@link ThreadStateWidget} 扩展 {@link StatefulWidget}，管理线程/对话状态，
 * 监听 ThreadStore 变化并触发子树重建。
 *
 * 替代 interactive.ts 中的 stub ThreadStateWidget 类。
 *
 * 逆向参考: Z8R (html-sanitizer-repl.js ~1100)
 *
 * @example
 * ```ts
 * import { ThreadStateWidget } from "./thread-state-widget.js";
 *
 * const threadWidget = new ThreadStateWidget({
 *   threadStore: container.threadStore,
 *   threadWorker: worker,
 *   child: inputField,
 * });
 * ```
 *
 * @module
 */

import { StatefulWidget, State } from "@flitter/tui";
import type { Widget } from "@flitter/tui";
import type { BuildContext } from "@flitter/tui";

// ════════════════════════════════════════════════════
//  ThreadStateWidgetConfig 接口
// ════════════════════════════════════════════════════

/**
 * ThreadStateWidget 配置。
 *
 * @property threadStore - 线程存储引用 (实际类型为 @flitter/data ThreadStore)
 * @property threadWorker - 线程工作器引用 (实际类型为 @flitter/agent-core ThreadWorker)
 * @property child - 子 Widget (通常是 InputField + ConversationView 组合)
 */
export interface ThreadStateWidgetConfig {
  /** 线程存储引用 */
  threadStore: unknown;
  /** 线程工作器引用 */
  threadWorker: unknown;
  /** 子 Widget */
  child: Widget;
}

// ════════════════════════════════════════════════════
//  ThreadStateWidget
// ════════════════════════════════════════════════════

/**
 * 线程/对话状态管理 Widget。
 *
 * 监听 ThreadStore 变化并触发子树重建。
 * 持有 threadWorker 引用，子 Widget 可通过它发送消息。
 *
 * 逆向: Z8R (html-sanitizer-repl.js ~1100)
 */
export class ThreadStateWidget extends StatefulWidget {
  /** Widget 配置 */
  readonly config: ThreadStateWidgetConfig;

  /**
   * 创建 ThreadStateWidget。
   *
   * @param config - 线程状态 Widget 配置
   */
  constructor(config: ThreadStateWidgetConfig) {
    super();
    this.config = config;
  }

  /**
   * 创建关联的 ThreadStateWidgetState。
   *
   * @returns 新创建的 ThreadStateWidgetState 实例
   */
  createState(): ThreadStateWidgetState {
    return new ThreadStateWidgetState();
  }
}

// ════════════════════════════════════════════════════
//  ThreadStateWidgetState
// ════════════════════════════════════════════════════

/**
 * ThreadStateWidget 的状态管理。
 *
 * 在 initState 中订阅 ThreadStore 变化，在 dispose 中取消订阅。
 * build 方法返回 config.child。
 *
 * 逆向: wR 基类 (tui-widget-framework.js 1784-1813)
 */
export class ThreadStateWidgetState extends State<ThreadStateWidget> {
  /**
   * 初始化状态。
   *
   * TODO: 订阅 threadStore 变化，在数据变化时调用 setState() 触发重建。
   */
  initState(): void {
    super.initState();
    // TODO: subscribe to threadStore changes
    // const store = this.widget.config.threadStore;
    // store.onChange$.subscribe(() => this.setState());
  }

  /**
   * 清理资源。
   *
   * TODO: 取消 threadStore 订阅。
   */
  dispose(): void {
    // TODO: unsubscribe from threadStore
    super.dispose();
  }

  /**
   * 构建子 Widget 树。
   *
   * 返回 config.child (通常是 InputField + ConversationView 组合)。
   *
   * @param _context - 构建上下文
   * @returns config.child
   */
  build(_context: BuildContext): Widget {
    return this.widget.config.child;
  }
}
