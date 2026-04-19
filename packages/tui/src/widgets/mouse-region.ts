/**
 * MouseRegion 鼠标区域组件。
 *
 * 包含 {@link RenderMouseRegion} 渲染对象和 {@link MouseRegion} Widget，
 * 用于接收鼠标事件（点击、进入、离开、悬停、滚动、拖拽、释放）。
 *
 * 逆向: G0 (Widget) + si (RenderObject) in 2026_tail_anonymous.js:158519-158675
 *
 * @module
 */

import type { HitTestResult } from "../gestures/hit-test.js";
import { MouseManager } from "../gestures/mouse-manager.js";
import type { Element, Widget as WidgetInterface } from "../tree/element.js";
import { RenderBox } from "../tree/render-box.js";
import type { RenderObject } from "../tree/render-object.js";
import type { RenderObjectWidget } from "../tree/render-object-element.js";
import type { Key } from "../tree/widget.js";
import { Widget } from "../tree/widget.js";
import { SingleChildRenderObjectElement } from "./padding.js";

// ════════════════════════════════════════════════════
//  MouseEvent 接口
// ════════════════════════════════════════════════════

/**
 * 鼠标事件接口。
 *
 * 逆向: si.handleMouseEvent 中根据 T.type 分派的事件对象
 *
 * Events are created by mouse-event-helpers.ts with structured position fields
 * (position: {x,y}, localPosition: {x,y}) rather than flat x/y.
 */
export interface MouseEvent {
  /** 事件类型 */
  type: "click" | "enter" | "exit" | "hover" | "scroll" | "drag" | "release";
  /** 全局坐标 */
  position: { x: number; y: number };
  /** 元素本地坐标 */
  localPosition: { x: number; y: number };
}

/** 鼠标事件回调类型 */
export type MouseEventCallback = (event: MouseEvent) => void;

// ════════════════════════════════════════════════════
//  RenderMouseRegion
// ════════════════════════════════════════════════════

/**
 * 鼠标区域渲染对象。
 *
 * 逆向: si extends O9 (2026_tail_anonymous.js:158576-158675)
 *
 * 负责处理鼠标事件分派、单子节点布局、命中测试中注册鼠标目标。
 * 在命中测试通过且存在鼠标监听器时，通过 HitTestResult.addMouseTarget
 * 将自身注册为鼠标事件目标。
 */
export class RenderMouseRegion extends RenderBox {
  /** 逆向: si.onClick */
  onClick: MouseEventCallback | null;
  /** 逆向: si.onEnter */
  onEnter: MouseEventCallback | null;
  /** 逆向: si.onExit */
  onExit: MouseEventCallback | null;
  /** 逆向: si.onHover */
  onHover: MouseEventCallback | null;
  /** 逆向: si.onScroll */
  onScroll: MouseEventCallback | null;
  /** 逆向: si.onRelease */
  onRelease: MouseEventCallback | null;
  /** 逆向: si.onDrag */
  onDrag: MouseEventCallback | null;
  /** 逆向: si.cursor */
  cursor: string | null;
  /** 逆向: si.opaque */
  opaque: boolean;
  /** 逆向: si._isHovered = !1 */
  private _isHovered = false;

  /**
   * 创建鼠标区域渲染对象。
   *
   * 逆向: si constructor({onClick, onEnter, onExit, onHover, onScroll, onRelease, onDrag, cursor, opaque})
   */
  constructor({
    onClick,
    onEnter,
    onExit,
    onHover,
    onScroll,
    onRelease,
    onDrag,
    cursor,
    opaque,
  }: {
    onClick: MouseEventCallback | null;
    onEnter: MouseEventCallback | null;
    onExit: MouseEventCallback | null;
    onHover: MouseEventCallback | null;
    onScroll: MouseEventCallback | null;
    onRelease: MouseEventCallback | null;
    onDrag: MouseEventCallback | null;
    cursor: string | null;
    opaque: boolean;
  }) {
    super();
    this.onClick = onClick;
    this.onEnter = onEnter;
    this.onExit = onExit;
    this.onHover = onHover;
    this.onScroll = onScroll;
    this.onRelease = onRelease;
    this.onDrag = onDrag;
    this.cursor = cursor;
    this.opaque = opaque;
  }

