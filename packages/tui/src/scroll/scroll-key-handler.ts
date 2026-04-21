/**
 * 滚动键盘与鼠标事件处理器。
 *
 * {@link ScrollKeyHandler} 将 vim 风格 + 标准键盘按键 + 鼠标滚轮事件
 * 映射到 {@link ScrollController} 的滚动操作。
 *
 * 对应逆向工程中的 P1T 类 (widget-property-system.js 行 300-392)。
 *
 * @module
 */

import type { KeyEvent, MouseAction } from "../vt/types.js";
import type { ScrollController } from "./scroll-controller.js";

// ════════════════════════════════════════════════════
//  ScrollKeyHandler 配置
// ════════════════════════════════════════════════════

/**
 * ScrollKeyHandler 构造选项。
 */
export interface ScrollKeyHandlerOptions {
  /** 每次按键滚动行数，默认 3 */
  scrollStep?: number;
  /** 翻页滚动行数，默认 10 */
  pageScrollStep?: number;
}

// ════════════════════════════════════════════════════
//  ScrollKeyHandler
// ════════════════════════════════════════════════════

/**
 * 滚动事件处理器。
 *
 * 支持以下键位映射（仅垂直方向）：
 * - ArrowUp / k: 向上滚动 scrollStep 行
 * - ArrowDown / j: 向下滚动 scrollStep 行
 * - PageUp: 向上翻半页
 * - PageDown: 向下翻半页
 * - Ctrl+u: 向上翻半页
 * - Ctrl+d: 向下翻半页
 * - Home / g: 滚动到顶部
 * - End / G (shift+g): 滚动到底部
 *
 * 鼠标滚轮：
 * - wheel_up: 向上滚动 scrollStep 行
 * - wheel_down: 向下滚动 scrollStep 行
 *
 * @example
 * ```ts
 * const handler = new ScrollKeyHandler({ scrollStep: 3 });
 * const handled = handler.handleKeyEvent(event, controller, 20);
 * if (handled) { /* 事件已消费 *\/ }
 * ```
 */
export class ScrollKeyHandler {
  /** 每次按键滚动行数 */
  private _scrollStep: number;

  /**
   * 创建滚动事件处理器。
   *
   * @param options - 可选配置
   */
  constructor(options?: ScrollKeyHandlerOptions) {
    this._scrollStep = options?.scrollStep ?? 3;
    this._pageScrollStep = options?.pageScrollStep ?? 10;
  }

  /**
   * 处理键盘事件。
   *
   * 将匹配的按键映射到 ScrollController 方法。
   * 返回 true 表示事件已消费，false 表示未处理。
   *
   * @param event - 键盘事件
   * @param controller - 滚动控制器
   * @param viewportSize - 视口高度（行数），用于翻页计算
   * @returns 事件是否已消费
   */
  handleKeyEvent(event: KeyEvent, controller: ScrollController, viewportSize: number): boolean {
    const { key, modifiers } = event;

    switch (key) {
      case "ArrowUp":
        controller.scrollUp(this._scrollStep);
        return true;

      case "ArrowDown":
        controller.scrollDown(this._scrollStep);
        return true;

      case "k":
        controller.scrollUp(this._scrollStep);
        return true;

      case "j":
        controller.scrollDown(this._scrollStep);
        return true;

      case "PageUp":
        controller.scrollPageUp(viewportSize);
        return true;

      case "PageDown":
        controller.scrollPageDown(viewportSize);
        return true;

      case "u":
        if (modifiers.ctrl) {
          controller.scrollPageUp(viewportSize);
          return true;
        }
        return false;

      case "d":
        if (modifiers.ctrl) {
          controller.scrollPageDown(viewportSize);
          return true;
        }
        return false;

      case "Home":
        controller.scrollToTop();
        return true;

      case "End":
        controller.scrollToBottom();
        return true;

      case "g":
        if (modifiers.shift) {
          controller.scrollToBottom();
        } else {
          controller.scrollToTop();
        }
        return true;

      default:
        return false;
    }
  }

  /**
   * 处理鼠标滚轮事件。
   *
   * @param action - 鼠标动作类型
   * @param controller - 滚动控制器
   * @returns 事件是否已消费
   */
  handleMouseScroll(action: MouseAction | string, controller: ScrollController): boolean {
    switch (action) {
      case "wheel_up":
        controller.scrollUp(this._scrollStep);
        return true;

      case "wheel_down":
        controller.scrollDown(this._scrollStep);
        return true;

      default:
        return false;
    }
  }
}
