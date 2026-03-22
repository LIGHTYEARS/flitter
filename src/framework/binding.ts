// WidgetsBinding + runApp() — top-level orchestrator
// Amp ref: J3 (WidgetsBinding), cz8 (runApp), amp-strings.txt:530127
// Reference: .reference/widget-tree.md, .reference/frame-scheduler.md
//
// CRITICAL Amp fidelity notes:
// - WidgetsBinding is a singleton that registers callbacks with FrameScheduler
// - Owns BuildOwner + PipelineOwner
// - runApp creates the root element, attaches it, and schedules first frame
// - Frame phases: build -> layout -> paint -> render
//
// Phase 5 upgrade: ScreenBuffer + Renderer integration, dirty state tracking,
// frame phase methods (beginFrame, paint, render), handleResize via pending event

import { BuildOwner } from './build-owner';
import { PipelineOwner } from './pipeline-owner';
import { Widget, StatelessWidget, type BuildContext } from './widget';
import { Element, StatelessElement } from './element';
import { BoxConstraints } from '../core/box-constraints';
import { Size } from '../core/types';
import { ScreenBuffer } from '../terminal/screen-buffer';
import { Renderer, type CursorState } from '../terminal/renderer';
import { paintRenderTree } from '../scheduler/paint';
import type { KeyEvent, MouseEvent as TuiMouseEvent } from '../input/events';
import { MouseManager } from '../input/mouse-manager';

// ---------------------------------------------------------------------------
// Global build/paint scheduler accessors (Amp: lF, dF, VG8, XG8, xH)
//
// These module-level variables bridge elements to the binding's
// BuildOwner and PipelineOwner. Set during WidgetsBinding construction.
// ---------------------------------------------------------------------------

/** Build scheduler interface — wraps BuildOwner.scheduleBuildFor */
interface BuildScheduler {
  scheduleBuildFor(element: Element): void;
}

/** Paint scheduler interface — wraps PipelineOwner methods */
interface PaintScheduler {
  requestLayout(node?: any): void;
  requestPaint(node?: any): void;
  removeFromQueues(node?: any): void;
}

let _buildScheduler: BuildScheduler | null = null;
let _paintScheduler: PaintScheduler | null = null;

/**
 * Register the global build and paint schedulers.
 * Called once during WidgetsBinding construction.
 * Amp ref: VG8(g, t)
 */
export function initSchedulers(
  buildScheduler: BuildScheduler,
  paintScheduler: PaintScheduler,
): void {
  _buildScheduler = buildScheduler;
  _paintScheduler = paintScheduler;
}

/**
 * Get the build scheduler. Used by Element.markNeedsRebuild().
 * Amp ref: XG8()
 */
export function getBuildScheduler(): BuildScheduler {
  if (!_buildScheduler) {
    // In test mode, return a no-op scheduler
    if (isTestEnvironment()) {
      return { scheduleBuildFor: () => {} };
    }
    throw new Error(
      'Build scheduler not initialized. Make sure WidgetsBinding is created.',
    );
  }
  return _buildScheduler;
}

/**
 * Get the paint scheduler. Used by RenderObject.markNeedsLayout/Paint().
 * Amp ref: xH()
 */
export function getPaintScheduler(): PaintScheduler {
  if (!_paintScheduler) {
    if (isTestEnvironment()) {
      return {
        requestLayout: () => {},
        requestPaint: () => {},
        removeFromQueues: () => {},
      };
    }
    throw new Error(
      'Paint scheduler not initialized. Make sure WidgetsBinding is created.',
    );
  }
  return _paintScheduler;
}

/** Reset global schedulers (for testing). */
export function resetSchedulers(): void {
  _buildScheduler = null;
  _paintScheduler = null;
}

/**
 * Detect test environment.
 * Amp ref: jz8() — checks BUN_TEST, VITEST, NODE_TEST_CONTEXT
 */
function isTestEnvironment(): boolean {
  if (typeof process === 'undefined') return false;
  return (
    process.env.BUN_TEST === '1' ||
    process.env.VITEST === 'true' ||
    process.env.NODE_TEST_CONTEXT === '1'
  );
}

// ---------------------------------------------------------------------------
// _RootWidget — internal root widget wrapper
//
// Wraps the user's widget to provide a root element for the tree.
// ---------------------------------------------------------------------------

class _RootWidget extends StatelessWidget {
  readonly child: Widget;

  constructor(opts: { child: Widget }) {
    super();
    this.child = opts.child;
  }

