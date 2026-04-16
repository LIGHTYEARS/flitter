/**
 * ScrollBehavior — 键盘/鼠标滚动事件处理。
 *
 * 逆向: amp P1T (2135_unknown_P1T.js) — handleKeyEvent 实现完整的
 * vim/标准键绑定, handleScrollDelta 执行带钳位的偏移更新。
 *
 * 替代旧的 ScrollKeyHandler，提供与 Focus 系统兼容的 KeyEventResult 返回值。
 * 支持 vertical 和 horizontal 两个 axis direction（与 amp P1T 对齐）。
 *
 * @module
 */

import type { KeyEventResult } from "../focus/focus-node.js";
import type { KeyEvent } from "../vt/types.js";
import type { ScrollController } from "./scroll-controller.js";

// ════════════════════════════════════════════════════
//  Types
// ════════════════════════════════════════════════════

/** ScrollBehavior 配置选项 */
interface ScrollBehaviorOptions {
  /** 每次按键滚动行数，默认 3（逆向: amp P1T.getScrollStep fallback） */
  scrollStep?: number;
  /** 翻页滚动行数，默认 10（逆向: amp P1T.getPageScrollStep） */
  pageScrollStep?: number;
}

/** 滚动轴方向 */
export type AxisDirection = "vertical" | "horizontal";

// ════════════════════════════════════════════════════
//  ScrollBehavior
// ════════════════════════════════════════════════════

/**
 * ScrollBehavior — 键盘和鼠标滚动行为。
 *
 * 逆向: amp P1T in 2135_unknown_P1T.js
 *
 * 完整键绑定表（vertical 模式）：
 * - ArrowUp / ArrowDown: 上下滚动 step（arrow 有 maxScrollExtent 守卫）
 * - k / j: vim 上下滚动 step（无 maxScrollExtent 守卫，与 amp 对齐）
 * - PageUp / PageDown: 翻页
 * - Ctrl+u / Ctrl+d: 翻页
 * - Home / End: 顶/底
 * - g / G(shift+g): 顶/底
 *
 * 完整键绑定表（horizontal 模式）：
 * - ArrowLeft / ArrowRight: 左右滚动 step
 * - h / l: vim 左右滚动 step
 * - Home / End: 左/右边缘
 * - g / G(shift+g): 左/右边缘
 */
export class ScrollBehavior {
  private _controller: ScrollController;
  private _scrollStep: number;
  private _pageScrollStep: number;
  private _axisDirection: AxisDirection;

  constructor(
    controller: ScrollController,
    options?: ScrollBehaviorOptions & { axisDirection?: AxisDirection },
  ) {
    this._controller = controller;
    this._scrollStep = options?.scrollStep ?? 3;
    this._pageScrollStep = options?.pageScrollStep ?? 10;
    this._axisDirection = options?.axisDirection ?? "vertical";
  }

  get controller(): ScrollController {
    return this._controller;
  }

  set controller(value: ScrollController) {
    this._controller = value;
  }

  get axisDirection(): AxisDirection {
    return this._axisDirection;
  }

  set axisDirection(value: AxisDirection) {
    this._axisDirection = value;
  }

  /**
   * 逆向: amp P1T.handleKeyEvent — 完整键绑定表。
   *
   * 注意与 amp 对齐的细节：
   * - ArrowUp/ArrowDown 有 maxScrollExtent <= 0 守卫（可能时返回 "ignored"）
   * - k/j 没有这个守卫（总是返回 "handled"）
   * - Ctrl+u/d 在非 ctrl 时 break（fall through 到 "ignored"）
   * - 使用 event.modifiers.ctrl/shift（我们的 KeyEvent 格式）
   */
  handleKeyEvent(event: KeyEvent): KeyEventResult {
    const { key, modifiers } = event;

    if (this._axisDirection === "vertical") {
      return this._handleVerticalKey(key, modifiers);
    }
    if (this._axisDirection === "horizontal") {
      return this._handleHorizontalKey(key, modifiers);
    }
    return "ignored";
  }