  /**
   * 是否存在任何鼠标监听器。
   *
   * 逆向: si.hasMouseListeners getter
   * `!!(this.onClick || this.onEnter || this.onExit || this.onHover || this.onScroll || this.onRelease || this.onDrag)`
   */
  get hasMouseListeners(): boolean {
    return !!(
      this.onClick ||
      this.onEnter ||
      this.onExit ||
      this.onHover ||
      this.onScroll ||
      this.onRelease ||
      this.onDrag
    );
  }

  /**
   * 当前是否处于悬停状态。
   *
   * 逆向: si.isHovered getter → this._isHovered
   */
  get isHovered(): boolean {
    return this._isHovered;
  }

  /**
   * 处理鼠标事件。
   *
   * 逆向: si.handleMouseEvent(T) — switch on T.type
   * - "click" → onClick
   * - "enter" → _isHovered=true, onEnter
   * - "exit" → _isHovered=false, onExit
   * - "hover" → onHover
   * - "scroll" → onScroll
   * - "drag" → onDrag
   * - "release" → onRelease
   */
  handleMouseEvent(event: MouseEvent): void {
    switch (event.type) {
      case "click":
        this.onClick?.(event);
        break;
      case "enter":
        this._isHovered = true;
        this.onEnter?.(event);
        break;
      case "exit":
        this._isHovered = false;
        this.onExit?.(event);
        break;
      case "hover":
        this.onHover?.(event);
        break;
      case "scroll":
        this.onScroll?.(event);
        break;
      case "drag":
        this.onDrag?.(event);
        break;
      case "release":
        this.onRelease?.(event);
        break;
    }
  }

  // ────────────────────────────────────────────────────
  //  布局 — 逆向: si.performLayout (2026_tail_anonymous.js:158632-158641)
  // ────────────────────────────────────────────────────

  /**
   * 执行单子节点布局。
   *
   * 逆向: si.performLayout — 有子节点时用约束布局子节点并采用其尺寸，
   * 无子节点时尺寸为 (0,0)。
   */
  performLayout(): void {
    const constraints = this._lastConstraints!;

    if (this._children.length > 0) {
      const child = this._children[0] as RenderBox;
      child.layout(constraints);
      const childSize = child.size;
      this.setSize(childSize.width, childSize.height);
      child.setOffset(0, 0);
    } else {
      this.setSize(0, 0);
    }
  }

  // ────────────────────────────────────────────────────
  //  固有尺寸 — 逆向: si.getMin/MaxIntrinsicWidth/Height
  // ────────────────────────────────────────────────────

  /**
   * 逆向: si.getMinIntrinsicHeight(T)
   * `if (this.children.length > 0) return this.children[0].getMinIntrinsicHeight(T); return 0;`
   */
  override getMinIntrinsicHeight(width: number): number {
    if (this._children.length > 0) {
      return (this._children[0] as RenderBox).getMinIntrinsicHeight(width);
    }
    return 0;
  }

  /**
   * 逆向: si.getMaxIntrinsicHeight(T)
   * `if (this.children.length > 0) return this.children[0].getMaxIntrinsicHeight(T); return 0;`
   */
  override getMaxIntrinsicHeight(width: number): number {
    if (this._children.length > 0) {
      return (this._children[0] as RenderBox).getMaxIntrinsicHeight(width);
    }
    return 0;
  }

  /**
   * 逆向: si.getMinIntrinsicWidth(T)
   * `if (this.children.length > 0) return this.children[0].getMinIntrinsicWidth(T); return 0;`
   */
  override getMinIntrinsicWidth(height: number): number {
    if (this._children.length > 0) {
      return (this._children[0] as RenderBox).getMinIntrinsicWidth(height);
    }
    return 0;
  }

  /**
   * 逆向: si.getMaxIntrinsicWidth(T)
   * `if (this.children.length > 0) return this.children[0].getMaxIntrinsicWidth(T); return 0;`
   */
  override getMaxIntrinsicWidth(height: number): number {
    if (this._children.length > 0) {
      return (this._children[0] as RenderBox).getMaxIntrinsicWidth(height);
    }
    return 0;
  }

