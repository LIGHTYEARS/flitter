/**
 * WidgetsBinding — TUI 应用核心编排器单例。
 *
 * 逆向: d9 in tui-layout-engine.js:1114-1193 + tui-render-pipeline.js:1-198
 *
 * 组合所有子系统 (BuildOwner, PipelineOwner, FrameScheduler, FocusManager,
 * MouseManager, TuiController) 并驱动 Widget -> Element -> RenderObject
 * 三棵树的完整生命周期。
 *
 * @example
 * ```ts
 * import { WidgetsBinding } from "./widgets-binding.js";
 *
 * const binding = WidgetsBinding.instance;
 * await binding.runApp(myRootWidget);
 * ```
 *
 * @module
 */

import { BuildOwner } from "../tree/build-owner.js";
import { PipelineOwner } from "../tree/pipeline-owner.js";
import { FrameScheduler } from "../tree/frame-scheduler.js";
import { setBuildOwner, setPipelineOwner } from "../tree/types.js";
import { FocusManager } from "../focus/focus-manager.js";
import { MouseManager } from "../gestures/mouse-manager.js";
import { TuiController } from "../tui/tui-controller.js";
import { MediaQuery, MediaQueryData } from "../widgets/media-query.js";
import type { Widget, Element } from "../tree/element.js";
import type { KeyEvent } from "../vt/types.js";
import type { RenderObject } from "../tree/render-object.js";

/**
 * WidgetsBinding — TUI 应用核心编排器单例。
 *
 * 逆向: d9 in tui-layout-engine.js:1114-1193 + tui-render-pipeline.js:1-198
 *
 * 组合所有子系统 (BuildOwner, PipelineOwner, FrameScheduler, FocusManager,
 * MouseManager, TuiController) 并驱动 Widget -> Element -> RenderObject
 * 三棵树的完整生命周期。
 *
 * 构造时完成:
 * 1. 实例化所有子系统
 * 2. 注册 6 个 FrameScheduler 回调 (frame-start, resize, build, layout, paint, render)
 * 3. 设置全局 setBuildOwner/setPipelineOwner 桥接
 */
export class WidgetsBinding {
  /** 单例实例 */
  private static _instance: WidgetsBinding | undefined;

  /** 帧调度器 */
  readonly frameScheduler: FrameScheduler;

  /** 构建所有者 — 管理脏元素队列和重建调度 */
  readonly buildOwner: BuildOwner;

  /** 渲染管线所有者 — 管理布局与绘制调度 */
  readonly pipelineOwner: PipelineOwner;

  /** 焦点管理器 — 管理键盘焦点树和事件路由 */
  readonly focusManager: FocusManager;

  /** 鼠标管理器 — 命中测试和鼠标事件分发 */
  readonly mouseManager: MouseManager;

  /** 终端控制器 — 管理 raw mode、stdin、信号处理 */
  readonly tui: TuiController;

  /** 根元素 */
  private rootElement: Element | undefined;

  /** 应用是否正在运行 */
  private isRunning = false;

  /** 外部注入的根元素挂载完成回调 */
  private rootElementMountedCallback?: (element: Element) => void;

  /** 是否强制下一帧绘制 */
  private forcePaintOnNextFrame = false;

  /** 当前帧是否应该绘制 */
  private shouldPaintCurrentFrame = false;

  /** 当前帧是否已绘制 */
  private didPaintCurrentFrame = false;

  /** 待处理的 resize 事件 */
  private pendingResizeEvent: { width: number; height: number } | null = null;

  /** 键盘事件拦截器列表 (command palette 等) */
  private keyInterceptors: ((event: KeyEvent) => boolean)[] = [];

  /** 退出等待 Promise */
  private exitPromise: Promise<void> | null = null;

  /** 退出 Promise 的 resolve 函数 */
  private exitResolve: (() => void) | null = null;

  /** 当前 MediaQuery Widget 引用，用于 resize 时更新 */
  private currentMediaQueryData: MediaQueryData | null = null;

  /**
   * 获取 WidgetsBinding 单例实例。
   *
   * 首次访问时自动创建实例。
   *
   * @example
   * ```ts
   * const binding = WidgetsBinding.instance;
   * ```
   */
  static get instance(): WidgetsBinding {
    return (WidgetsBinding._instance ??= new WidgetsBinding());
  }