  /**
   * 逆向: amp P1T vertical switch — key bindings for vertical scrolling。
   */
  private _handleVerticalKey(
    key: string,
    modifiers: { ctrl: boolean; shift: boolean; alt: boolean; meta: boolean },
  ): KeyEventResult {
    // 逆向: amp P1T — canScroll guard only on ArrowUp/ArrowDown
    const canScroll = this._controller.maxScrollExtent > 0;

    switch (key) {
      case "ArrowUp":
        // 逆向: amp P1T line 16 — early return "ignored" when maxScrollExtent <= 0
        if (!canScroll) return "ignored";
        this.handleScrollDelta(-this._scrollStep);
        return "handled";

      case "ArrowDown":
        // 逆向: amp P1T line 19 — early return "ignored" when maxScrollExtent <= 0
        if (!canScroll) return "ignored";
        this.handleScrollDelta(this._scrollStep);
        return "handled";

      case "k":
        // 逆向: amp P1T line 21 — NO canScroll guard, always "handled"
        this.handleScrollDelta(-this._scrollStep);
        return "handled";

      case "j":
        // 逆向: amp P1T line 23 — NO canScroll guard, always "handled"
        this.handleScrollDelta(this._scrollStep);
        return "handled";

      case "PageUp":
        this.handleScrollDelta(-this._pageScrollStep);
        return "handled";

      case "PageDown":
        this.handleScrollDelta(this._pageScrollStep);
        return "handled";

      case "u":
        // 逆向: amp P1T line 30 — only handled with ctrl
        if (modifiers.ctrl) {
          this.handleScrollDelta(-this._pageScrollStep);
          return "handled";
        }
        return "ignored";

      case "d":
        // 逆向: amp P1T line 33 — only handled with ctrl
        if (modifiers.ctrl) {
          this.handleScrollDelta(this._pageScrollStep);
          return "handled";
        }
        return "ignored";

      case "Home":
        this._controller.scrollToTop();
        return "handled";

      case "End":
        this._controller.scrollToBottom();
        return "handled";

      case "g":
        // 逆向: amp P1T line 40 — shift=bottom, no shift=top
        if (modifiers.shift) {
          this._controller.scrollToBottom();
        } else {
          this._controller.scrollToTop();
        }
        return "handled";

      case "G":
        // 真实终端中 Shift+g 产生字符 "G"（无 shift modifier）
        this._controller.scrollToBottom();
        return "handled";

      default:
        return "ignored";
    }
  }

  /**
   * 逆向: amp P1T horizontal switch — key bindings for horizontal scrolling。
   */
  private _handleHorizontalKey(
    key: string,
    modifiers: { ctrl: boolean; shift: boolean; alt: boolean; meta: boolean },
  ): KeyEventResult {
    switch (key) {
      case "ArrowLeft":
        this.handleScrollDelta(-this._scrollStep);
        return "handled";

      case "ArrowRight":
        this.handleScrollDelta(this._scrollStep);
        return "handled";

      case "h":
        this.handleScrollDelta(-this._scrollStep);
        return "handled";

      case "l":
        this.handleScrollDelta(this._scrollStep);
        return "handled";

      case "Home":
        this._controller.scrollToTop();
        return "handled";

      case "End":
        this._controller.scrollToBottom();
        return "handled";

      case "g":
        // 逆向: amp P1T horizontal g — same as vertical
        if (modifiers.shift) {
          this._controller.scrollToBottom();
        } else {
          this._controller.scrollToTop();
        }
        return "handled";

      case "G":
        // 真实终端中 Shift+g 产生字符 "G"（无 shift modifier）
        this._controller.scrollToBottom();
        return "handled";

      default:
        return "ignored";
    }
  }

  /**
   * 逆向: amp P1T → scrollableState.handleScrollDelta — 钳位偏移更新。
   *
   * jumpTo 内部会 clamp 到 [0, maxScrollExtent]。
   */
  handleScrollDelta(delta: number): void {
    const newOffset = this._controller.offset + delta;
    this._controller.jumpTo(newOffset);
  }
}
