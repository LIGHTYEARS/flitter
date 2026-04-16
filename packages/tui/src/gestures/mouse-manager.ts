/**
 * MouseManager -- 鼠标事件管理器单例。
 *
 * 逆向: ha in 2026_tail_anonymous.js:158200-158518
 *
 * 使用 {@link HitTestResult} 对渲染树执行命中测试，
 * 将终端鼠标事件翻译为 Widget 层鼠标事件并分发到命中的 {@link RenderObject}。
 * 维护 hover 状态追踪、拖拽捕获、滚轮 session 粘滞、双击检测、光标管理。
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
import type { MouseEvent as TerminalMouseEvent } from "../vt/types.js";
import type { MouseEvent as WidgetMouseEvent } from "../widgets/mouse-region.js";
import { RenderMouseRegion } from "../widgets/mouse-region.js";
import { type HitTestEntry, HitTestResult } from "./hit-test.js";

const log = logger.scoped("mouse");

// ════════════════════════════════════════════════════
//  内部类型
// ════════════════════════════════════════════════════

/**
 * 过滤后的鼠标目标条目。
 *
 * 逆向: ha._findMouseTargets 返回的条目类型
 */
interface MouseTargetEntry {
  target: RenderMouseRegion;
  localPosition: { x: number; y: number };
}

/**
 * 拖拽目标条目。
 *
 * 逆向: ha._dragTargets 中的条目类型
 * globalOffset 用于将全局坐标转换为目标的局部坐标。
 */
interface DragTargetEntry {
  target: RenderMouseRegion;
  localPosition: { x: number; y: number };
  globalOffset: { x: number; y: number };
}

/**
 * 全局点击回调参数。
 *
 * 逆向: ha._globalClickCallbacks 中回调接收的参数
 */
export interface GlobalClickInfo {
  event: TerminalMouseEvent;
  globalPosition: { x: number; y: number };
  mouseTargets: MouseTargetEntry[];
  clickCount: number;
}

// ════════════════════════════════════════════════════
//  辅助函数 — 构造 Widget 层鼠标事件
// ════════════════════════════════════════════════════

/**
 * 构造基础 Widget 鼠标事件属性。
 *
 * 逆向: Ol in 0543_unknown_Ol.js
 * `{ position, localPosition, modifiers: { shift, ctrl, alt, meta }, timestamp }`
 */
function makeBaseEventFields(
  termEvent: TerminalMouseEvent,
  globalPosition: { x: number; y: number },
  localPosition: { x: number; y: number },
): Partial<WidgetMouseEvent> {
  return {
    x: localPosition.x,
    y: localPosition.y,
    position: globalPosition,
    localPosition,
    modifiers: {
      shift: termEvent.modifiers.shift,
      ctrl: termEvent.modifiers.ctrl,
      alt: termEvent.modifiers.alt,
      meta: termEvent.modifiers.meta,
    },
    timestamp: Date.now(),
  };
}

/**
 * 构造 click 事件。
 *
 * 逆向: wy0 in 0544_unknown_wy0.js
 */
function makeClickEvent(
  termEvent: TerminalMouseEvent,
  globalPosition: { x: number; y: number },
  localPosition: { x: number; y: number },
  clickCount = 1,
): WidgetMouseEvent {
  const button =
    termEvent.button === "left"
      ? "left"
      : termEvent.button === "middle"
        ? "middle"
        : termEvent.button === "right"
          ? "right"
          : "left";
  return {
    type: "click",
    button,
    clickCount,
    ...makeBaseEventFields(termEvent, globalPosition, localPosition),
  } as WidgetMouseEvent;
}

/**
 * 构造 scroll 事件。
 *
 * 逆向: yF in 0545_unknown_yF.js
 */
function makeScrollEvent(
  termEvent: TerminalMouseEvent,
  globalPosition: { x: number; y: number },
  localPosition: { x: number; y: number },
): WidgetMouseEvent {
  let direction: string;
  switch (termEvent.action) {
    case "wheel_up":
      direction = "up";
      break;
    case "wheel_down":
      direction = "down";
      break;
    default:
      direction = "down";
  }
  return {
    type: "scroll",
    direction,
    ...makeBaseEventFields(termEvent, globalPosition, localPosition),
  } as WidgetMouseEvent;
}

// ════════════════════════════════════════════════════
//  MouseManager
// ════════════════════════════════════════════════════

