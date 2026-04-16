/**
 * Action 基类 — 知道如何执行一个 Intent。
 *
 * 逆向: amp UXT (2094_unknown_UXT.js) — isEnabled 默认 true,
 * consumesKey 默认 true, 子类 override invoke(intent)。
 *
 * @module
 */

import type { Intent } from "./intent.js";

/**
 * Action 基类。
 *
 * 子类实现 {@link invoke} 方法来处理特定类型的 Intent。
 * {@link isEnabled} 默认返回 true，子类可覆盖以实现条件启用。
 */
export abstract class Action<T extends Intent = Intent> {
  /**
   * 逆向: amp UXT.isEnabled — 默认返回 true。
   * 子类可覆盖以实现条件启用。
   */
  isEnabled(_intent: T): boolean {
    return true;
  }

  /**
   * 逆向: amp UXT.consumesKey — 默认返回 true。
   * 子类可覆盖以允许 key 事件继续传播。
   */
  consumesKey(_intent: T): boolean {
    return true;
  }

  /**
   * 执行此 Action。
   *
   * @returns "handled" 停止事件传播，"ignored" 继续传播
   */
  abstract invoke(intent: T): "handled" | "ignored" | void;

  toString(): string {
    return `${this.constructor.name}()`;
  }
}