  /**
   * 重置单例 (仅测试使用)。
   *
   * 清除 _instance 引用，下次访问 instance 时会创建新实例。
   */
  static resetForTesting(): void {
    if (WidgetsBinding._instance) {
      const inst = WidgetsBinding._instance;
      // 如果有 rootElement 正在运行，尝试清理
      if (inst.isRunning) {
        inst.isRunning = false;
        if (inst.exitResolve) {
          inst.exitResolve();
          inst.exitResolve = null;
        }
      }
      inst.frameScheduler.dispose();
      inst.buildOwner.dispose();
      inst.pipelineOwner.dispose();
    }
    WidgetsBinding._instance = undefined;
  }

  /**
   * 私有构造函数 — 通过 WidgetsBinding.instance 访问。
   *
   * 实例化所有子系统，注册帧回调，设置全局桥接。
   */
  private constructor() {
    this.frameScheduler = new FrameScheduler();
    this.buildOwner = new BuildOwner();
    this.pipelineOwner = new PipelineOwner();
    this.focusManager = FocusManager.instance;
    this.mouseManager = MouseManager.instance;
    this.tui = new TuiController();

    // 注册 6 个帧回调
    this.registerFrameCallbacks();

    // 设置全局桥接 — 使 Element.markNeedsRebuild() 等能找到 BuildOwner/PipelineOwner
    setBuildOwner({
      scheduleBuildFor: (e) => this.buildOwner.scheduleBuildFor(e),
    });
    setPipelineOwner({
      requestLayout: (r) => this.pipelineOwner.requestLayout(r),
      requestPaint: (r) => this.pipelineOwner.requestPaint(r),
      removeFromQueues: (r) => this.pipelineOwner.removeFromQueues(r),
    });

    // 连接 BuildOwner 和 PipelineOwner 的 onNeedFrame 回调
    this.buildOwner.setOnNeedFrame(() => this.frameScheduler.requestFrame());
    this.pipelineOwner.setOnNeedFrame(() => this.frameScheduler.requestFrame());
  }

  // ════════════════════════════════════════════════════
  //  runApp — 应用启动入口
  // ════════════════════════════════════════════════════

  /**
   * 启动 TUI 应用。
   *
   * 逆向: d9.runApp in tui-layout-engine.js:1182 + tui-render-pipeline.js:1-27
   *
   * 完整流程:
   * 1. isRunning 防重复调用
   * 2. 初始化 TUI → 等待终端能力
   * 3. 创建 MediaQuery wrapper → mount rootElement
   * 4. 设置事件处理器 → 等待退出
   * 5. finally: cleanup
   *
   * @param widget - 应用根 Widget
   * @throws {Error} 如果应用已在运行
   *
   * @example
   * ```ts
   * await binding.runApp(myRootWidget);
   * ```
   */
  async runApp(widget: Widget): Promise<void> {
    if (this.isRunning) throw Error("App is already running");
    try {
      this.isRunning = true;
      this.tui.init();
      this.tui.enterAltScreen();
      await this.tui.waitForCapabilities(1000);

      const wrapper = this.createMediaQueryWrapper(widget);
      this.rootElement = wrapper.createElement();
      this.rootElement.mount();

      if (this.rootElementMountedCallback) {
        this.rootElementMountedCallback(this.rootElement);
      }

      this.updateRootRenderObject();
      this.mouseManager.setTui(this.tui);
      this.setupEventHandlers();
      this.frameScheduler.requestFrame();

      await this.waitForExit();
    } finally {
      await this.cleanup();
    }
  }

  // ════════════════════════════════════════════════════
  //  stop — 停止应用
  // ════════════════════════════════════════════════════

  /**
   * 停止应用。
   *
   * 设置 isRunning=false 并 resolve exitPromise，使 runApp 的 await 返回。
   *
   * @example
   * ```ts
   * binding.stop();
   * ```
   */
  stop(): void {
    this.isRunning = false;
    if (this.exitResolve) {
      this.exitResolve();
      this.exitResolve = null;
    }
  }

  // ════════════════════════════════════════════════════
  //  公共 API
  // ════════════════════════════════════════════════════

