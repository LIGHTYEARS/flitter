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

import { logger } from "../debug/logger.js";
import type { RenderObject } from "../tree/render-object.js";
import type { TuiController } from "../tui/tui-controller.js";
import type { MouseEvent } from "../vt/types.js";
import type { MouseEvent as WidgetMouseEvent } from "../widgets/mouse-region.js";
import { RenderMouseRegion } from "../widgets/mouse-region.js";
import { type HitTestEntry, HitTestResult } from "./hit-test.js";
import {
  createBaseEvent,
  createClickEvent,
  createDragEvent,
  createReleaseEvent,
  createScrollEvent,
} from "./mouse-event-helpers.js";

const log = logger.scoped("mouse");

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
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: stored for future coordinate conversion use
  private _tui: TuiController | null = null;

  /** 最近一次命中测试的目标列表，用于 hover 状态追踪 */
  private _lastHoverTargets: HitTestEntry[] = [];

  /** 最后已知的鼠标位置，用于 reestablishHoverState */
  private _lastMousePosition: { x: number; y: number } | null = null;

  /** 当前处于 hover 状态的 RenderMouseRegion 集合 */
  private _hoveredRegions = new Set<RenderMouseRegion>();

  /**
   * _handleMove 用于避免 GC 的临时集合 (scratch sets)。
   *
   * 逆向: ha._scratchCurrentRegions / _scratchExitedRegions / _scratchEnteredRegions
   * (2026_tail_anonymous.js:158393-158435)
   */
  private _scratchCurrentRegions = new Set<RenderMouseRegion>();
  private _scratchExitedRegions = new Set<RenderMouseRegion>();
  private _scratchEnteredRegions = new Set<RenderMouseRegion>();

  /** 当前拖拽目标列表 */
  private _dragTargets: Array<{
    target: RenderMouseRegion;
    localPosition: { x: number; y: number };
    globalOffset: { x: number; y: number };
  }> = [];

  /** 最后一次拖拽位置 */
  private _lastDragPosition: { x: number; y: number } | null = null;

  /** 各按键最后一次点击时间（用于双击检测） */
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: used in Task 6 (_calculateClickCount)
  private _lastClickTime = new Map<string, number>();

  /** 各按键最后一次点击位置（用于双击检测） */
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: used in Task 6 (_calculateClickCount)
  private _lastClickPosition = new Map<string, { x: number; y: number }>();

  /** 各按键当前连击计数 */
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: used in Task 6 (_calculateClickCount)
  private _currentClickCount = new Map<string, number>();

  /** 双击最大间隔时间（毫秒） */
  static readonly DOUBLE_CLICK_TIME = 500;

  /** 双击最大距离（字符数） */
  static readonly DOUBLE_CLICK_DISTANCE = 2;

  /**
   * 滚动会话超时（毫秒）。
   *
   * 逆向: ha.SCROLL_SESSION_TIMEOUT = 200 (2026_tail_anonymous.js:158202)
   *
   * 在此时间内连续的滚动事件会粘连到同一目标。
   */
  static readonly SCROLL_SESSION_TIMEOUT = 200;

  /**
   * 当前滚动会话目标。
   *
   * 逆向: ha._scrollSessionTarget (2026_tail_anonymous.js:158212)
   */
  private _scrollSessionTarget: RenderMouseRegion | null = null;

  /**
   * 最后一次滚动事件时间戳。
   *
   * 逆向: ha._scrollSessionLastEvent (2026_tail_anonymous.js:158213)
   */
  private _scrollSessionLastEvent = 0;

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
    log.debug("event", { action: event.action, x: event.x, y: event.y, button: event.button });

    const position = { x: event.x, y: event.y };
    this._lastMousePosition = position;

    const result = HitTestResult.hitTest(this._rootRenderObject, position);
    this._lastHoverTargets = [...result.hits];
    const mouseTargets = this._findMouseTargets(result.hits);
    log.debug("hitTest", { hits: result.hits.length, mouseTargets: mouseTargets.length });

    switch (event.action) {
      case "press":
        if (event.button === "left" || event.button === "middle" || event.button === "right") {
          this._handleClick(event, position, mouseTargets);
          if (event.button === "left") {
            this._dragTargets = [];
            for (const { target, localPosition } of mouseTargets) {
              const globalOffset = {
                x: position.x - localPosition.x,
                y: position.y - localPosition.y,
              };
              this._dragTargets.push({ target, localPosition, globalOffset });
              if (target.opaque) break;
            }
          }
        }
        break;
      case "release":
        this._handleRelease(event, position, mouseTargets);
        this._dragTargets = [];
        this._lastDragPosition = null;
        break;
      case "wheel_up":
      case "wheel_down":
        // 逆向: ha.handleMouseEvent scroll case (2026_tail_anonymous.js:158267-158268)
        this._handleScroll(event, position, mouseTargets);
        break;
      case "move":
        this._handleMove(event, position, mouseTargets);
        if (event.button !== "none") this._handleDrag(event, position, mouseTargets);
        break;
    }
  }

  // ════════════════════════════════════════════════════
  //  鼠标目标过滤
  // ════════════════════════════════════════════════════

  /**
   * 从命中条目中筛选出 RenderMouseRegion 实例。
   *
   * 逆向: ha._findMouseTargets (2026_tail_anonymous.js:158451-158458)
   */
  private _findMouseTargets(
    hits: readonly HitTestEntry[],
  ): Array<{ target: RenderMouseRegion; localPosition: { x: number; y: number } }> {
    // 逆向: ha._findMouseTargets (2026_tail_anonymous.js:158451-158458)
    const targets: Array<{ target: RenderMouseRegion; localPosition: { x: number; y: number } }> =
      [];
    for (const hit of hits) {
      if (hit.target instanceof RenderMouseRegion) {
        targets.push({ target: hit.target, localPosition: hit.localPosition });
      }
    }
    return targets;
  }

  /**
   * 处理点击事件，创建并分发 click 事件到命中目标。
   *
   * 逆向: ha._handleClick (2026_tail_anonymous.js:158343-158357)
   */
  private _handleClick(
    raw: MouseEvent,
    position: { x: number; y: number },
    targets: Array<{ target: RenderMouseRegion; localPosition: { x: number; y: number } }>,
  ): void {
    // 逆向: ha._handleClick (2026_tail_anonymous.js:158343-158357)
    const clickCount = this._calculateClickCount(position, raw.button);
    for (const { target, localPosition } of targets) {
      const event = createClickEvent(raw, position, localPosition, clickCount);
      target.handleMouseEvent(event);
      if (target.opaque) break;
    }
  }

  /**
   * 处理鼠标释放事件，分发 release 事件到命中目标。
   *
   * 逆向: ha._handleRelease (2026_tail_anonymous.js:158291-158318)
   *
   * 算法:
   * - 如果有拖拽目标 (_dragTargets.length > 0)：release 发到原始拖拽目标，
   *   使用 globalOffset 计算 localPosition
   * - 否则：release 发到当前命中目标，遇到 opaque 则停止传播
   */
  private _handleRelease(
    raw: MouseEvent,
    position: { x: number; y: number },
    targets: Array<{ target: RenderMouseRegion; localPosition: { x: number; y: number } }>,
  ): void {
    // 逆向: ha._handleRelease (2026_tail_anonymous.js:158291-158318)
    // Skip global release callbacks (not implemented in this phase)
    if (this._dragTargets.length > 0) {
      // Release goes to original drag targets using globalOffset to compute localPos
      for (const { target, globalOffset } of this._dragTargets) {
        const localPosition = { x: position.x - globalOffset.x, y: position.y - globalOffset.y };
        const event = createReleaseEvent(raw, position, localPosition);
        target.handleMouseEvent(event);
      }
    } else {
      // Release goes to current hit targets with opaque propagation stop
      for (const { target, localPosition } of targets) {
        const event = createReleaseEvent(raw, position, localPosition);
        target.handleMouseEvent(event);
        if (target.opaque) break;
      }
    }
  }

  /**
   * 处理拖拽事件，分发 drag 事件到原始拖拽目标。
   *
   * 逆向: ha._handleDrag (2026_tail_anonymous.js:158320-158341)
   *
   * 算法:
   * - 计算 deltaX/deltaY（相对 _lastDragPosition，首次为 0）
   * - 发到 _dragTargets 中的所有目标
   * - 更新 _lastDragPosition
   */
  private _handleDrag(
    raw: MouseEvent,
    position: { x: number; y: number },
    _targets: Array<{ target: RenderMouseRegion; localPosition: { x: number; y: number } }>,
  ): void {
    // 逆向: ha._handleDrag (2026_tail_anonymous.js:158320-158341)
    const deltaX = this._lastDragPosition ? position.x - this._lastDragPosition.x : 0;
    const deltaY = this._lastDragPosition ? position.y - this._lastDragPosition.y : 0;
    for (const { target, globalOffset } of this._dragTargets) {
      const localPosition = { x: position.x - globalOffset.x, y: position.y - globalOffset.y };
      const event = createDragEvent(raw, position, localPosition, deltaX, deltaY);
      target.handleMouseEvent(event);
    }
    this._lastDragPosition = position;
  }

  /**
   * 从已过滤的 mouseTargets 中进一步筛选有 onScroll 监听器的目标，
   * 并按 depth 降序（深度截断）排序。
   *
   * 逆向: ha._findScrollTargets (2026_tail_anonymous.js:158459-158472)
   *
   * 算法:
   * - 遍历 targets（已按 ancestor-first 顺序排列）
   * - 若当前目标 depth <= 上一个目标 depth，则截断（depth 递减说明离开了深层区域）
   * - 仅收集有 onScroll 的目标
   *
   * 注意: amp 的原始实现对整个 hit list 执行 instanceof si 过滤；
   * 此处 targets 已经是 RenderMouseRegion 列表，故省略 instanceof 检查。
   */
  private _findScrollTargets(
    targets: Array<{ target: RenderMouseRegion; localPosition: { x: number; y: number } }>,
  ): Array<{ target: RenderMouseRegion; localPosition: { x: number; y: number } }> {
    // 逆向: ha._findScrollTargets (2026_tail_anonymous.js:158459-158472)
    const result: Array<{ target: RenderMouseRegion; localPosition: { x: number; y: number } }> =
      [];
    let lastDepth = -1;
    for (const entry of targets) {
      const d = entry.target.depth;
      if (d <= lastDepth) break; // depth-based cutoff
      if (entry.target.onScroll) {
        result.push({ target: entry.target, localPosition: entry.localPosition });
      }
      lastDepth = d;
    }
    return result;
  }

  /**
   * 处理滚动事件，带会话粘连逻辑。
   *
   * 逆向: ha._handleScroll (2026_tail_anonymous.js:158359-158392)
   *
   * 算法:
   * 1. 若当前有粘连会话目标且未超时，直接分发到该目标（优先使用 hit list 中的 localPosition，
   *    否则用 globalToLocal 计算）
   * 2. 否则，用 _findScrollTargets 筛选滚动目标
   * 3. 从最深目标开始逆序尝试分发；首个返回 truthy 的目标成为新会话目标
   * 4. 若无目标处理，重置会话
   */
  private _handleScroll(
    raw: MouseEvent,
    position: { x: number; y: number },
    targets: Array<{ target: RenderMouseRegion; localPosition: { x: number; y: number } }>,
  ): void {
    // 逆向: ha._handleScroll (2026_tail_anonymous.js:158359-158392)
    const now = Date.now();

    // Session stickiness: stick to previous target if still attached and within timeout
    if (
      this._scrollSessionTarget?.attached &&
      now - this._scrollSessionLastEvent <= MouseManager.SCROLL_SESSION_TIMEOUT &&
      this._scrollSessionTarget
    ) {
      const entry = targets.find((t) => t.target === this._scrollSessionTarget);
      if (entry) {
        const scrollEvent = createScrollEvent(raw, position, entry.localPosition);
        this._scrollSessionTarget.onScroll?.(scrollEvent as unknown as WidgetMouseEvent);
      } else {
        const local = this._scrollSessionTarget.globalToLocal(position);
        const scrollEvent = createScrollEvent(raw, position, { x: local.x, y: local.y });
        this._scrollSessionTarget.onScroll?.(scrollEvent as unknown as WidgetMouseEvent);
      }
      this._scrollSessionLastEvent = now;
      return;
    }

    // No active session — find scroll targets
    const scrollTargets = this._findScrollTargets(targets);
    if (scrollTargets.length === 0) {
      this._scrollSessionTarget = null;
      this._scrollSessionLastEvent = 0;
      return;
    }

    // Dispatch in reverse order (deepest first); first truthy return starts a session
    for (let i = scrollTargets.length - 1; i >= 0; i--) {
      const entry = scrollTargets[i];
      if (!entry) continue;
      const scrollEvent = createScrollEvent(raw, position, entry.localPosition);
      const handled = entry.target.onScroll?.(scrollEvent as unknown as WidgetMouseEvent) ?? false;
      if (handled) {
        this._scrollSessionTarget = entry.target;
        this._scrollSessionLastEvent = now;
        return;
      }
    }

    this._scrollSessionTarget = null;
    this._scrollSessionLastEvent = 0;
  }

  /**
   * 处理鼠标移动事件，分发 enter/exit/hover 事件到命中目标。
   *
   * 算法:
   * 1. 计算当前帧的命中目标集合 (currentRegions)
   * 2. 退出集合 = 上次 hover 中、当前未命中的区域
   * 3. 进入集合 = 当前命中、但上次未 hover 的区域
   * 4. 分发 exit 事件 (注意: exit 的 localPosition 使用全局坐标 R — amp 原始行为)
   * 5. 分发 enter 事件 (使用实际 localPosition)
   * 6. 分发 hover 事件 (仅对已经处于 hover 状态的区域，即上次就 hover 的)
   * 7. 用当前集合替换 _hoveredRegions
   */
  private _handleMove(
    raw: MouseEvent,
    position: { x: number; y: number },
    targets: Array<{ target: RenderMouseRegion; localPosition: { x: number; y: number } }>,
  ): void {
    // 逆向: ha._handleMove (2026_tail_anonymous.js:158393-158435)

    // Step 1: 构建当前帧命中的 region 集合
    const currentRegions = this._scratchCurrentRegions;
    const exitedRegions = this._scratchExitedRegions;
    const enteredRegions = this._scratchEnteredRegions;

    currentRegions.clear();
    for (const { target } of targets) currentRegions.add(target);

    // Step 2: 退出集合 = 上次 hover 中、当前未命中的区域
    exitedRegions.clear();
    for (const region of this._hoveredRegions) {
      if (!currentRegions.has(region)) exitedRegions.add(region);
    }

    // Step 3: 进入集合 = 当前命中、但上次未 hover 的区域
    enteredRegions.clear();
    for (const region of currentRegions) {
      if (!this._hoveredRegions.has(region)) enteredRegions.add(region);
    }

    // Step 4: 分发 exit 事件
    // 逆向: amp 对 exit 事件使用 Ol(T, R, R) — localPosition 与 position 相同 (全局坐标)
    for (const region of exitedRegions) {
      if (region.onExit) {
        const event = { type: "exit" as const, ...createBaseEvent(raw, position, position) };
        region.handleMouseEvent(event);
      }
    }

    // Step 5: 分发 enter 事件 (使用实际 localPosition)
    for (const { target, localPosition } of targets) {
      if (enteredRegions.has(target) && target.onEnter) {
        const event = { type: "enter" as const, ...createBaseEvent(raw, position, localPosition) };
        target.handleMouseEvent(event);
      }
    }

    // Step 6: 分发 hover 事件 (仅对已经 hover 的区域)
    // 逆向: amp 检查 this._hoveredRegions.has(i) — 即上次就在 hover 状态的区域
    for (const { target, localPosition } of targets) {
      if (target.onHover && this._hoveredRegions.has(target)) {
        const event = { type: "hover" as const, ...createBaseEvent(raw, position, localPosition) };
        target.handleMouseEvent(event);
      }
    }

    // Step 7: 用当前集合替换 _hoveredRegions
    this._hoveredRegions.clear();
    for (const region of currentRegions) this._hoveredRegions.add(region);
  }

  /**
   * 计算点击次数（单击 vs 双击）。
   *
   * Stub — full implementation in Task 6.
   *
   * 逆向: ha._calculateClickCount (2026_tail_anonymous.js:158484-158500)
   */
  private _calculateClickCount(_position: { x: number; y: number }, _button = "left"): number {
    return 1;
  }

  /**
   * 从 hover 状态集合中移除指定区域。
   *
   * 逆向: ha.removeRegion (2026_tail_anonymous.js:158480-158482)
   *
   * @param region - 要移除的 RenderMouseRegion 实例
   */
  removeRegion(region: RenderMouseRegion): void {
    // 逆向: ha.removeRegion (2026_tail_anonymous.js:158480-158482)
    this._hoveredRegions.delete(region);
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

    const result = HitTestResult.hitTest(this._rootRenderObject, this._lastMousePosition);
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