/**
 * MouseManager -- 鼠标事件管理器单例。
 *
 * 逆向: ha in 2026_tail_anonymous.js:158200-158518
 *
 * 核心功能:
 * - 终端 press → `_handleClick` → RenderMouseRegion.handleMouseEvent({type:"click"})
 * - 终端 release → `_handleRelease` → RenderMouseRegion.handleMouseEvent({type:"release"})
 * - 终端 move → `_handleMove` → enter/exit/hover 事件
 * - 终端 move+drag → `_handleDrag` → RenderMouseRegion.handleMouseEvent({type:"drag"})
 * - 终端 wheel → `_handleScroll` → RenderMouseRegion.onScroll?.()
 * - 双击检测、光标管理、滚轮 session 粘滞
 */
export class MouseManager {
  /** 单例实例 */
  private static _instance: MouseManager | null = null;

  /** 逆向: ha.SCROLL_SESSION_TIMEOUT = 200 */
  static readonly SCROLL_SESSION_TIMEOUT = 200;

  /** 逆向: ha.DOUBLE_CLICK_TIME = 500 */
  static readonly DOUBLE_CLICK_TIME = 500;

  /** 逆向: ha.DOUBLE_CLICK_DISTANCE = 2 */
  static readonly DOUBLE_CLICK_DISTANCE = 2;

  /** 逆向: ha.DOUBLE_CLICK_DISTANCE_SQUARED */
  static readonly DOUBLE_CLICK_DISTANCE_SQUARED =
    MouseManager.DOUBLE_CLICK_DISTANCE * MouseManager.DOUBLE_CLICK_DISTANCE;

  /** 命中测试的根渲染对象 */
  private _rootRenderObject: RenderObject | null = null;

  /** 逆向: ha._hoveredRegions = new Set() — 当前悬停中的 RenderMouseRegion */
  private _hoveredRegions = new Set<RenderMouseRegion>();

  /** TuiController 引用 */
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: stored for future use and dispose cleanup
  private _tui: TuiController | null = null;

  /** 最后已知的鼠标位置 */
  private _lastMousePosition: { x: number; y: number } | null = null;

  /** 逆向: ha._dragTargets = [] — 当前拖拽捕获的目标列表 */
  private _dragTargets: DragTargetEntry[] = [];

  /** 逆向: ha._lastDragPosition = null */
  private _lastDragPosition: { x: number; y: number } | null = null;

  /** 逆向: ha._globalReleaseCallbacks = new Set() */
  private _globalReleaseCallbacks = new Set<() => void>();

  /** 逆向: ha._globalClickCallbacks = new Set() */
  private _globalClickCallbacks = new Set<(info: GlobalClickInfo) => void>();

  /** 逆向: ha._scrollSessionTarget = null — 当前滚轮 session 粘滞目标 */
  private _scrollSessionTarget: RenderMouseRegion | null = null;

  /** 逆向: ha._scrollSessionLastEvent = 0 — 上次滚轮事件时间戳 */
  private _scrollSessionLastEvent = 0;

  /** 逆向: ha._lastClickTime = new Map() — 每个按键的上次点击时间 */
  private _lastClickTime = new Map<string, number>();

  /** 逆向: ha._lastClickPosition = new Map() — 每个按键的上次点击位置 */
  private _lastClickPosition = new Map<string, { x: number; y: number }>();

  /** 逆向: ha._currentClickCount = new Map() — 每个按键的当前连续点击次数 */
  private _currentClickCount = new Map<string, number>();

  /**
   * Scratch sets — 在 _handleMove 中复用，避免每次分配新 Set。
   * 逆向: ha._scratchCurrentRegions / _scratchEnteredRegions / _scratchExitedRegions
   */
  private _scratchCurrentRegions = new Set<RenderMouseRegion>();
  private _scratchEnteredRegions = new Set<RenderMouseRegion>();
  private _scratchExitedRegions = new Set<RenderMouseRegion>();

  /** 最近一次命中测试的目标列表，供外部观察 */
  private _lastHoverTargets: HitTestEntry[] = [];

  // ════════════════════════════════════════════════════
  //  单例
  // ════════════════════════════════════════════════════

  /**
   * 获取 MouseManager 单例。
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
   */
  setRootRenderObject(root: RenderObject): void {
    this._rootRenderObject = root;
  }

  /**
   * 设置 TuiController 引用。
   *
   * 逆向: ha.setTui
   */
  setTui(tui: TuiController): void {
    this._tui = tui;
  }

  // ════════════════════════════════════════════════════
  //  只读属性
  // ════════════════════════════════════════════════════