  // ────────────────────────────────────────────────────
  //  绘制 — 逆向: si.paint (2026_tail_anonymous.js:158658-158660)
  // ────────────────────────────────────────────────────

  /**
   * 绘制子节点。
   *
   * 逆向: si.paint(T, R=0, a=0) — 有子节点时以偏移绘制
   * `if (this.children.length > 0) this.children[0].paint(T, R + this.offset.x, a + this.offset.y);`
   *
   * 注意: Flitter 的 paint 约定中，offsetX/Y 已经包含了本节点偏移，
   * 所以直接使用 RenderBox.paint 的默认实现即可（遍历子节点加偏移）。
   * 此处不需要覆盖 paint —— RenderBox.paint 已正确处理。
   */

  // ────────────────────────────────────────────────────
  //  命中测试 — 逆向: si.hitTest (2026_tail_anonymous.js:158661-158665)
  // ────────────────────────────────────────────────────

  /**
   * 命中测试。
   *
   * 逆向: si.hitTest(T, R, a=0, e=0)
   * ```
   * let t = super.hitTest(T, R, a, e);
   * if (t && this.hasMouseListeners) T.addMouseTarget(this, R);
   * return t;
   * ```
   *
   * 先调用父类 hitTest（检查几何范围 + 递归子节点），
   * 若命中且有鼠标监听器，将自身注册为鼠标事件目标。
   */
  override hitTest(
    result: HitTestResult,
    position: { x: number; y: number },
    offsetX = 0,
    offsetY = 0,
  ): boolean {
    const hit = super.hitTest(result, position, offsetX, offsetY);
    if (hit && this.hasMouseListeners) {
      result.addMouseTarget(this, position);
    }
    return hit;
  }

  // ────────────────────────────────────────────────────
  //  调试 — 逆向: si.getDebugProperties (2026_tail_anonymous.js:158666-158673)
  // ────────────────────────────────────────────────────

  /**
   * 获取调试属性。
   *
   * 逆向: si.getDebugProperties → { hasMouseListeners, isHovered, cursor, opaque }
   */
  getDebugProperties(): Record<string, unknown> {
    return {
      hasMouseListeners: this.hasMouseListeners,
      isHovered: this.isHovered,
      cursor: this.cursor,
      opaque: this.opaque,
    };
  }

  // ────────────────────────────────────────────────────
  //  清理 — 逆向: si.dispose (2026_tail_anonymous.js:158674-158676)
  // ────────────────────────────────────────────────────

  /**
   * 释放资源。
   *
   * 逆向: si.dispose — 清除所有回调引用，调用 super.dispose
   * `ha.instance.removeRegion(this), this.onClick = null, ... super.dispose()`
   */
  override dispose(): void {
    MouseManager.instance.removeRegion(this);
    this.onClick = null;
    this.onEnter = null;
    this.onExit = null;
    this.onHover = null;
    this.onScroll = null;
    this.onRelease = null;
    this.onDrag = null;
    this.cursor = null;
    super.dispose();
  }
}

// ════════════════════════════════════════════════════
//  MouseRegion Widget
// ════════════════════════════════════════════════════

/** MouseRegion 构造函数参数。 */
interface MouseRegionArgs {
  /** 可选标识键 */
  key?: Key;
  /** 可选子 Widget */
  child?: WidgetInterface;
  /** 点击回调 */
  onClick?: MouseEventCallback;
  /** 鼠标进入回调 */
  onEnter?: MouseEventCallback;
  /** 鼠标离开回调 */
  onExit?: MouseEventCallback;
  /** 鼠标悬停回调 */
  onHover?: MouseEventCallback;
  /** 滚轮事件回调 */
  onScroll?: MouseEventCallback;
  /** 释放回调 */
  onRelease?: MouseEventCallback;
  /** 拖拽回调 */
  onDrag?: MouseEventCallback;
  /** 鼠标光标样式 */
  cursor?: string;
  /** 是否不透明（阻止事件穿透），默认 true */
  opaque?: boolean;
}

