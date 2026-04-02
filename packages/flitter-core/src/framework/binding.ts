// WidgetsBinding + runApp() -- top-level orchestrator
// Amp ref: J3 (WidgetsBinding), cz8 (runApp), amp-strings.txt:530127
// Reference: .reference/widget-tree.md, .reference/frame-scheduler.md
//
// CRITICAL Amp fidelity notes:
// - WidgetsBinding is a singleton that registers callbacks with FrameScheduler
// - Owns BuildOwner + PipelineOwner + TerminalManager
// - runApp creates the root element, attaches it, and schedules first frame
// - Frame phases: build -> layout -> paint -> render
//
// Phase 23-03 refactoring: Aligned with Amp's J3 class structure.
// - Static FrameScheduler import (no dynamic require)
// - TerminalManager (tui) field owned by binding
// - runApp() instance method with waitForExit/stop pattern
// - Standalone runApp() is thin wrapper (matching cz8)
// - Frame scheduling done via FrameScheduler callbacks (no binding-level wrappers)
// - cleanup() method matching J3.cleanup

import { BuildOwner } from './build-owner';
import { PipelineOwner } from './pipeline-owner';
import { Widget, StatelessWidget, type BuildContext } from './widget';
import { Element, StatelessElement } from './element';
import { RenderObject, RenderBox } from './render-object';
import { BoxConstraints } from '../core/box-constraints';
import { Size } from '../core/types';
import { ScreenBuffer } from '../terminal/screen-buffer';
import { Renderer, type CursorState } from '../terminal/renderer';
import { paintRenderTree } from '../scheduler/paint';
import type { KeyEvent, MouseEvent as TuiMouseEvent } from '../input/events';
import { MouseManager } from '../input/mouse-manager';
import { debugFlags } from '../diagnostics/debug-flags';
import { pipelineLog, dumpPaintTree } from '../diagnostics/pipeline-debug';
import { FocusManager } from '../input/focus';
import { InputParser } from '../input/input-parser';
import { EventDispatcher } from '../input/event-dispatcher';
import { PerformanceOverlay } from '../diagnostics/perf-overlay';
import { FrameStats } from '../diagnostics/frame-stats';
import { FrameScheduler } from '../scheduler/frame-scheduler';
import { TerminalManager } from '../terminal/terminal-manager';
import { MockPlatform, BunPlatform, type PlatformAdapter } from '../terminal/platform';
import { MediaQuery, MediaQueryData } from '../widgets/media-query';

// ---------------------------------------------------------------------------
// Global build/paint scheduler accessors (Amp: lF, dF, VG8, XG8, xH)
//
// These module-level variables bridge elements to the binding's
// BuildOwner and PipelineOwner. Set during WidgetsBinding construction.
// ---------------------------------------------------------------------------

/** Build scheduler interface -- wraps BuildOwner.scheduleBuildFor */
interface BuildScheduler {
  scheduleBuildFor(element: Element): void;
}