  build(_context: BuildContext): Widget {
    return this.child;
  }

  override createElement(): StatelessElement {
    return new StatelessElement(this);
  }
}

// ---------------------------------------------------------------------------
// Output writer interface — abstracts stdout for testability
// ---------------------------------------------------------------------------

export interface OutputWriter {
  write(data: string): void;
}

// ---------------------------------------------------------------------------
// WidgetsBinding (Amp: J3) — singleton orchestrator
//
// Ties together BuildOwner, PipelineOwner, ScreenBuffer, Renderer,
// and the frame scheduler. Orchestrates the full 4-phase pipeline:
//   BUILD -> LAYOUT -> PAINT -> RENDER
//
// Phase 5 upgrade: Real ScreenBuffer + Renderer integration with
// dirty-state tracking and frame-skip optimization.
// ---------------------------------------------------------------------------

export class WidgetsBinding {
  private static _instance: WidgetsBinding | null = null;

  readonly buildOwner: BuildOwner;
  readonly pipelineOwner: PipelineOwner;
  private _rootElement: Element | null = null;
  private _renderViewSize: Size = new Size(80, 24); // default terminal size
  private _frameScheduled: boolean = false;
  private _isRunning: boolean = false;

  // --- Dirty state tracking (Amp ref: J3 frame state) ---
  private _forcePaintOnNextFrame: boolean = false;
  private _shouldPaintCurrentFrame: boolean = false;
  private _didPaintCurrentFrame: boolean = false;
  private _pendingResizeEvent: { width: number; height: number } | null = null;

  // --- Screen buffer + renderer (Phase 5) ---
  private _screen: ScreenBuffer | null = null;
  private _renderer: Renderer | null = null;
  private _output: OutputWriter | null = null;

  // --- Mouse manager (Phase 11) ---
  // Amp ref: J3.mouseManager — MouseManager instance
  mouseManager: MouseManager | null = null;

  // --- Global event callback lists (Amp ref: J3 event callbacks) ---
  // Called before the focus system processes events.
  eventCallbacks: {
    key: Array<(e: KeyEvent) => void>;
    mouse: Array<(e: TuiMouseEvent) => void>;
    paste: Array<(s: string) => void>;
  } = { key: [], mouse: [], paste: [] };

  // --- Keyboard event interceptor chain (Amp ref: J3 key interceptors) ---
  // Interceptors are called in order; if any returns 'handled', the event stops propagating.
  keyInterceptors: Array<(e: KeyEvent) => 'handled' | 'ignored'> = [];

  private constructor() {
    this.buildOwner = new BuildOwner();
    this.pipelineOwner = new PipelineOwner();

    // Wire MouseManager singleton (Amp ref: J3 constructor sets mouseManager)
    this.mouseManager = MouseManager.instance;

    // Wire up global schedulers (Amp ref: VG8 call in J3 constructor)
    initSchedulers(
      {
        scheduleBuildFor: (element: Element) =>
          this.buildOwner.scheduleBuildFor(element),
      },
      {
        requestLayout: () => this.pipelineOwner.requestLayout(),
        requestPaint: (node?: any) => this.pipelineOwner.requestPaint(node),
        removeFromQueues: (node?: any) =>
          this.pipelineOwner.removeFromQueues(node),
      },
    );

    // Try to register frame callbacks with FrameScheduler if available
    this._tryRegisterFrameCallbacks();
  }

  /**
   * Get or create the singleton WidgetsBinding.
   * Amp ref: J3.instance — static get instance() { return J3._instance ??= new J3; }
   */
  static get instance(): WidgetsBinding {
    if (!WidgetsBinding._instance) {
      WidgetsBinding._instance = new WidgetsBinding();
    }
    return WidgetsBinding._instance;
  }

  /** Reset singleton for testing. */
  static reset(): void {
    if (WidgetsBinding._instance) {
      WidgetsBinding._instance.buildOwner.dispose();
      WidgetsBinding._instance.pipelineOwner.dispose();
      WidgetsBinding._instance._screen = null;
      WidgetsBinding._instance._renderer = null;
      WidgetsBinding._instance._output = null;
      WidgetsBinding._instance.mouseManager = null;
      WidgetsBinding._instance.eventCallbacks = { key: [], mouse: [], paste: [] };
      WidgetsBinding._instance.keyInterceptors = [];
    }
    WidgetsBinding._instance = null;
    MouseManager.reset();
    resetSchedulers();
  }