  /**
   * 设置根元素挂载完成回调。
   *
   * 在 runApp 中 rootElement.mount() 之后调用。
   * 供外部（如 interactive.ts）注入挂载完成后的初始化逻辑。
   *
   * @param fn - 回调函数，接收挂载后的根 Element
   *
   * @example
   * ```ts
   * binding.setRootElementMountedCallback((element) => {
   *   // 初始化逻辑
   * });
   * ```
   */
  setRootElementMountedCallback(fn: (element: Element) => void): void {
    this.rootElementMountedCallback = fn;
  }

  /**
   * 添加键盘事件拦截器。
   *
   * 拦截器在 focusManager.handleKeyEvent 之前调用。
   * 返回 true 表示事件已处理，不再继续传递。
   * 用于 command palette、全局快捷键等。
   *
   * @param fn - 拦截器函数，返回 true 表示已处理
   * @returns unsubscribe 函数
   *
   * @example
   * ```ts
   * const unsub = binding.addKeyInterceptor((event) => {
   *   if (event.key === "p" && event.modifiers.ctrl) {
   *     openCommandPalette();
   *     return true;
   *   }
   *   return false;
   * });
   * // 不再需要时
   * unsub();
   * ```
   */
  addKeyInterceptor(fn: (event: KeyEvent) => boolean): () => void {
    this.keyInterceptors.push(fn);
    return () => {
      const idx = this.keyInterceptors.indexOf(fn);
      if (idx !== -1) this.keyInterceptors.splice(idx, 1);
    };
  }

  /**
   * 请求强制绘制帧。
   *
   * 即使没有脏标记也会执行绘制，用于初次渲染等场景。
   */
  requestForcedPaintFrame(): void {
    this.forcePaintOnNextFrame = true;
    this.frameScheduler.requestFrame();
  }

  // ════════════════════════════════════════════════════
  //  测试辅助方法
  // ════════════════════════════════════════════════════

  /**
   * 手动触发键盘事件处理 (仅测试使用)。
   *
   * 绕过 TuiController 事件系统，直接调用 handleKeyEvent 链路。
   *
   * @param event - 键盘事件
   * @internal
   */
  _handleKeyEventForTesting(event: KeyEvent): void {
    this.handleKeyEvent(event);
  }

  /**
   * 模拟 resize 事件 (仅测试使用)。
   *
   * @param width - 新宽度
   * @param height - 新高度
   * @internal
   */
  _simulateResizeForTesting(width: number, height: number): void {
    this.pendingResizeEvent = { width, height };
  }

  // ════════════════════════════════════════════════════
  //  私有方法: 帧回调注册
  // ════════════════════════════════════════════════════

  /**
   * 注册 6 个帧回调到 FrameScheduler。
   *
   * 逆向: d9 constructor 中的 6 个回调注册
   *
   * - frame-start (build phase, priority -20): 帧开始处理
   * - resize (build phase, priority -10): 处理 pending resize
   * - build (build phase, priority 0): buildOwner.buildScopes()
   * - layout (layout phase, priority 0): pipelineOwner.flushLayout()
   * - paint (paint phase, priority 0): 绘制到 screen
   * - render (render phase, priority 0): screen diff → stdout
   */
  private registerFrameCallbacks(): void {
    // frame-start: 帧开始，判断是否需要 paint
    this.frameScheduler.addFrameCallback(
      "frame-start",
      () => this.beginFrame(),
      "build",
      -20,
    );

    // resize: 处理待处理的 resize 事件
    this.frameScheduler.addFrameCallback(
      "resize",
      () => this.processResizeIfPending(),
      "build",
      -10,
    );

    // build: 重建脏元素
    this.frameScheduler.addFrameCallback(
      "build",
      () => this.buildOwner.buildScopes(),
      "build",
      0,
    );

    // layout: 执行布局
    this.frameScheduler.addFrameCallback(
      "layout",
      () => this.pipelineOwner.flushLayout(),
      "layout",
      0,
    );

    // paint: 执行绘制
    this.frameScheduler.addFrameCallback(
      "paint",
      () => this.paint(),
      "paint",
      0,
    );

    // render: 渲染到 stdout
    this.frameScheduler.addFrameCallback(
      "render",
      () => this.render(),
      "render",
      0,
    );
  }