/** Paint scheduler interface -- wraps PipelineOwner methods */
interface PaintScheduler {
  requestLayout(node?: RenderObject): void;
  requestPaint(node?: RenderObject): void;
  removeFromQueues(node?: RenderObject): void;
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
 * No-op build scheduler for when binding is not yet initialized.
 * Amp ref: XG8() always has a valid bridge, but in tests without
 * WidgetsBinding, we gracefully degrade to no-op.
 */
const _noopBuildScheduler: BuildScheduler = { scheduleBuildFor: () => {} };

/**
 * Get the build scheduler. Used by Element.markNeedsRebuild().
 * Amp ref: XG8()
 */
export function getBuildScheduler(): BuildScheduler {
  return _buildScheduler ?? _noopBuildScheduler;
}

/**
 * No-op paint scheduler for when binding is not yet initialized.
 */
const _noopPaintScheduler: PaintScheduler = {
  requestLayout: () => {},
  requestPaint: () => {},
  removeFromQueues: () => {},
};

/**
 * Get the paint scheduler. Used by RenderObject.markNeedsLayout/Paint().
 * Amp ref: xH()
 */
export function getPaintScheduler(): PaintScheduler {
  return _paintScheduler ?? _noopPaintScheduler;
}

/** Reset global schedulers (for testing). */
export function resetSchedulers(): void {
  _buildScheduler = null;
  _paintScheduler = null;
  _buildOwner = null;
}

// ---------------------------------------------------------------------------
// Global BuildOwner accessor
// Used by Element.deactivateChild() to register inactive elements.
// NOTE: Not present in Amp binary. Extension for GlobalKey reparenting.
// Amp ref deviation: See .gap/02-deactivate-lifecycle.md
// ---------------------------------------------------------------------------

let _buildOwner: BuildOwner | null = null;

/**
 * Get the BuildOwner. Used by Element subclasses for inactive element tracking.
 */
export function getBuildOwner(): BuildOwner | null {
  return _buildOwner;
}

/**
 * Detect test environment.
 * Amp ref: jz8() -- checks BUN_TEST, VITEST, NODE_TEST_CONTEXT
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
// _RootWidget -- internal root widget wrapper
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
// Output writer interface -- abstracts stdout for testability
// ---------------------------------------------------------------------------

export interface OutputWriter {
  write(data: string): void;
}

// ---------------------------------------------------------------------------
// WidgetsBinding (Amp: J3) -- singleton orchestrator
//
// Ties together BuildOwner, PipelineOwner, FrameScheduler, TerminalManager,
// and the frame callbacks. Orchestrates the full 4-phase pipeline:
//   BUILD -> LAYOUT -> PAINT -> RENDER
//
// Phase 23-03: Refactored to match Amp's J3 class structure.
// - Static FrameScheduler import
// - tui (TerminalManager) field
// - 6 named frame callbacks registered in constructor
// - runApp() instance method with waitForExit/stop pattern
// ---------------------------------------------------------------------------

export class WidgetsBinding {
  private static _instance: WidgetsBinding | null = null;

  // Amp ref: J3.frameScheduler = c9.instance
  readonly frameScheduler: FrameScheduler = FrameScheduler.instance;

  readonly buildOwner: BuildOwner;
  readonly pipelineOwner: PipelineOwner;
  private _rootElement: Element | null = null;
  private _renderViewSize: Size = new Size(80, 24); // default terminal size
  private _isRunning: boolean = false;

  // --- Dirty state tracking (Amp ref: J3 frame state) ---
  private _forcePaintOnNextFrame: boolean = false;
  private _shouldPaintCurrentFrame: boolean = false;
  private _didPaintCurrentFrame: boolean = false;
  private _pendingResizeEvent: { width: number; height: number } | null = null;

  // --- TerminalManager (Amp ref: J3.tui = new wB0) ---
  // Created with MockPlatform by default (safe for tests).
  // In runApp(), replaced with real BunPlatform for production.
  private _tui: TerminalManager;

  // --- InputParser (Amp ref: J3.setupEventHandlers -- input-system.md:601-634) ---
  // Created by setupEventHandlers(); wired to EventDispatcher.dispatch.
  private _inputParser: InputParser | null = null;

  // --- Screen buffer + renderer backward compat (Phase 5 legacy) ---
  // getScreen()/getRenderer() delegate to tui's owned instances.
  // setOutput()/getOutput() provide legacy output writer interface.
  private _output: OutputWriter | null = null;

  // --- Mouse manager (Phase 11) ---
  // Amp ref: J3.mouseManager -- MouseManager instance
  mouseManager: MouseManager | null = null;

  // --- Focus manager (Amp ref: J3.focusManager) ---
  focusManager: FocusManager | null = null;

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

  // --- Performance overlay (Phase 21: PERF-03) ---
  private _showFrameStatsOverlay: boolean = false;
  private _perfOverlay: PerformanceOverlay | null = null;
  private _frameStats: FrameStats | null = null;

  // --- waitForExit / stop pattern (Amp ref: J3.exitResolve) ---
  private _exitResolve: (() => void) | null = null;
  private _exitPromise: Promise<void> | null = null;

  // --- Root element mounted callback (Amp ref: J3.rootElementMountedCallback) ---
  private _rootElementMountedCallback: (() => void) | null = null;

  private constructor() {
    this.buildOwner = new BuildOwner();
    this.pipelineOwner = new PipelineOwner();

    // Create tui with MockPlatform as safe default (tests get this).
    // In runApp() for production, this is replaced with BunPlatform.
    // Amp ref: J3.tui = new wB0
    this._tui = new TerminalManager(new MockPlatform());

    // Wire MouseManager singleton (Amp ref: J3 constructor sets mouseManager)
    this.mouseManager = MouseManager.instance;

    // Wire FocusManager singleton (Amp ref: J3 constructor sets focusManager)
    this.focusManager = FocusManager.instance;

    // Wire up global schedulers (Amp ref: VG8 call in J3 constructor)
    // Note: initSchedulers just delegates to buildOwner.scheduleBuildFor.
    // In Phase 24, BuildOwner itself will call requestFrame, but for now
    // keep the bridge behavior working.
    initSchedulers(
      {
        scheduleBuildFor: (element: Element) => {
          this.buildOwner.scheduleBuildFor(element);
          // requestFrame no longer needed here — BuildOwner.scheduleBuildFor calls it directly
          // Amp ref: VG8 bridge just delegates, NB0.scheduleBuildFor handles requestFrame
        },
      },
      {
        requestLayout: () => this.pipelineOwner.requestLayout(),
        requestPaint: (node?: RenderObject) => this.pipelineOwner.requestPaint(node),
        removeFromQueues: (node?: RenderObject) =>
          node ? this.pipelineOwner.removeFromQueues(node) : undefined,
      },
    );

    // Set global BuildOwner reference for Element.deactivateChild() access
    // Amp ref deviation: See .gap/02-deactivate-lifecycle.md
    _buildOwner = this.buildOwner;

    // Register 6 named frame callbacks with FrameScheduler (Amp ref: J3 constructor)
    // No try/catch, no dynamic require -- static import used.
    this.frameScheduler.addFrameCallback(
      'frame-start',
      () => this.beginFrame(),
      'build',
      -2000,
      'WidgetsBinding.beginFrame',
    );
    this.frameScheduler.addFrameCallback(
      'resize',
      () => this.processResizeIfPending(),
      'build',
      -1000,
      'WidgetsBinding.processResizeIfPending',
    );
    this.frameScheduler.addFrameCallback(
      'build',
      () => {
        this.buildOwner.buildScopes();
        this.buildOwner.finalizeTree(); // Permanently unmount deactivated elements
        this.updateRootRenderObject();
      },
      'build',
      0,
      'BuildOwner.buildScopes',
    );
    this.frameScheduler.addFrameCallback(
      'layout',
      () => {
        this.updateRootConstraints(this._renderViewSize);
        if (this.pipelineOwner.flushLayout()) {
          this._shouldPaintCurrentFrame = true;
        }
      },
      'layout',
      0,
      'PipelineOwner.flushLayout',
    );
    this.frameScheduler.addFrameCallback(
      'paint-phase',
      () => this.paint(),
      'paint',
      0,
      'WidgetsBinding.paint',
    );
    this.frameScheduler.addFrameCallback(
      'render-phase',
      () => {
        this.render();
        // POST-FRAME: Re-evaluate hover state after layout changes
        // Amp ref: Pg.reestablishHoverState() registered as post-frame callback
        if (this.mouseManager) {
          this.mouseManager.reestablishHoverState();
        }
      },
      'render',
      0,
      'WidgetsBinding.render',
    );
  }

  /**
   * Get or create the singleton WidgetsBinding.
   * Amp ref: J3.instance -- static get instance() { return J3._instance ??= new J3; }
   */
  static get instance(): WidgetsBinding {
    if (!WidgetsBinding._instance) {
      WidgetsBinding._instance = new WidgetsBinding();
    }
    return WidgetsBinding._instance;
  }

