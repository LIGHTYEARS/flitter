/**
 * MouseManager -- 鼠标事件管理器单例。
 *
 * 逆向: ha in tui-layout-engine.js:1120
 *
 * 使用 {@link HitTestResult} 对渲染树执行命中测试，
 * 将鼠标事件分发到命中的 {@link RenderObject}。
 * 维护 hover 状态追踪，供 resize 时清除和重建。
 *
 * @example
 * ```ts
 * import { MouseManager } from "./mouse-manager.js";
 *
 * const mm = MouseManager.instance;
 * mm.setRootRenderObject(root);
 * mm.setTui(tui);
 * mm.handleMouseEvent(event);
 * ```
 *
 * @module
 */

import type { MouseEvent } from "../vt/types.js";
import type { RenderObject } from "../tree/render-object.js";
import { HitTestResult, type HitTestEntry } from "./hit-test.js";
import type { TuiController } from "../tui/tui-controller.js";

/**
 * 鼠标事件处理器。
 *
 * 接收鼠标事件和对应的命中条目，由 Widget 层注册并处理。
 */
export type MouseHandler = (event: MouseEvent, entry: HitTestEntry) => void;

/**
 * MouseManager -- 鼠标事件管理器单例。
 *
 * 逆向: ha in tui-layout-engine.js:1120
 *
 * 使用 HitTestResult 对渲染树执行命中测试，
 * 将鼠标事件分发到命中的 RenderObject。
 *
 * 核心功能:
 * - {@link setRootRenderObject} 设置命中测试的根渲染对象
 * - {@link setTui} 设置 TuiController 引用（用于获取 Screen 进行坐标转换）
 * - {@link handleMouseEvent} 对 MouseEvent 执行命中测试并分发
 * - {@link clearHoverState} 清除当前悬停状态（resize 时调用）
 * - {@link reestablishHoverState} 重新建立悬停状态（resize 后 post-frame 调用）
 * - {@link dispose} 清空所有引用并重置单例
 */
export class MouseManager {
  /** 单例实例 */
  private static _instance: MouseManager | null = null;

  /** 命中测试的根渲染对象 */
  private _rootRenderObject: RenderObject | null = null;

  /** TuiController 引用，用于获取 Screen 进行坐标转换 */
  private _tui: TuiController | null = null;

  /** 最近一次命中测试的目标列表，用于 hover 状态追踪 */
  private _lastHoverTargets: HitTestEntry[] = [];

  /** 最后已知的鼠标位置，用于 reestablishHoverState */
  private _lastMousePosition: { x: number; y: number } | null = null;

  // ════════════════════════════════════════════════════
  //  单例
  // ════════════════════════════════════════════════════

  /**
   * 获取 MouseManager 单例。
   *
   * 如果实例不存在则自动创建。
   *
   * @returns MouseManager 单例实例
   *
   * @example
   * ```ts
   * const mm = MouseManager.instance;
   * ```
   */
  static get instance(): MouseManager {
    if (!MouseManager._instance) {
      MouseManager._instance = new MouseManager();
    }
    return MouseManager._instance;
  }

  // ════════════════════════════════════════════════════
  //  配置
  // ════════════════════════════════════════════════════

  /**
   * 设置命中测试的根渲染对象。
   *
   * 逆向: ha.setRootRenderObject
   *
   * @param root - 渲染树根节点
   *
   * @example
   * ```ts
   * mm.setRootRenderObject(rootRenderObject);
   * ```
   */
  setRootRenderObject(root: RenderObject): void {
    this._rootRenderObject = root;
  }

  /**
   * 设置 TuiController 引用。
   *
   * 逆向: ha.setTui
   *
   * TuiController 提供 Screen 实例，用于坐标转换。
   *
   * @param tui - TuiController 实例
   *
   * @example
   * ```ts
   * mm.setTui(tuiController);
   * ```
   */
  setTui(tui: TuiController): void {
    this._tui = tui;
  }

  // ════════════════════════════════════════════════════
  //  只读属性
  // ════════════════════════════════════════════════════

  /**
   * 获取最近一次命中测试的目标列表（只读）。
   *
   * 用于外部观察当前 hover 状态。
   *
   * @returns 命中条目数组
   */
  get lastHoverTargets(): readonly HitTestEntry[] {
    return this._lastHoverTargets;
  }

  // ════════════════════════════════════════════════════
  //  事件处理
  // ════════════════════════════════════════════════════

  /**
   * 处理鼠标事件。
   *
   * 逆向: mouseManager.handleMouseEvent in tui-render-pipeline.js:129
   *
   * 对 MouseEvent 执行命中测试，更新 hover 目标列表。
   * 如果未设置 rootRenderObject 则静默返回。
   *
   * @param event - 终端鼠标事件
   *
   * @example
   * ```ts
   * mm.handleMouseEvent({ type: "mouse", x: 10, y: 5, ... });
   * ```
   */
  handleMouseEvent(event: MouseEvent): void {
    if (!this._rootRenderObject) return;

    const position = { x: event.x, y: event.y };
    this._lastMousePosition = position;

    const result = HitTestResult.hitTest(this._rootRenderObject, position);
    this._lastHoverTargets = [...result.hits];

    // 鼠标事件分发到命中的 RenderObject
    // 具体分发逻辑 (click/hover/scroll) 由 Widget 层处理
  }

  // ════════════════════════════════════════════════════
  //  Hover 状态管理
  // ════════════════════════════════════════════════════

  /**
   * 清除当前悬停状态。
   *
   * 逆向: mouseManager.clearHoverState in tui-render-pipeline.js:108
   *
   * 在终端 resize 时调用，清空 hover 目标列表。
   *
   * @example
   * ```ts
   * mm.clearHoverState(); // resize 时调用
   * ```
   */
  clearHoverState(): void {
    this._lastHoverTargets = [];
  }

  /**
   * 重新建立悬停状态。
   *
   * 逆向: mouseManager.reestablishHoverState in tui-render-pipeline.js:61
   *
   * 使用最后已知的鼠标位置重新进行命中测试。
   * 在 resize 后的 post-frame callback 中调用。
   *
   * @example
   * ```ts
   * mm.reestablishHoverState(); // resize 后 post-frame 调用
   * ```
   */
  reestablishHoverState(): void {
    if (!this._rootRenderObject || !this._lastMousePosition) return;

    const result = HitTestResult.hitTest(
      this._rootRenderObject,
      this._lastMousePosition,
    );
    this._lastHoverTargets = [...result.hits];
  }

  // ════════════════════════════════════════════════════
  //  清理
  // ════════════════════════════════════════════════════

  /**
   * 释放资源，清空所有引用并重置单例。
   *
   * 清空 rootRenderObject、tui、lastHoverTargets 及 lastMousePosition，
   * 并将 _instance 设为 null 以允许下次访问时重建。
   *
   * @example
   * ```ts
   * mm.dispose();
   * ```
   */
  dispose(): void {
    this._rootRenderObject = null;
    this._tui = null;
    this._lastHoverTargets = [];
    this._lastMousePosition = null;
    MouseManager._instance = null;
  }
}