  // ════════════════════════════════════════════════════
  //  私有方法: 事件处理
  // ════════════════════════════════════════════════════

  /**
   * 设置事件处理器。
   *
   * 逆向: d9.setupEventHandlers in tui-render-pipeline.js:106-150
   *
   * 绑定 TuiController 的 onResize/onKey/onMouse/onPaste 到
   * WidgetsBinding 的处理逻辑。
   */
  private setupEventHandlers(): void {
    // resize → pendingResize + requestFrame
    this.tui.onResize((size) => {
      this.pendingResizeEvent = { width: size.width, height: size.height };
      this.frameScheduler.requestFrame();
    });

    // key → interceptors → focusManager → global
    this.tui.onKey((event) => {
      this.handleKeyEvent(event);
    });

    // mouse → mouseManager
    this.tui.onMouse((event) => {
      this.mouseManager.handleMouseEvent(event);
    });

    // paste → focusManager
    this.tui.onPaste((event) => {
      this.focusManager.handlePasteEvent(event);
    });
  }

  /**
   * 处理键盘事件 — interceptors → focusManager → globalKeyEvent。
   *
   * 逆向: d9.setupEventHandlers.onKey
   *
   * @param event - 键盘事件
   */
  private handleKeyEvent(event: KeyEvent): void {
    // 1. 拦截器 (command palette 等)
    for (const interceptor of this.keyInterceptors) {
      if (interceptor(event)) return;
    }

    // 2. 焦点管理器 (冒泡路由)
    if (this.focusManager.handleKeyEvent(event)) return;

    // 3. 全局键盘事件
    this.handleGlobalKeyEvent(event);
  }

  /**
   * 处理全局键盘事件。
   *
   * 逆向: d9.handleGlobalKeyEvent
   *
   * - Ctrl+Z → handleSuspend (终端暂停)
   *
   * @param event - 键盘事件
   */
  private handleGlobalKeyEvent(event: KeyEvent): void {
    // Ctrl+Z → 暂停终端
    if (event.key === "z" && event.modifiers.ctrl) {
      this.tui.handleSuspend();
    }
  }

  // ════════════════════════════════════════════════════
  //  私有方法: MediaQuery
  // ════════════════════════════════════════════════════

  /**
   * 创建 MediaQuery wrapper。
   *
   * 逆向: d9.createMediaQueryWrapper
   *
   * 使用当前终端尺寸和能力信息创建 MediaQueryData，
   * 包裹用户 Widget 为 MediaQuery → child 结构。
   *
   * @param widget - 用户根 Widget
   * @returns MediaQuery Widget
   */
  private createMediaQueryWrapper(widget: Widget): MediaQuery {
    const size = this.tui.getSize();
    const capabilities = this.tui.getCapabilities() ?? {
      emojiWidth: false,
      syncOutput: false,
      kittyKeyboard: false,
      colorPaletteNotifications: false,
      xtversion: null,
    };
    this.currentMediaQueryData = new MediaQueryData(size, capabilities);
    return new MediaQuery({ data: this.currentMediaQueryData, child: widget });
  }

  // ════════════════════════════════════════════════════
  //  私有方法: 帧管线
  // ════════════════════════════════════════════════════

  /**
   * 处理待处理的 resize 事件。
   *
   * 逆向: d9.processResizeIfPending in tui-render-pipeline.js:42-63
   *
   * 如果有 pendingResizeEvent，更新 MediaQuery data，
   * 清除 mouse hover 状态，更新根约束，标记根元素需要重建。
   */
  private processResizeIfPending(): void {
    if (!this.pendingResizeEvent) return;

    const { width, height } = this.pendingResizeEvent;
    this.pendingResizeEvent = null;

    // 更新 MediaQuery data — 通知依赖方重建
    const capabilities = this.tui.getCapabilities() ?? {
      emojiWidth: false,
      syncOutput: false,
      kittyKeyboard: false,
      colorPaletteNotifications: false,
      xtversion: null,
    };
    this.currentMediaQueryData = new MediaQueryData(
      { width, height },
      capabilities,
    );

    // 清除 mouse hover 状态 (resize 时旧的坐标无效)
    this.mouseManager.clearHoverState();

    // 更新根约束
    this.updateRootConstraints(width, height);

    // 标记根元素需要重建 (MediaQuery data 变化)
    if (this.rootElement) {
      this.rootElement.markNeedsRebuild();
    }

    // 强制绘制
    this.forcePaintOnNextFrame = true;

    // 在帧完成后重建 hover 状态
    this.frameScheduler.addPostFrameCallback(() => {
      this.mouseManager.reestablishHoverState();
    });
  }