  /**
   * Get the TerminalManager (Amp ref: J3.tui).
   */
  get tui(): TerminalManager {
    return this._tui;
  }

  /** Reset singleton for testing. */
  static reset(): void {
    if (WidgetsBinding._instance) {
      const inst = WidgetsBinding._instance;
      inst.buildOwner.dispose();
      inst.pipelineOwner.dispose();
      inst._output = null;
      inst.mouseManager = null;
      inst.focusManager = null;
      inst.eventCallbacks = { key: [], mouse: [], paste: [] };
      inst.keyInterceptors = [];
      inst._showFrameStatsOverlay = false;
      inst._perfOverlay = null;
      inst._frameStats = null;
      inst._exitResolve = null;
      inst._exitPromise = null;
      inst._rootElementMountedCallback = null;
      // Dispose input parser if it was created
      if (inst._inputParser) {
        inst._inputParser.dispose();
        inst._inputParser = null;
      }
      // Remove 6 frame callbacks from FrameScheduler
      // Amp ref: J3.cleanup removes all named callbacks
      for (const name of ['frame-start', 'resize', 'build', 'layout', 'paint-phase', 'render-phase']) {
        inst.frameScheduler.removeFrameCallback(name);
      }
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

  // --- Screen buffer + renderer accessors (backward compat) ---

  /**
   * Get the screen buffer. Delegates to tui.screenBuffer.
   * Amp ref: J3 screen buffer access
   */
  getScreen(): ScreenBuffer {
    return this._tui.screenBuffer;
  }

  /**
   * Get the renderer. Delegates to tui.renderer.
   */
  getRenderer(): Renderer {
    return this._tui.renderer;
  }

  /**
   * Set the output writer (for testing -- defaults to null, meaning no output).
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
   * Amp ref: J3.runApp(g) -- creates MediaQuery wrapper, mounts root element
   * Simplified: no MediaQuery wrapper yet (Phase 7)
   */
  attachRootWidget(widget: Widget): void {
    // Wrap in a RootWidget that provides the root element
    const rootWidget = new _RootWidget({ child: widget });
    this._rootElement = rootWidget.createElement();

    // Mount the root element (this builds the tree)
    if (this._rootElement) {
      this._rootElement.mount();
    }

    // Set initial constraints based on terminal size
    this.pipelineOwner.setConstraints(
      BoxConstraints.tight(this._renderViewSize),
    );

    // Wire the root render object to the pipeline owner
    this.updateRootRenderObject();

    // Wire root render object to MouseManager for autonomous hit-testing
    // Amp ref: J3.runApp calls this.mouseManager.setRootRenderObject(...)
    if (this.mouseManager) {
      const rootRO = this.pipelineOwner.rootNode;
      if (rootRO) {
        this.mouseManager.setRootRenderObject(rootRO);
      }
    }

    this._isRunning = true;
  }

  /**
   * Hot reload entry point. Replaces the root widget and walks the
   * entire element tree, calling reassemble() on every element.
   *
   * This preserves all State objects while ensuring every element
   * re-evaluates its build() method with potentially new code.
   *
   * The newWidget should be the same widget you would pass to
   * attachRootWidget() -- i.e., already wrapped in MediaQuery if
   * the app was started via runApp(). The HotReloadWatcher or
   * caller is responsible for matching the wrapping.
   *
   * Flow:
   *   1. Create new _RootWidget wrapping the new user widget
   *   2. Call rootElement.update(newRootWidget) to swap widget refs
   *   3. Call rootElement.reassemble() to recursively mark dirty
   *   4. Schedule a frame to process the rebuild
   *
   * The reconciliation algorithm in Element.update() / updateChildren()
   * will match existing elements by constructor + key, preserving State
   * objects for StatefulWidgets that haven't changed their type/key.
   */
  reassemble(newWidget: Widget): void {
    if (!this._rootElement || !this._isRunning) {
      throw new Error('Cannot reassemble: app is not running');
    }

    // Wrap in _RootWidget (matches what attachRootWidget does)
    const newRootWidget = new _RootWidget({ child: newWidget });

    // Update the root element with the new widget tree.
    // Because the constructor (_RootWidget) and key (undefined) match,
    // canUpdate() returns true and the element is reused, not replaced.
    this._rootElement.update(newRootWidget);

    // Walk the entire element tree calling reassemble()
    // This marks every element dirty, ensuring all build() methods
    // re-execute with potentially new code.
    this._rootElement.reassemble();

    // Force a full repaint since code changes may affect layout/paint
    this.requestForcedPaintFrame();
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
      this.pipelineOwner.setRootRenderObject(renderObject as RenderBox);
    }
  }

  /**
   * Update root constraints (used by layout callback).
   * Amp ref: J3 layout callback calls updateRootConstraints
   */
  updateRootConstraints(size: Size): void {
    this.pipelineOwner.updateRootConstraints(size);
  }

  /**
   * DFS walk to find the first render object in the element tree.
   */
  private _findRootRenderObject(element: Element): RenderObject | null {
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
   * Begin frame -- runs first in BUILD phase.
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
      (this._tui.screenBuffer?.requiresFullRefresh ?? false);
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
    this._tui.screenBuffer.resize(width, height);
    this.pipelineOwner.updateRootConstraints(this._renderViewSize);
    this._shouldPaintCurrentFrame = true;
  }

  /**
   * Paint phase -- paints the render tree to the screen buffer.
   * If shouldPaintCurrentFrame is false, this is a frame skip (no-op).
   *
   * Amp ref: J3.paint()
   */
  paint(): void {
    if (!this._shouldPaintCurrentFrame) {
      return;
    }

    this.pipelineOwner.flushPaint();

    const rootRO = this.pipelineOwner.rootNode;
    if (!rootRO) return;

    const screen = this._tui.screenBuffer;
    screen.clear();

    paintRenderTree(rootRO, screen);

    if (debugFlags.debugPrintPaints) {
      pipelineLog('PAINT_TREE', '\n' + dumpPaintTree(rootRO));
    }

    // Draw performance overlay on top if enabled (Phase 21: PERF-03)
    if (this._showFrameStatsOverlay && this._perfOverlay) {
      this._perfOverlay.draw(screen, this.getFrameStats());
    }

    this._didPaintCurrentFrame = true;
  }

  /**
   * Render phase -- diffs the screen buffer and writes ANSI output.
   * Only runs if paint phase actually executed (didPaintCurrentFrame).
   *
   * Amp ref: J3.render() calls this.tui.render() which is flush()
   */
  render(): void {
    if (!this._didPaintCurrentFrame) {
      return;
    }

    const screen = this._tui.screenBuffer;
    const renderer = this._tui.renderer;

    const patches = screen.getDiff();

    // Build cursor state
    const cursor: CursorState = {
      position: screen.getCursor(),
      visible: screen.isCursorVisible(),
      shape: screen.getCursorShape(),
    };

    // Generate ANSI output
    const output = renderer.render(patches, cursor);

    if (debugFlags.debugPrintPaints) {
      pipelineLog('RENDER', 'patches=' + patches.length + ' outputLen=' + output.length);
    }

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
   * Amp ref: WidgetsBinding resize handling -- updates constraints, schedules frame
   */
  handleResize(width: number, height: number): void {
    this._pendingResizeEvent = { width, height };
    this.frameScheduler.requestFrame();
  }

  /**
   * Request a forced paint on the next frame.
   * Amp ref: J3.requestForcedPaintFrame()
   */
  requestForcedPaintFrame(): void {
    this._forcePaintOnNextFrame = true;
    this.frameScheduler.requestFrame();
  }

  // --- Performance overlay (Phase 21: PERF-03) ---

  /**
   * Get the FrameStats instance, lazy-creating if needed.
   * Used by the performance overlay and external consumers.
   */
  getFrameStats(): FrameStats {
    if (!this._frameStats) {
      this._frameStats = new FrameStats();
    }
    return this._frameStats;
  }

  /** Whether the frame stats overlay is currently shown. */
  get showFrameStatsOverlay(): boolean {
    return this._showFrameStatsOverlay;
  }

  /**
   * Toggle the performance overlay on/off.
   * When enabled, PerformanceOverlay.draw() is called after each frame render.
   * Requests a forced paint frame to ensure immediate visual update.
   *
   * Amp ref: J3.toggleFrameStatsOverlay()
   */
  toggleFrameStatsOverlay(): void {
    this._showFrameStatsOverlay = !this._showFrameStatsOverlay;
    if (this._showFrameStatsOverlay && !this._perfOverlay) {
      this._perfOverlay = new PerformanceOverlay();
    }
    this.requestForcedPaintFrame();
  }

  // --- Synchronous frame execution (test helper) ---

  /**
   * Synchronous version for testing.
   * Runs the SAME pipeline as the FrameScheduler callbacks -- must stay in sync.
   * Also runs beginFrame + processResizeIfPending for full pipeline.
   */
  drawFrameSync(): void {
    // BEGIN FRAME
    this.beginFrame();

    // PROCESS RESIZE
    this.processResizeIfPending();

    // BUILD phase
    this.buildOwner.buildScopes();
    this.buildOwner.finalizeTree(); // Permanently unmount deactivated elements
    this.updateRootRenderObject();

    // LAYOUT phase
    this.updateRootConstraints(this._renderViewSize);
    this.pipelineOwner.flushLayout();

    // PAINT phase
    this.paint();

    // RENDER phase
    this.render();

    // POST-FRAME: Re-evaluate hover state after layout changes
    // Must match FrameScheduler callbacks to ensure test pipeline === production pipeline
    if (this.mouseManager) {
      this.mouseManager.reestablishHoverState();
    }
  }

  // --- waitForExit / stop / cleanup pattern (Amp ref: J3.stop, J3.cleanup) ---

  /**
   * Wait for the application to exit.
   * Returns a promise that resolves when stop() is called.
   * Amp ref: J3 exit promise pattern
   */
  waitForExit(): Promise<void> {
    if (!this._exitPromise) {
      this._exitPromise = new Promise<void>((resolve) => {
        this._exitResolve = resolve;
      });
    }
    return this._exitPromise;
  }

  /**
   * Stop the binding.
   * Amp ref: J3.stop() -- sets isRunning = false, resolves exit promise
   */
  stop(): void {
    this._isRunning = false;
    if (this._exitResolve) {
      this._exitResolve();
      this._exitResolve = null;
    }
    if (this._rootElement) {
      this._rootElement.unmount();
      this._rootElement = null;
    }
    this.buildOwner.dispose();
    this.pipelineOwner.dispose();
  }

  /**
   * Suspend the TUI: pause frame scheduling, tear down terminal modes,
   * and pause input parsing. Used before spawning an external process
   * that needs direct terminal access (e.g., $EDITOR).
   *
   * Amp ref: J3 suspend pattern -- suspends tui, pauses scheduler
   */
  suspend(): void {
    if (!this._isRunning || this._tui.isSuspended) return;

    // 1. Pause the frame scheduler to prevent any frames from firing
    //    while the terminal is handed off to the child process.
    this.frameScheduler.pause();

    // 2. Suspend the terminal: exit alt screen, disable raw mode, etc.
    //    TerminalManager.suspend() handles the escape sequence teardown.
    this._tui.suspend();

    // 3. Pause the input parser so stdin bytes go to the child process,
    //    not to our InputParser -> EventDispatcher pipeline.
    if (this._inputParser) {
      this._inputParser.pause();
    }
  }

  /**
   * Resume the TUI after an external process exits. Re-enters alt screen,
   * enables raw mode, reattaches input, resumes frame scheduling, and
   * forces a full repaint.
   *
   * Amp ref: J3 resume pattern -- resumes tui, restarts scheduler
   */
  resume(): void {
    if (!this._isRunning || !this._tui.isSuspended) return;

    // 1. Resume the terminal: raw mode, alt screen, mouse, etc.
    this._tui.resume();

    // 2. Resume input parsing.
    if (this._inputParser) {
      this._inputParser.resume();
    }

    // 3. Force a complete repaint since the screen was clobbered by the editor.
    this.requestForcedPaintFrame();

    // 4. Resume the frame scheduler so frames start flowing again.
    this.frameScheduler.resume();
  }

  /**
   * Full cleanup -- unmount, dispose, remove callbacks, deinit terminal.
   * Amp ref: J3.cleanup()
   */
  async cleanup(): Promise<void> {
    this._isRunning = false;

    if (this._rootElement) {
      this._rootElement.unmount();
      this._rootElement = null;
    }

    this.buildOwner.dispose();
    this.pipelineOwner.dispose();

    if (this.focusManager) {
      FocusManager.reset();
    }
    if (this.mouseManager) {
      this.mouseManager.dispose();
    }

    // Dispose input parser if it was created
    // Amp ref: J3.cleanup disposes parser
    if (this._inputParser) {
      this._inputParser.dispose();
      this._inputParser = null;
    }

    // Remove 6 frame callbacks
    // Amp ref: J3.cleanup removes all named callbacks
    for (const name of ['frame-start', 'resize', 'build', 'layout', 'paint-phase', 'render-phase']) {
      this.frameScheduler.removeFrameCallback(name);
    }

    // Dispose terminal
    if (this._tui.isInitialized) {
      this._tui.dispose();
    }
  }

  /**
   * Set a callback to be called when the root element is mounted.
   * Amp ref: J3.setRootElementMountedCallback
   */
  setRootElementMountedCallback(callback: () => void): void {
    this._rootElementMountedCallback = callback;
  }

  // --- setupEventHandlers (Amp ref: J3.setupEventHandlers -- input-system.md:601-634) ---

  /**
   * Wire TerminalManager's onInput to InputParser -> EventDispatcher -> FocusManager.
   * Also registers the Ctrl+C safety interceptor and wires mouse events to MouseManager.
   *
   * Amp ref: J3.setupEventHandlers() -- input-system.md:601-634
   * Flow: stdin (raw bytes) -> InputParser -> EventDispatcher.dispatch(event) -> FocusManager
   */
  private setupEventHandlers(): void {
    const dispatcher = EventDispatcher.instance;

    // Create InputParser that dispatches directly to EventDispatcher
    // Amp ref: wB0 owns parser, J3.setupEventHandlers connects to FocusManager
    this._inputParser = new InputParser((event) => {
      dispatcher.dispatch(event);
    });

    // Wire TerminalManager's onInput callback to feed the parser
    // Amp ref: J3.setupEventHandlers wires wB0's event handlers
    this._tui.onInput = (data: Buffer) => {
      this._inputParser!.feed(data);
    };

    // Register default Ctrl+C interceptor as safety net.
    // In raw mode, SIGINT is not generated -- Ctrl+C arrives as byte 0x03
    // which InputParser emits as key='c', ctrlKey=true.
    // Apps can handle Ctrl+C themselves (and return 'handled' to suppress this).
    // Amp ref: J3.setupEventHandlers registers Ctrl+C interceptor
    dispatcher.addKeyInterceptor((event: KeyEvent) => {
      if (event.key === 'c' && event.ctrlKey) {
        process.exit(0);
      }
      return 'ignored';
    });

    // Wire mouse events to MouseManager through EventDispatcher
    // Amp ref: J3.setupEventHandlers wires mouse to MouseManager.updatePosition
    if (this.mouseManager) {
      dispatcher.addMouseHandler((event) => {
        this.mouseManager!.updatePosition(event.x, event.y);

        // Dispatch action-based events (scroll, press, release) to hit-tested regions
        if (event.action === 'scroll' || event.action === 'press' || event.action === 'release') {
          this.mouseManager!.dispatchMouseAction(event.action, event.x, event.y, event.button);
        }
      });
    }
  }

  // --- createMediaQueryWrapper (Amp ref: J3.createMediaQueryWrapper -- widget-tree.md:1277-1282) ---

  /**
   * Create the MediaQuery wrapper widget with real terminal size and capabilities.
   *
   * Amp ref: J3.createMediaQueryWrapper(g) -- widget-tree.md:1277-1282
   *   let t = this.tui.getCapabilities() || xF();
   *   let b = this.tui.getSize();
   *   let s = new nA(b, t);
   *   return new Q3({ data: s, child: g });
   */
  private createMediaQueryWrapper(widget: Widget, cols?: number, rows?: number): MediaQuery {
    const caps = this._tui.capabilities;
    const size = (cols !== undefined && rows !== undefined)
      ? { width: cols, height: rows }
      : this._tui.getSize();

    return new MediaQuery({
      data: MediaQueryData.fromTerminal(size.width, size.height, caps),
      child: widget,
    });
  }

  // --- runApp instance method (Amp ref: J3.runApp -- widget-tree.md:1189-1236) ---

  /**
   * Run the application: init terminal, wrap in MediaQuery, mount root, schedule first frame.
   *
   * Amp ref: J3.runApp(g) -- widget-tree.md:1189-1236
   * Handles terminal init, MediaQuery wrapping, input wiring, and first frame scheduling.
   * In test mode, skips terminal init and uses 80x24 defaults.
   *
   * Gap R10: Restructured to initialize TerminalManager BEFORE creating MediaQuery,
   * so that real detected capabilities are available. Amp ref: J3.runApp() calls
   * this.tui.init() first, then waitForCapabilities, THEN createMediaQueryWrapper.
   */
  async runApp(widget: Widget, options?: RunAppOptions): Promise<void> {
    const inTest = isTestEnvironment();
    const enableTerminal = options?.terminal ?? !inTest;

    // Set callbacks if provided
    if (options?.onRootElementMounted) {
      this.setRootElementMountedCallback(options.onRootElementMounted);
    }

    // Set output BEFORE the first frame so the render phase can write
    if (options?.output) {
      this.setOutput(options.output);
    }

    if (options?.errorLogger) {
      this.frameScheduler.setErrorLogger(options.errorLogger);
    }

    let cols = 80;
    let rows = 24;
    let platform: PlatformAdapter | null = null;

    if (options?.size) {
      cols = options.size.columns;
      rows = options.size.rows;
    } else {
      try {
        platform = new BunPlatform();
        const size = platform.getTerminalSize();
        cols = size.columns;
        rows = size.rows;
      } catch (_e) {
        // BunPlatform not available, use defaults
      }
    }

    this._renderViewSize = new Size(cols, rows);

    // --- Phase 1: Terminal initialization (BEFORE MediaQuery) ---
    // Amp ref: J3.runApp() calls this.tui.init() first, then waits for
    // capabilities, THEN creates MediaQuery wrapper.
    if (enableTerminal && platform) {
      // Replace MockPlatform tui with real BunPlatform-backed TerminalManager
      // Amp ref: J3.runApp creates wB0 with real platform
      this._tui = new TerminalManager(platform);

      // Initialize terminal: raw mode, alt screen, hide cursor, mouse, bracketed paste
      // Also registers input and resize handlers on the platform.
      // Amp ref: wB0.init()
      this._tui.initialize();

      // Wire input pipeline: onInput -> InputParser -> EventDispatcher -> FocusManager
      // Amp ref: J3.setupEventHandlers() -- input-system.md:601-634
      this.setupEventHandlers();
    }

    // --- Phase 2: Create MediaQuery with REAL capabilities ---
    // Amp ref: J3.createMediaQueryWrapper(g) reads this.tui.getCapabilities()
    const wrappedWidget = this.createMediaQueryWrapper(widget, cols, rows);

    // --- Phase 3: Mount widget tree ---
    this.attachRootWidget(wrappedWidget);

    // --- Phase 4: Terminal event wiring and cleanup handlers ---
    if (enableTerminal && platform) {
      // Wire capability change handler to update MediaQuery
      // Amp ref: wB0.capabilityHandlers[] -- late-arriving capability data triggers MediaQuery rebuild
      this._tui.onCapabilitiesChanged = (_caps) => {
        const newWrapped = this.createMediaQueryWrapper(widget, this._renderViewSize.width, this._renderViewSize.height);
        this.attachRootWidget(newWrapped);
        this.requestForcedPaintFrame();
      };

      // Clean exit handler -- restore terminal state via TerminalManager.dispose()
      // Amp ref: J3 cleanup uses this.tui.deinit()
      const cleanup = () => {
        try {
          if (this._tui.isInitialized) {
            this._tui.dispose();
          }
        } catch (_e) {
          // Best-effort cleanup
        }
      };

      process.on('exit', cleanup);
      process.on('SIGINT', () => {
        cleanup();
        process.exit(0);
      });
      process.on('SIGTERM', () => {
        cleanup();
        process.exit(0);
      });
    }

    // --- Phase 5: SIGWINCH handler (with capabilities preservation) ---
    // Register SIGWINCH handler for terminal resize
    if (enableTerminal && typeof process !== 'undefined') {
      process.on('SIGWINCH', () => {
        try {
          // Use TerminalManager's platform for size query
          // Amp ref: J3 SIGWINCH handler
          const p = this._tui.platform;
          if (p) {
            const size = p.getTerminalSize();
            this.handleResize(size.columns, size.rows);
            // Use createMediaQueryWrapper to preserve real capabilities
            // Gap R10: Previously used MediaQueryData.fromTerminal() without caps
            const newWrapped = this.createMediaQueryWrapper(widget, size.columns, size.rows);
            this.attachRootWidget(newWrapped);
          }
        } catch (_e) {
          // Ignore resize errors
        }
      });
    }

    // Force paint on first frame to ensure content is rendered
    this.requestForcedPaintFrame();
    this.frameScheduler.requestFrame();
  }

}

// ---------------------------------------------------------------------------
// runApp (Amp: cz8) -- thin wrapper
//
// Amp ref: async function cz8(g, t) { let b = J3.instance; await b.runApp(g); }
// Phase 24-02: Moved all terminal init logic into WidgetsBinding.runApp().
// ---------------------------------------------------------------------------

/**
 * Options for runApp.
 */
export interface RunAppOptions {
  output?: OutputWriter;

  terminal?: boolean;

  size?: { columns: number; rows: number };

  onRootElementMounted?: () => void;

  errorLogger?: (msg: string, ...args: unknown[]) => void;
}

/**
 * Standalone runApp -- thin wrapper matching Amp's cz8 pattern.
 * Gets the WidgetsBinding singleton and delegates to its runApp() method.
 *
 * Amp ref: async function cz8(g, t) { let b = J3.instance; await b.runApp(g); }
 */
export async function runApp(widget: Widget, options?: RunAppOptions): Promise<WidgetsBinding> {
  const binding = WidgetsBinding.instance;
  await binding.runApp(widget, options);
  return binding;
}