  get rootElement(): Element | null {
    return this._rootElement;
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  // --- Screen buffer + renderer accessors ---

  /**
   * Get the screen buffer, lazy-creating if needed.
   * Amp ref: J3 screen buffer access
   */
  getScreen(): ScreenBuffer {
    if (!this._screen) {
      this._screen = new ScreenBuffer(
        this._renderViewSize.width,
        this._renderViewSize.height,
      );
    }
    return this._screen;
  }

  /**
   * Get the renderer, lazy-creating if needed.
   */
  getRenderer(): Renderer {
    if (!this._renderer) {
      this._renderer = new Renderer();
    }
    return this._renderer;
  }

  /**
   * Set the output writer (for testing — defaults to null, meaning no output).
   * In production, call setOutput(process.stdout) to enable terminal output.
   */
  setOutput(output: OutputWriter | null): void {
    this._output = output;
  }

  /**
   * Get the current output writer.
   */
  getOutput(): OutputWriter | null {
    return this._output;
  }

  // --- Dirty state accessors ---

  get forcePaintOnNextFrame(): boolean {
    return this._forcePaintOnNextFrame;
  }

  get shouldPaintCurrentFrame(): boolean {
    return this._shouldPaintCurrentFrame;
  }

  get didPaintCurrentFrame(): boolean {
    return this._didPaintCurrentFrame;
  }

  get pendingResizeEvent(): { width: number; height: number } | null {
    return this._pendingResizeEvent;
  }

  // --- Lifecycle ---

  /**
   * Attach the root widget to create the three trees (widget/element/render).
   *
   * Amp ref: J3.runApp(g) — creates MediaQuery wrapper, mounts root element
   * Simplified: no MediaQuery wrapper yet (Phase 7)
   */
  attachRootWidget(widget: Widget): void {
    // Wrap in a RootWidget that provides the root element
    const rootWidget = new _RootWidget({ child: widget });
    this._rootElement = rootWidget.createElement();

    // Mount the root element (this builds the tree)
    if (
      this._rootElement &&
      'mount' in this._rootElement &&
      typeof (this._rootElement as any).mount === 'function'
    ) {
      (this._rootElement as any).mount();
    }

    // Set initial constraints based on terminal size
    this.pipelineOwner.setConstraints(
      BoxConstraints.tight(this._renderViewSize),
    );

    // Wire the root render object to the pipeline owner
    this.updateRootRenderObject();

    this._isRunning = true;
  }

  /**
   * Walk from rootElement to find the first render object and set it
   * on the pipelineOwner.
   * Amp ref: J3 updateRootRenderObject
   */
  updateRootRenderObject(): void {
    if (!this._rootElement) return;

    const renderObject = this._findRootRenderObject(this._rootElement);
    if (renderObject) {
      this.pipelineOwner.setRootRenderObject(renderObject as any);
    }
  }

  /**
   * DFS walk to find the first render object in the element tree.
   */
  private _findRootRenderObject(element: Element): any {
    // Check if this element has a direct render object
    if (element.renderObject) {
      return element.renderObject;
    }
    // Recurse into children
    for (const child of element.children) {
      const ro = this._findRootRenderObject(child);
      if (ro) return ro;
    }
    return null;
  }

  // --- Frame phase methods (Amp: J3 4-phase pipeline) ---

  /**
   * Begin frame — runs first in BUILD phase.
   * Determines if paint is needed this frame based on dirty state.
   *
   * Amp ref: J3.beginFrame()
   */
  beginFrame(): void {
    this._didPaintCurrentFrame = false;
    this._shouldPaintCurrentFrame =
      this._forcePaintOnNextFrame ||
      this.buildOwner.hasDirtyElements ||
      this.pipelineOwner.hasNodesNeedingLayout ||
      this.pipelineOwner.hasNodesNeedingPaint ||
      (this._screen?.requiresFullRefresh ?? false);
    this._forcePaintOnNextFrame = false;
  }

  /**
   * Process any pending resize event.
   * Runs after beginFrame in the BUILD phase.
   *
   * Amp ref: J3.processResizeIfPending()
   */
  processResizeIfPending(): void {
    if (!this._pendingResizeEvent) return;

    const { width, height } = this._pendingResizeEvent;
    this._pendingResizeEvent = null;

    this._renderViewSize = new Size(width, height);
    if (this._screen) {
      this._screen.resize(width, height);
    }
    this.pipelineOwner.updateRootConstraints(this._renderViewSize);
    this._shouldPaintCurrentFrame = true;
  }

  /**
   * Paint phase — paints the render tree to the screen buffer.
   * If shouldPaintCurrentFrame is false, this is a frame skip (no-op).
   *
   * Amp ref: J3.paint()
   */
  paint(): void {
    if (!this._shouldPaintCurrentFrame) return;

    // Flush paint dirty flags on the pipeline owner
    this.pipelineOwner.flushPaint();

    // Get root render object
    const rootRO = this.pipelineOwner.rootNode;
    if (!rootRO) return;

    // Get or create screen buffer
    const screen = this.getScreen();
    screen.clear();

    // DFS paint the render tree using the real PaintContext and paintRenderTree
    paintRenderTree(rootRO, screen);

    this._didPaintCurrentFrame = true;
  }

  /**
   * Render phase — diffs the screen buffer and writes ANSI output.
   * Only runs if paint phase actually executed (didPaintCurrentFrame).
   *
   * Amp ref: J3.render()
   */
  render(): void {
    if (!this._didPaintCurrentFrame) return;

    const screen = this.getScreen();
    const renderer = this.getRenderer();

    // Get diff from screen buffer
    const patches = screen.getDiff();

    // Build cursor state
    const cursor: CursorState = {
      position: screen.getCursor(),
      visible: screen.isCursorVisible(),
      shape: screen.getCursorShape(),
    };

    // Generate ANSI output
    const output = renderer.render(patches, cursor);

    // Write to output if available
    if (this._output && output.length > 0) {
      this._output.write(output);
    }

    // Swap buffers
    screen.present();
  }

  // --- Resize handling ---

  /**
   * Handle terminal resize.
   * Sets pending resize event and requests a frame.
   *
   * Amp ref: WidgetsBinding resize handling — updates constraints, schedules frame
   */
  handleResize(width: number, height: number): void {
    this._pendingResizeEvent = { width, height };
    this.scheduleFrame();
  }

  /**
   * Request a forced paint on the next frame.
   * Amp ref: J3.requestForcedPaintFrame()
   */
  requestForcedPaintFrame(): void {
    this._forcePaintOnNextFrame = true;
    this.scheduleFrame();
  }

  // --- Frame scheduling ---

  /**
   * Schedule a frame (build + layout + paint + render).
   * Tries FrameScheduler first; falls back to queueMicrotask.
   *
   * Amp ref: c9.requestFrame() — coalesced, only one pending frame at a time
   */
  scheduleFrame(): void {
    if (this._frameScheduled) return;
    this._frameScheduled = true;

    // Try to use FrameScheduler if available
    if (this._useFrameScheduler()) return;

    // Fallback: use queueMicrotask
    queueMicrotask(() => this.drawFrame());
  }

  /**
   * Execute one full frame: beginFrame -> build -> layout -> paint -> render.
   *
   * Amp ref: c9.executeFrame() — iterates ["build", "layout", "paint", "render"]
   */
  drawFrame(): void {
    this._frameScheduled = false;

    // BEGIN FRAME
    this.beginFrame();

    // PROCESS RESIZE
    this.processResizeIfPending();

    // BUILD phase
    this.buildOwner.buildScopes();
    this.updateRootRenderObject();

    // LAYOUT phase
    this.pipelineOwner.updateRootConstraints(this._renderViewSize);
    this.pipelineOwner.flushLayout();

    // PAINT phase
    this.paint();

    // RENDER phase
    this.render();
  }

  /**
   * Synchronous version for testing.
   * Runs build -> layout -> paint -> render immediately without microtask.
   * Also runs beginFrame + processResizeIfPending for full pipeline.
   */
  drawFrameSync(): void {
    this._frameScheduled = false;

    // BEGIN FRAME
    this.beginFrame();

    // PROCESS RESIZE
    this.processResizeIfPending();

    // BUILD phase
    this.buildOwner.buildScopes();
    this.updateRootRenderObject();

    // LAYOUT phase
    this.pipelineOwner.flushLayout();

    // PAINT phase
    this.paint();

    // RENDER phase
    this.render();
  }

  /**
   * Stop the binding.
   * Amp ref: J3.stop()
   */
  stop(): void {
    this._isRunning = false;
    if (this._rootElement) {
      this._rootElement.unmount();
      this._rootElement = null;
    }
    this.buildOwner.dispose();
    this.pipelineOwner.dispose();
  }

  // --- Private helpers ---

  /**
   * Try to register frame callbacks with FrameScheduler.
   * Graceful degradation: if FrameScheduler is not available (05-01 not done),
   * falls through to queueMicrotask fallback.
   */
  private _tryRegisterFrameCallbacks(): void {
    // FrameScheduler (Plan 05-01) may not be available yet.
    // When it is, this method will register the 6 phase callbacks:
    //   BUILD phase, priority -2000: "frame-start" -> beginFrame()
    //   BUILD phase, priority -1000: "resize" -> processResizeIfPending()
    //   BUILD phase, priority 0: "build" -> buildOwner.buildScopes() + updateRootRenderObject()
    //   LAYOUT phase, priority 0: "layout" -> updateRootConstraints() + pipelineOwner.flushLayout()
    //   PAINT phase, priority 0: "paint" -> paint()
    //   RENDER phase, priority 0: "render" -> render()
    try {
      // Attempt dynamic import of FrameScheduler
      const mod = require('../scheduler/frame-scheduler');
      if (mod && mod.FrameScheduler) {
        const scheduler = mod.FrameScheduler.instance;
        // Register callbacks using addFrameCallback(id, callback, phase, priority, name)
        scheduler.addFrameCallback('frame-start', () => this.beginFrame(), 'build', -2000, 'frame-start');
        scheduler.addFrameCallback('resize', () => this.processResizeIfPending(), 'build', -1000, 'resize');
        scheduler.addFrameCallback('build', () => {
          this.buildOwner.buildScopes();
          this.updateRootRenderObject();
        }, 'build', 0, 'build');
        scheduler.addFrameCallback('layout', () => {
          this.pipelineOwner.updateRootConstraints(this._renderViewSize);
          this.pipelineOwner.flushLayout();
        }, 'layout', 0, 'layout');
        scheduler.addFrameCallback('paint-phase', () => this.paint(), 'paint', 0, 'paint');
        scheduler.addFrameCallback('render-phase', () => this.render(), 'render', 0, 'render');
      }
    } catch (_e) {
      // FrameScheduler not available yet — will use queueMicrotask fallback
    }
  }

  /**
   * Try to use FrameScheduler for frame scheduling.
   * Returns true if successful, false if FrameScheduler is not available.
   */
  private _useFrameScheduler(): boolean {
    try {
      const mod = require('../scheduler/frame-scheduler');
      if (mod && mod.FrameScheduler) {
        mod.FrameScheduler.instance.requestFrame();
        return true;
      }
    } catch (_e) {
      // Not available
    }
    return false;
  }
}

// ---------------------------------------------------------------------------
// runApp (Amp: cz8)
//
// Top-level entry point. Creates/gets the binding singleton,
// wraps the root widget in MediaQuery, attaches it, and schedules the first frame.
//
// Amp ref: async function cz8(g, t) { let b = J3.instance; await b.runApp(g); }
// Phase 10 upgrade: async, MediaQuery wrapping, SIGWINCH handler
// ---------------------------------------------------------------------------

import { MediaQuery, MediaQueryData } from '../widgets/media-query';

export async function runApp(widget: Widget): Promise<WidgetsBinding> {
  const binding = WidgetsBinding.instance;

  // Determine terminal size — use reasonable defaults in test mode
  let cols = 80;
  let rows = 24;
  if (!isTestEnvironment()) {
    try {
      // Try to get real terminal size from platform
      const { BunPlatform } = require('../terminal/platform');
      const platform = new BunPlatform();
      const size = platform.getTerminalSize();
      cols = size.columns;
      rows = size.rows;
    } catch (_e) {
      // BunPlatform not available, use defaults
    }
  }

  // Wrap the user's widget in MediaQuery so all descendants can access screen size
  const wrappedWidget = new MediaQuery({
    data: MediaQueryData.fromTerminal(cols, rows),
    child: widget,
  });

  binding.attachRootWidget(wrappedWidget);

  // Register SIGWINCH handler for terminal resize
  if (!isTestEnvironment() && typeof process !== 'undefined') {
    process.on('SIGWINCH', () => {
      try {
        const { BunPlatform } = require('../terminal/platform');
        const platform = new BunPlatform();
        const size = platform.getTerminalSize();
        binding.handleResize(size.columns, size.rows);
        // Also update the MediaQuery data — we need to rebuild with the new root
        const newWrapped = new MediaQuery({
          data: MediaQueryData.fromTerminal(size.columns, size.rows),
          child: widget,
        });
        binding.attachRootWidget(newWrapped);
      } catch (_e) {
        // Ignore resize errors
      }
    });
  }

  binding.scheduleFrame();
  return binding;
}