  /**
   * 帧开始处理。
   *
   * 逆向: d9.beginFrame in tui-render-pipeline.js:65-66
   *
   * 判断当前帧是否需要绘制 (dirty/needsLayout/needsPaint/forceRefresh)。
   */
  private beginFrame(): void {
    this.shouldPaintCurrentFrame =
      this.forcePaintOnNextFrame ||
      this.buildOwner.hasDirtyElements ||
      this.pipelineOwner.hasNodesNeedingPaint;
    this.didPaintCurrentFrame = false;
    this.forcePaintOnNextFrame = false;
  }

  /**
   * 执行绘制。
   *
   * 逆向: d9.paint in tui-render-pipeline.js:71-84
   *
   * flushPaint → renderRenderObject → screen
   */
  private paint(): void {
    if (!this.shouldPaintCurrentFrame) return;

    // 执行 PipelineOwner 的绘制
    this.pipelineOwner.flushPaint();

    // 将根渲染对象绘制到 screen
    this.renderRenderObject();

    this.didPaintCurrentFrame = true;
  }

  /**
   * 渲染到 stdout。
   *
   * 逆向: d9.render in tui-render-pipeline.js:86-93
   *
   * screen diff → stdout
   */
  private render(): void {
    if (!this.didPaintCurrentFrame) return;

    // 通过 TuiController.render() 差分渲染到 stdout
    this.tui.render();
  }

  /**
   * 将渲染树绘制到 Screen 缓冲区。
   *
   * 找到根渲染对象后调用其 paint 方法。
   */
  private renderRenderObject(): void {
    const rootRO = this.pipelineOwner.rootRenderObject;
    if (!rootRO) return;

    const screen = this.tui.getScreen();
    rootRO.paint(screen, 0, 0);
  }

  /**
   * 更新根渲染对象。
   *
   * 从 rootElement 查找关联的 RenderObject，设置到 PipelineOwner 和 MouseManager。
   */
  private updateRootRenderObject(): void {
    if (!this.rootElement) return;
    const ro = this.rootElement.findRenderObject();
    if (ro) {
      this.pipelineOwner.setRootRenderObject(ro);
      this.mouseManager.setRootRenderObject(ro);
    }
  }

  /**
   * 更新根约束。
   *
   * @param width - 终端宽度（列数）
   * @param height - 终端高度（行数）
   */
  private updateRootConstraints(width: number, height: number): void {
    this.pipelineOwner.updateRootConstraints({ width, height });
  }

  // ════════════════════════════════════════════════════
  //  私有方法: 等待退出 & 清理
  // ════════════════════════════════════════════════════

  /**
   * 等待退出信号。
   *
   * 逆向: d9.waitForExit in tui-render-pipeline.js:163-168
   *
   * 创建一个 Promise，当 stop() 被调用时 resolve。
   */
  private waitForExit(): Promise<void> {
    this.exitPromise = new Promise<void>((resolve) => {
      this.exitResolve = resolve;
    });
    return this.exitPromise;
  }

  /**
   * 清理所有资源。
   *
   * 逆向: d9.cleanup in tui-render-pipeline.js:169-172
   *
   * unmount rootElement → dispose 所有子系统 → tui.deinit()
   */
  private async cleanup(): Promise<void> {
    // 卸载根元素
    if (this.rootElement) {
      this.rootElement.unmount();
      this.rootElement = undefined;
    }

    // dispose 所有子系统
    this.buildOwner.dispose();
    this.pipelineOwner.dispose();
    this.frameScheduler.dispose();

    // 清除全局桥接
    setBuildOwner(undefined);
    setPipelineOwner(undefined);

    // 清理状态
    this.keyInterceptors = [];
    this.currentMediaQueryData = null;
    this.pendingResizeEvent = null;
    this.isRunning = false;

    // 终端清理
    await this.tui.deinit();
  }
}
