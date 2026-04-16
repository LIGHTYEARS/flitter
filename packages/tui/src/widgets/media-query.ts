/**
 * MediaQuery — InheritedWidget 注入终端尺寸和能力信息。
 *
 * {@link MediaQueryData} 封装终端环境数据（尺寸 + 能力），
 * {@link MediaQuery} 作为 {@link InheritedWidget} 将数据注入 Widget 树。
 * 任意后代 Widget 可通过 {@link MediaQuery.of}(context) 访问当前终端信息。
 *
 * 逆向参考: BM in tui-layout-engine.js:1046-1058 (MediaQueryData)
 * 逆向参考: I9 in tui-layout-engine.js (MediaQuery)
 *
 * @example
 * ```ts
 * // 提供侧 (WidgetsBinding)
 * const data = new MediaQueryData(
 *   { width: 120, height: 40 },
 *   { emojiWidth: true, syncOutput: false, kittyKeyboard: false, colorPaletteNotifications: false, xtversion: null },
 * );
 * const root = new MediaQuery({ data, child: myAppWidget });
 *
 * // 消费侧
 * const mediaData = MediaQuery.of(context);
 * const { width, height } = mediaData.size;
 * if (mediaData.supportsEmojiWidth) { /* ... *\/ }
 * ```
 *
 * @module
 */

import type { Element, Widget } from "../tree/element.js";
import { InheritedWidget } from "../tree/inherited-widget.js";
import type { TerminalCapabilities } from "../tui/tui-controller.js";

// ════════════════════════════════════════════════════
//  MediaQueryData
// ════════════════════════════════════════════════════

/**
 * 终端环境数据。
 *
 * 封装终端的尺寸信息和能力信息，由 {@link MediaQuery} InheritedWidget 向下传递。
 *
 * 逆向: BM in tui-layout-engine.js:1046-1058
 *
 * @example
 * ```ts
 * const data = new MediaQueryData(
 *   { width: 80, height: 24 },
 *   { emojiWidth: false, syncOutput: true, kittyKeyboard: false, colorPaletteNotifications: false, xtversion: null },
 * );
 * console.log(data.size.width);         // 80
 * console.log(data.supportsSyncOutput); // true
 * ```
 */
export class MediaQueryData {
  /** 终端尺寸 (列数 x 行数) */
  readonly size: { width: number; height: number };

  /** 终端能力信息 */
  readonly capabilities: TerminalCapabilities;

  /**
   * 创建 MediaQueryData 实例。
   *
   * @param size - 终端尺寸 { width, height }
   * @param capabilities - 终端能力信息
   */
  constructor(size: { width: number; height: number }, capabilities: TerminalCapabilities) {
    this.size = size;
    this.capabilities = capabilities;
  }

  /**
   * 是否支持 Emoji 宽度检测。
   *
   * 便捷 getter，等价于 `this.capabilities.emojiWidth`。
   *
   * @returns true 表示终端支持准确的 Emoji 宽度
   */
  get supportsEmojiWidth(): boolean {
    return this.capabilities.emojiWidth;
  }

  /**
   * 是否支持同步输出 (DEC Private Mode 2026)。
   *
   * 便捷 getter，等价于 `this.capabilities.syncOutput`。
   *
   * @returns true 表示终端支持同步输出
   */
  get supportsSyncOutput(): boolean {
    return this.capabilities.syncOutput;
  }
}

// ════════════════════════════════════════════════════
//  MediaQuery
// ════════════════════════════════════════════════════

/**
 * MediaQuery — InheritedWidget 注入终端尺寸和能力。
 *
 * 逆向: I9 in tui-layout-engine.js
 *
 * WidgetsBinding 使用 MediaQuery 包裹 rootWidget，将终端尺寸和能力信息
 * 向下传递到整棵 Widget 树。当窗口 resize 或能力变化时，
 * {@link updateShouldNotify} 返回 true，所有依赖方自动重建。
 *
 * @example
 * ```ts
 * // 消费侧
 * const data = MediaQuery.of(context);
 * const { width, height } = data.size;
 *
 * // 便捷方法
 * const size = MediaQuery.sizeOf(context);
 * const caps = MediaQuery.capabilitiesOf(context);
 * ```
 */
export class MediaQuery extends InheritedWidget {
  /** 终端环境数据 */
  readonly data: MediaQueryData;

  /**
   * 创建 MediaQuery 实例。
   *
   * @param opts - 配置项
   * @param opts.data - 终端环境数据
   * @param opts.child - 子 Widget
   */
  constructor(opts: { data: MediaQueryData; child: Widget }) {
    super({ child: opts.child });
    this.data = opts.data;
  }

  /**
   * 判断是否需要通知依赖方。
   *
   * 当 size (width/height) 或 capabilities (emojiWidth/syncOutput) 变化时返回 true。
   *
   * @param oldWidget - 更新前的旧 MediaQuery
   * @returns 数据变化时返回 true
   */
  updateShouldNotify(oldWidget: MediaQuery): boolean {
    const oldData = oldWidget.data;
    return (
      this.data.size.width !== oldData.size.width ||
      this.data.size.height !== oldData.size.height ||
      this.data.capabilities.emojiWidth !== oldData.capabilities.emojiWidth ||
      this.data.capabilities.syncOutput !== oldData.capabilities.syncOutput
    );
  }

  /**
   * 从上下文获取 MediaQueryData。
   *
   * 沿祖先链查找最近的 MediaQuery InheritedWidget，
   * 返回其 data 属性。同时注册依赖关系，
   * 当 MediaQuery 数据变化时自动触发重建。
   *
   * @param context - 当前 Element 上下文
   * @returns MediaQueryData 实例
   * @throws {Error} 当祖先树中无 MediaQuery 时抛出
   *
   * @example
   * ```ts
   * const data = MediaQuery.of(context);
   * console.log(data.size.width, data.size.height);
   * ```
   */
  static of(context: Element): MediaQueryData {
    const element = context.dependOnInheritedWidgetOfExactType(MediaQuery);
    if (!element) throw Error("MediaQuery not found in ancestor tree");
    return (element.widget as MediaQuery).data;
  }

  /**
   * 便捷方法: 获取终端尺寸。
   *
   * 等价于 `MediaQuery.of(context).size`。
   *
   * @param context - 当前 Element 上下文
   * @returns 终端尺寸 { width, height }
   *
   * @example
   * ```ts
   * const { width, height } = MediaQuery.sizeOf(context);
   * ```
   */
  static sizeOf(context: Element): { width: number; height: number } {
    return MediaQuery.of(context).size;
  }

  /**
   * 便捷方法: 获取终端能力。
   *
   * 等价于 `MediaQuery.of(context).capabilities`。
   *
   * @param context - 当前 Element 上下文
   * @returns 终端能力信息
   *
   * @example
   * ```ts
   * const caps = MediaQuery.capabilitiesOf(context);
   * if (caps.syncOutput) { /* ... *\/ }
   * ```
   */
  static capabilitiesOf(context: Element): TerminalCapabilities {
    return MediaQuery.of(context).capabilities;
  }
}