/**
 * MouseRegion Widget。
 *
 * 逆向: G0 extends _t (2026_tail_anonymous.js:158519-158567)
 *
 * 用于在子 Widget 区域内接收鼠标事件。创建 {@link RenderMouseRegion}
 * 作为渲染对象。
 *
 * 属性说明:
 * - onClick: 点击时触发
 * - onEnter/onExit: 鼠标进入/离开时触发
 * - onHover: 鼠标在区域内移动时触发
 * - onScroll: 滚轮事件
 * - onDrag: 拖拽事件
 * - onRelease: 释放事件
 * - cursor: 光标样式
 * - opaque: 默认 true，阻止事件穿透
 */
export class MouseRegion extends Widget implements RenderObjectWidget {
  /** 逆向: G0.child */
  readonly child: WidgetInterface | undefined;
  /** 逆向: G0.onClick */
  readonly onClick: MouseEventCallback | null;
  /** 逆向: G0.onEnter */
  readonly onEnter: MouseEventCallback | null;
  /** 逆向: G0.onExit */
  readonly onExit: MouseEventCallback | null;
  /** 逆向: G0.onHover */
  readonly onHover: MouseEventCallback | null;
  /** 逆向: G0.onScroll */
  readonly onScroll: MouseEventCallback | null;
  /** 逆向: G0.onRelease */
  readonly onRelease: MouseEventCallback | null;
  /** 逆向: G0.onDrag */
  readonly onDrag: MouseEventCallback | null;
  /** 逆向: G0.cursor */
  readonly cursor: string | null;
  /** 逆向: G0.opaque (default true) */
  readonly opaque: boolean;

  /**
   * 创建 MouseRegion Widget。
   *
   * 逆向: G0 constructor({key, child, onClick, onEnter, onExit, onHover, onScroll, onRelease, onDrag, cursor, opaque=!0})
   *
   * @param args - 配置参数
   */
  constructor(args: MouseRegionArgs) {
    super({ key: args.key });
    this.child = args.child;
    this.onClick = args.onClick ?? null;
    this.onEnter = args.onEnter ?? null;
    this.onExit = args.onExit ?? null;
    this.onHover = args.onHover ?? null;
    this.onScroll = args.onScroll ?? null;
    this.onRelease = args.onRelease ?? null;
    this.onDrag = args.onDrag ?? null;
    this.cursor = args.cursor ?? null;
    this.opaque = args.opaque ?? true;
  }

  /**
   * 创建关联的元素。
   *
   * 逆向: G0.createElement() → new lXT(this)
   * Flitter 使用通用的 SingleChildRenderObjectElement。
   *
   * @returns 新的 SingleChildRenderObjectElement 实例
   */
  createElement(): Element {
    return new SingleChildRenderObjectElement(this as unknown as WidgetInterface);
  }

  /**
   * 创建渲染对象。
   *
   * 逆向: G0.createRenderObject() → new si({onClick, onEnter, onExit, ...})
   *
   * @returns 新的 RenderMouseRegion 实例
   */
  createRenderObject(): RenderObject {
    return new RenderMouseRegion({
      onClick: this.onClick,
      onEnter: this.onEnter,
      onExit: this.onExit,
      onHover: this.onHover,
      onScroll: this.onScroll,
      onRelease: this.onRelease,
      onDrag: this.onDrag,
      cursor: this.cursor,
      opaque: this.opaque,
    });
  }

  /**
   * 用当前 Widget 配置更新已有的渲染对象。
   *
   * 逆向: G0.updateRenderObject(T) → 逐一赋值所有属性
   * `T.onClick = this.onClick, T.onEnter = this.onEnter, ...`
   *
   * @param renderObject - 待更新的渲染对象
   */
  updateRenderObject(renderObject: RenderObject): void {
    const ro = renderObject as RenderMouseRegion;
    ro.onClick = this.onClick;
    ro.onEnter = this.onEnter;
    ro.onExit = this.onExit;
    ro.onHover = this.onHover;
    ro.onScroll = this.onScroll;
    ro.onRelease = this.onRelease;
    ro.onDrag = this.onDrag;
    ro.cursor = this.cursor;
    ro.opaque = this.opaque;
  }
}