  /**
   * 获取最近一次命中测试的目标列表（只读）。
   */
  get lastHoverTargets(): readonly HitTestEntry[] {
    return this._lastHoverTargets;
  }

  // ════════════════════════════════════════════════════
  //  全局回调注册
  // ════════════════════════════════════════════════════

  /**
   * 逆向: ha.addGlobalReleaseCallback
   */
  addGlobalReleaseCallback(cb: () => void): void {
    this._globalReleaseCallbacks.add(cb);
  }

  /**
   * 逆向: ha.removeGlobalReleaseCallback
   */
  removeGlobalReleaseCallback(cb: () => void): void {
    this._globalReleaseCallbacks.delete(cb);
  }

  /**
   * 逆向: ha.addGlobalClickCallback
   */
  addGlobalClickCallback(cb: (info: GlobalClickInfo) => void): void {
    this._globalClickCallbacks.add(cb);
  }

  /**
   * 逆向: ha.removeGlobalClickCallback
   */
  removeGlobalClickCallback(cb: (info: GlobalClickInfo) => void): void {
    this._globalClickCallbacks.delete(cb);
  }

  // ════════════════════════════════════════════════════
  //  核心事件处理
  // ════════════════════════════════════════════════════

  /**
   * 处理终端鼠标事件。
   *
   * 逆向: ha.handleMouseEvent in 2026_tail_anonymous.js:158234-158275
   *
   * 执行命中测试，根据终端事件 action 分发到对应的子处理器:
   * - press → _handleClick (+ 拖拽捕获)
   * - release → _handleRelease
   * - wheel_up/wheel_down → _handleScroll
   * - move → _handleMove (+ _handleDrag if dragging)
   */
  handleMouseEvent(event: TerminalMouseEvent): void {
    if (!this._rootRenderObject) return;

    log.debug("event", { action: event.action, x: event.x, y: event.y, button: event.button });

    const position = { x: event.x, y: event.y };
    const result = HitTestResult.hitTest(this._rootRenderObject, position);
    this._lastHoverTargets = [...result.hits];
    const mouseTargets = this._findMouseTargets(result.hits);

    log.debug("hitTest", { hits: result.hits.length, targets: mouseTargets.length });

    switch (event.action) {
      case "press":
        if (event.button === "left" || event.button === "middle" || event.button === "right") {
          this._handleClick(event, position, mouseTargets);

          // 逆向: press + left → 捕获拖拽目标
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
        this._handleScroll(event, position, mouseTargets);
        break;

      case "move": {
        this._handleMove(event, position, mouseTargets);
        // 逆向: move + button held → drag
        // Flitter 的 input-parser 在移动时设置 button 为按住的键
        const isDrag = event.button !== "none";
        if (isDrag) {
          this._handleDrag(event, position, mouseTargets);
        }
        break;
      }
    }

    this._lastMousePosition = position;
  }

  // ════════════════════════════════════════════════════
  //  子处理器
  // ════════════════════════════════════════════════════

  /**
   * 处理点击事件 (press)。
   *
   * 逆向: ha._handleClick in 2026_tail_anonymous.js:158343-158358
   *
   * 计算 clickCount (双击检测)，通知全局回调，
   * 然后遍历目标调用 handleMouseEvent({type:"click"})。
   * opaque 目标阻止事件继续传播。
   */
  private _handleClick(
    event: TerminalMouseEvent,
    position: { x: number; y: number },
    targets: MouseTargetEntry[],
  ): void {
    const clickCount = this._calculateClickCount(position, event.button);

    // 全局点击回调 (command palette 等)
    for (const cb of this._globalClickCallbacks) {
      cb({ event, globalPosition: position, mouseTargets: targets, clickCount });
    }

    for (const { target, localPosition } of targets) {
      const widgetEvent = makeClickEvent(event, position, localPosition, clickCount);
      target.handleMouseEvent(widgetEvent);
      if (target.opaque) break;
    }
  }

  /**
   * 处理释放事件 (release)。
   *
   * 逆向: ha._handleRelease in 2026_tail_anonymous.js:158291-158319
   *
   * 先通知全局释放回调。
   * 如果有拖拽目标，发送 release 到拖拽目标（捕获语义）；
   * 否则发送 release 到当前命中目标。
   */
  private _handleRelease(
    event: TerminalMouseEvent,
    position: { x: number; y: number },
    targets: MouseTargetEntry[],
  ): void {
    // 全局释放回调
    for (const cb of this._globalReleaseCallbacks) {
      cb();
    }

    const button =
      event.button === "left" || event.button === "middle" || event.button === "right"
        ? event.button
        : "left";

    if (this._dragTargets.length > 0) {
      // 发送到拖拽捕获目标
      for (const { target, globalOffset } of this._dragTargets) {
        const localPos = {
          x: position.x - globalOffset.x,
          y: position.y - globalOffset.y,
        };
        const widgetEvent: WidgetMouseEvent = {
          type: "release",
          button,
          ...makeBaseEventFields(event, position, localPos),
        } as WidgetMouseEvent;
        target.handleMouseEvent(widgetEvent);
      }
    } else {
      // 发送到当前命中目标
      for (const { target, localPosition } of targets) {
        const widgetEvent: WidgetMouseEvent = {
          type: "release",
          button,
          ...makeBaseEventFields(event, position, localPosition),
        } as WidgetMouseEvent;
        target.handleMouseEvent(widgetEvent);
        if (target.opaque) break;
      }
    }
  }

  /**
   * 处理拖拽事件 (move with button held)。
   *
   * 逆向: ha._handleDrag in 2026_tail_anonymous.js:158320-158342
   *
   * 使用捕获语义: 事件发送到 press 时捕获的 _dragTargets，
   * 通过 globalOffset 计算每个目标的局部坐标。
   */
  private _handleDrag(
    event: TerminalMouseEvent,
    position: { x: number; y: number },
    _targets: MouseTargetEntry[],
  ): void {
    const button =
      event.button === "left" || event.button === "middle" || event.button === "right"
        ? event.button
        : "left";

    const deltaX = this._lastDragPosition ? position.x - this._lastDragPosition.x : 0;
    const deltaY = this._lastDragPosition ? position.y - this._lastDragPosition.y : 0;

    for (const { target, globalOffset } of this._dragTargets) {
      const localPos = {
        x: position.x - globalOffset.x,
        y: position.y - globalOffset.y,
      };
      const widgetEvent: WidgetMouseEvent = {
        type: "drag",
        button,
        deltaX,
        deltaY,
        ...makeBaseEventFields(event, position, localPos),
      } as WidgetMouseEvent;
      target.handleMouseEvent(widgetEvent);
    }

    this._lastDragPosition = position;
  }

  /**
   * 处理滚轮事件。
   *
   * 逆向: ha._handleScroll in 2026_tail_anonymous.js:158359-158392
   *
   * 滚轮 session 粘滞: 在 SCROLL_SESSION_TIMEOUT(200ms) 内，
   * 滚轮事件粘滞到同一目标，即使鼠标略微移开。
   * onScroll 返回 true 表示事件已消费并建立 session。
   */
  private _handleScroll(
    event: TerminalMouseEvent,
    position: { x: number; y: number },
    targets: MouseTargetEntry[],
  ): void {
    const now = Date.now();

    // 逆向: 滚轮 session 粘滞
    if (
      this._scrollSessionTarget?.attached &&
      now - this._scrollSessionLastEvent <= MouseManager.SCROLL_SESSION_TIMEOUT
    ) {
      // 如果粘滞目标仍在当前命中中，使用其局部坐标
      const found = targets.find((t) => t.target === this._scrollSessionTarget);
      if (found) {
        const scrollEvt = makeScrollEvent(event, position, found.localPosition);
        this._scrollSessionTarget.onScroll?.(scrollEvt);
      } else {
        // 粘滞目标不在当前命中中，用 globalToLocal 计算
        const localPos = this._scrollSessionTarget.globalToLocal(position);
        const scrollEvt = makeScrollEvent(event, position, {
          x: localPos.x,
          y: localPos.y,
        });
        this._scrollSessionTarget.onScroll?.(scrollEvt);
      }
      this._scrollSessionLastEvent = now;
      return;
    }

    // 逆向: 查找可滚动目标
    const scrollTargets = this._findScrollTargets(targets);
    if (scrollTargets.length === 0) {
      this._scrollSessionTarget = null;
      this._scrollSessionLastEvent = 0;
      return;
    }

    // 逆向: 从最深层开始尝试，onScroll 返回 true 表示消费
    for (let i = scrollTargets.length - 1; i >= 0; i--) {
      const entry = scrollTargets[i];
      if (!entry) continue;
      const scrollEvt = makeScrollEvent(event, position, entry.localPosition);
      if (entry.target.onScroll?.(scrollEvt) ?? false) {
        this._scrollSessionTarget = entry.target;
        this._scrollSessionLastEvent = now;
        return;
      }
    }

    this._scrollSessionTarget = null;
    this._scrollSessionLastEvent = 0;
  }

  /**
   * 处理移动事件 — 维护 hover 状态，触发 enter/exit/hover。
   *
   * 逆向: ha._handleMove in 2026_tail_anonymous.js:158393-158436
   *
   * 使用 scratch sets 进行集合差运算:
   * 1. 当前命中的 regions → _scratchCurrentRegions
   * 2. 之前 hovered 但不再命中 → _scratchExitedRegions → fire "exit"
   * 3. 新命中但之前未 hover → _scratchEnteredRegions → fire "enter"
   * 4. 已 hovered 且仍命中 → fire "hover"
   * 5. 更新 _hoveredRegions
   */
  private _handleMove(
    event: TerminalMouseEvent,
    position: { x: number; y: number },
    targets: MouseTargetEntry[],
  ): void {
    // 逆向: 只处理 RenderMouseRegion 目标
    const regionTargets = targets.filter((t) => t.target instanceof RenderMouseRegion);

    // 逆向: 构建当前 region set
    const current = this._scratchCurrentRegions;
    const exited = this._scratchExitedRegions;
    const entered = this._scratchEnteredRegions;

    current.clear();
    for (const { target } of regionTargets) {
      current.add(target);
    }

    // 逆向: 计算退出集 (之前 hovered，现在不在)
    exited.clear();
    for (const region of this._hoveredRegions) {
      if (!current.has(region)) exited.add(region);
    }

    // 逆向: 计算进入集 (现在命中，之前未 hovered)
    entered.clear();
    for (const region of current) {
      if (!this._hoveredRegions.has(region)) entered.add(region);
    }

    // 逆向: 发送 exit 事件
    for (const region of exited) {
      if (region.onExit) {
        const widgetEvent: WidgetMouseEvent = {
          type: "exit",
          ...makeBaseEventFields(event, position, position),
        } as WidgetMouseEvent;
        region.handleMouseEvent(widgetEvent);
      }
    }

    // 逆向: 发送 enter 事件
    for (const { target, localPosition } of regionTargets) {
      if (entered.has(target) && target.onEnter) {
        const widgetEvent: WidgetMouseEvent = {
          type: "enter",
          ...makeBaseEventFields(event, position, localPosition),
        } as WidgetMouseEvent;
        target.handleMouseEvent(widgetEvent);
      }
    }

    // 逆向: 发送 hover 事件 (已在 hover 中且仍命中)
    for (const { target, localPosition } of regionTargets) {
      if (target.onHover && this._hoveredRegions.has(target)) {
        const widgetEvent: WidgetMouseEvent = {
          type: "hover",
          ...makeBaseEventFields(event, position, localPosition),
        } as WidgetMouseEvent;
        target.handleMouseEvent(widgetEvent);
      }
    }

    // 逆向: 更新 _hoveredRegions
    this._hoveredRegions.clear();
    for (const region of current) {
      this._hoveredRegions.add(region);
    }
  }

  // ════════════════════════════════════════════════════
  //  目标查找
  // ════════════════════════════════════════════════════

  /**
   * 从命中测试结果中提取可处理鼠标事件的目标。
   *
   * 逆向: ha._findMouseTargets in 2026_tail_anonymous.js:158451-158458
   */
  private _findMouseTargets(hits: readonly HitTestEntry[]): MouseTargetEntry[] {
    const result: MouseTargetEntry[] = [];
    for (const hit of hits) {
      if (this._canHandleMouseEvents(hit.target)) {
        result.push({
          target: hit.target as RenderMouseRegion,
          localPosition: hit.localPosition,
        });
      }
    }
    return result;
  }

  /**
   * 从目标列表中提取可滚动目标。
   *
   * 逆向: ha._findScrollTargets in 2026_tail_anonymous.js:158459-158472
   *
   * 按 depth 降序收集有 onScroll 的 RenderMouseRegion。
   * depth 不再递增时停止。
   */
  private _findScrollTargets(targets: MouseTargetEntry[]): MouseTargetEntry[] {
    const result: MouseTargetEntry[] = [];
    let lastDepth = -1;
    for (const entry of targets) {
      const d = entry.target.depth;
      if (d <= lastDepth) break;
      if (entry.target instanceof RenderMouseRegion && entry.target.onScroll) {
        result.push(entry);
      }
      lastDepth = d;
    }
    return result;
  }

  /**
   * 判断渲染对象是否能处理鼠标事件。
   *
   * 逆向: ha._canHandleMouseEvents in 2026_tail_anonymous.js:158473-158476
   */
  private _canHandleMouseEvents(target: RenderObject): boolean {
    if (target instanceof RenderMouseRegion) return true;
    return typeof (target as { handleMouseEvent?: unknown }).handleMouseEvent === "function";
  }

  // ════════════════════════════════════════════════════
  //  双击检测
  // ════════════════════════════════════════════════════

  /**
   * 计算连续点击次数 (双击/三击检测)。
   *
   * 逆向: ha._calculateClickCount in 2026_tail_anonymous.js:158501-158509
   *
   * 在 DOUBLE_CLICK_TIME(500ms) 和 DOUBLE_CLICK_DISTANCE(2 cells) 内
   * 的连续点击递增 clickCount，否则重置为 1。
   */
  private _calculateClickCount(position: { x: number; y: number }, button = "left"): number {
    const now = Date.now();
    const lastTime = this._lastClickTime.get(button) ?? 0;
    const elapsed = now - lastTime;
    let count = 1;
    const lastPos = this._lastClickPosition.get(button);

    if (
      lastPos &&
      elapsed <= MouseManager.DOUBLE_CLICK_TIME &&
      this._isWithinDoubleClickDistance(position, lastPos)
    ) {
      count = (this._currentClickCount.get(button) ?? 0) + 1;
    } else {
      count = 1;
    }

    this._lastClickTime.set(button, now);
    this._lastClickPosition.set(button, position);
    this._currentClickCount.set(button, count);

    return count;
  }

  /**
   * 判断两个位置是否在双击距离内。
   *
   * 逆向: ha._isWithinDoubleClickDistance in 2026_tail_anonymous.js:158510-158514
   */
  private _isWithinDoubleClickDistance(
    a: { x: number; y: number },
    b: { x: number; y: number },
  ): boolean {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy <= MouseManager.DOUBLE_CLICK_DISTANCE_SQUARED;
  }

  // ════════════════════════════════════════════════════
  //  Hover 状态管理
  // ════════════════════════════════════════════════════

  /**
   * 清除当前悬停状态。
   *
   * 逆向: ha.clearHoverState in 2026_tail_anonymous.js:158477-158478
   *
   * resize 时调用: 清除 hover regions、拖拽目标。
   */
  clearHoverState(): void {
    this._hoveredRegions.clear();
    this._dragTargets = [];
    this._lastHoverTargets = [];
  }

  /**
   * 移除指定 region 的 hover 追踪。
   *
   * 逆向: ha.removeRegion in 2026_tail_anonymous.js:158480-158482
   *
   * 在 RenderMouseRegion.dispose 中调用，清除被销毁的 region 的引用。
   */
  removeRegion(region: RenderMouseRegion): void {
    this._hoveredRegions.delete(region);
  }

  /**
   * 重新建立悬停状态。
   *
   * 逆向: ha.reestablishHoverState in 2026_tail_anonymous.js:158483-158500
   *
   * 使用最后已知的鼠标位置重新执行完整的 handleMouseEvent({action:"move"})。
   * 在 resize 后的 post-frame callback 中调用。
   */
  reestablishHoverState(): void {
    if (!this._lastMousePosition || !this._rootRenderObject) return;

    // 逆向: 构造一个合成 move 事件
    const syntheticEvent: TerminalMouseEvent = {
      type: "mouse",
      action: "move",
      x: this._lastMousePosition.x,
      y: this._lastMousePosition.y,
      button: "none",
      modifiers: {
        shift: false,
        ctrl: false,
        alt: false,
        meta: false,
      },
    };
    this.handleMouseEvent(syntheticEvent);
  }

  // ════════════════════════════════════════════════════
  //  清理
  // ════════════════════════════════════════════════════

  /**
   * 释放资源，清空所有引用并重置单例。
   *
   * 逆向: ha.dispose in 2026_tail_anonymous.js:158515-158517
   */
  dispose(): void {
    this.clearHoverState();
    this._lastMousePosition = null;
    this._rootRenderObject = null;
    this._tui = null;
    this._lastClickTime.clear();
    this._lastClickPosition.clear();
    this._currentClickCount.clear();
    this._globalReleaseCallbacks.clear();
    this._globalClickCallbacks.clear();
    this._scrollSessionTarget = null;
    this._scrollSessionLastEvent = 0;
    this._lastDragPosition = null;
    MouseManager._instance = null;
  }
}
