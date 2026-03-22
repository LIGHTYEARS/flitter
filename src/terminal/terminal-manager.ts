// TerminalManager — Terminal I/O coordinator.
// Owns ScreenBuffer + Renderer, manages terminal lifecycle (raw mode, alt screen, mouse, etc.).
// Amp ref: amp-strings.txt:529716 — class wB0 TerminalManager
// Amp ref: .reference/screen-buffer.md section 6 (render pipeline), section 13 (TerminalManager)

import { ScreenBuffer } from './screen-buffer.js';
import { Renderer } from './renderer.js';
import { type PlatformAdapter, type TerminalCapabilities, detectCapabilities } from './platform.js';
import { terminalCleanup } from './terminal-cleanup.js';

/**
 * Render statistics from the last flush cycle.
 * Amp ref: wB0.lastRenderDiffStats
 */
export interface RenderStats {
  repaintedCellCount: number;
  totalCellCount: number;
  repaintedPercent: number;
  bytesWritten: number;
}

/**
 * Terminal I/O coordinator.
 * Owns ScreenBuffer + Renderer + PlatformAdapter.
 * Manages terminal lifecycle: raw mode, alt screen, mouse, cursor, bracketed paste.
 *
 * Amp ref: class wB0 — singleton owned by WidgetsBinding.
 */
export class TerminalManager {
  readonly screenBuffer: ScreenBuffer;
  readonly renderer: Renderer;
  readonly platform: PlatformAdapter;
  private _capabilities: TerminalCapabilities;
  private _isInitialized: boolean = false;
  private _suspended: boolean = false;

  private lastRenderStats: RenderStats = {
    repaintedCellCount: 0,
    totalCellCount: 1920,
    repaintedPercent: 0,
    bytesWritten: 0,
  };

  // --- MINR-01: JetBrains terminal wheel filter ---
  // Amp ref: wB0 — JetBrains IDEs send rapid repeated scroll events;
  // debounce them to prevent jitter.
  jetBrainsWheelFilter: boolean;
  private _lastWheelTimestamp: number = 0;
  private static readonly WHEEL_DEBOUNCE_MS = 50;

  // --- MINR-05: Configurable scroll step ---
  // Amp ref: wB0.scrollStep — lines per scroll wheel event
  private _scrollStep: number = 3;

  // Event callbacks
  onInput?: (data: Buffer) => void;
  onResize?: (width: number, height: number) => void;

  // Bound handlers for cleanup
  private boundInputHandler: ((data: Buffer) => void) | null = null;
  private boundResizeHandler: ((cols: number, rows: number) => void) | null = null;

  constructor(platform: PlatformAdapter) {
    this.platform = platform;
    const size = platform.getTerminalSize();
    this.screenBuffer = new ScreenBuffer(size.columns, size.rows);
    this.renderer = new Renderer();
    this._capabilities = detectCapabilities();
    this.renderer.setCapabilities(this._capabilities);

    // MINR-01: Auto-detect JetBrains terminal
    this.jetBrainsWheelFilter = TerminalManager._detectJetBrains();
  }

  /**
   * Whether the terminal manager has been initialized.
   */
  get isInitialized(): boolean {
    return this._isInitialized;
  }

  /**
   * Whether the terminal is currently suspended (e.g., for external editor).
   */
  get isSuspended(): boolean {
    return this._suspended;
  }

  /**
   * Get detected terminal capabilities.
   */
  get capabilities(): TerminalCapabilities {
    return this._capabilities;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // Amp ref: wB0.init() — sets up parser, registers event handlers, enters alt screen
  // ---------------------------------------------------------------------------

  /**
   * Initialize the terminal: enable raw mode, alt screen, hide cursor, mouse on,
   * bracketed paste on. Registers input and resize handlers.
   *
   * Amp ref: wB0.init()
   */
  initialize(): void {
    if (this._isInitialized) return;

    // Enable raw mode
    this.platform.enableRawMode();

    // Build initialization sequence
    // Amp ref: wB0.init() — enters alt screen, hides cursor, enables mouse + bracketed paste
    const initSequence =
      this.renderer.enterAltScreen() +
      this.renderer.hideCursor() +
      this.renderer.enableMouse() +
      this.renderer.enableBracketedPaste();

    this.platform.writeStdout(initSequence);

    // Register input handler
    this.boundInputHandler = (data: Buffer) => {
      this.onInput?.(data);
    };
    this.platform.onStdinData(this.boundInputHandler);

    // Register resize handler
    this.boundResizeHandler = (cols: number, rows: number) => {
      this.handleResize(cols, rows);
    };
    this.platform.onResize(this.boundResizeHandler);

    this._isInitialized = true;
  }

  /**
   * Dispose the terminal: restore cursor, disable mouse, exit alt screen,
   * disable raw mode. Unregisters all handlers.
   *
   * Amp ref: wB0.deinit() / zG8 terminal cleanup function
   */
  dispose(): void {
    if (!this._isInitialized) return;

    // Build dispose sequence using comprehensive cleanup
    // Amp ref: zG8 cleanup — disables all modes, restores cursor, exits alt screen
    const disposeSequence = terminalCleanup(this.renderer);

    this.platform.writeStdout(disposeSequence);

    // Unregister handlers
    if (this.boundInputHandler) {
      this.platform.removeStdinData(this.boundInputHandler);
      this.boundInputHandler = null;
    }
    if (this.boundResizeHandler) {
      this.platform.removeResize(this.boundResizeHandler);
      this.boundResizeHandler = null;
    }

    // Disable raw mode
    this.platform.disableRawMode();

    this._isInitialized = false;
  }

  // ---------------------------------------------------------------------------
  // Render cycle
  // Amp ref: wB0.render() — section 6 of screen-buffer.md
  // ---------------------------------------------------------------------------

  /**
   * Execute a full render cycle: getDiff -> render -> writeStdout -> present.
   *
   * Amp ref: wB0.render()
   *   1. screen.getDiff()
   *   2. Build cursor state
   *   3. renderer.render(diff, cursor) — wraps in BSU/ESU, handles SGR, cursor
   *   4. write to stdout
   *   5. screen.present()
   */
  flush(): void {
    if (!this._isInitialized) {
      throw new Error('TerminalManager not initialized');
    }
    if (this._suspended) return;

    // 1. Diff
    const diff = this.screenBuffer.getDiff();
    const size = this.screenBuffer.getSize();
    const totalCells = size.width * size.height;

    // Count changed cells from RowPatch[]
    let changedCells = 0;
    for (const rowPatch of diff) {
      for (const cellPatch of rowPatch.patches) {
        changedCells += cellPatch.cells.length;
      }
    }

    const repaintPercent = totalCells > 0 ? (changedCells / totalCells) * 100 : 0;

    this.lastRenderStats = {
      repaintedCellCount: changedCells,
      totalCellCount: totalCells,
      repaintedPercent: repaintPercent,
      bytesWritten: 0,
    };

    const cursorPos = this.screenBuffer.getCursor();

    if (diff.length > 0 || cursorPos !== null) {
      // 2. Build cursor state for renderer
      const cursorState = {
        position: cursorPos,
        visible: this.screenBuffer.isCursorVisible(),
        shape: this.screenBuffer.getCursorShape(),
      };

      // 3. Render: the renderer handles BSU/ESU, hide cursor, SGR deltas,
      //    cursor positioning, and SGR reset
      const output = this.renderer.render(diff, cursorState);

      // 4. Write to stdout
      this.lastRenderStats.bytesWritten = output.length;
      this.platform.writeStdout(output);

      // 5. Swap buffers
      this.screenBuffer.present();
    }
  }

  // ---------------------------------------------------------------------------
  // Resize handling
  // Amp ref: SIGWINCH -> resize ScreenBuffer, mark for refresh
  // ---------------------------------------------------------------------------

  /**
   * Handle terminal resize. Updates ScreenBuffer dimensions and marks for full refresh.
   */
  private handleResize(cols: number, rows: number): void {
    this.screenBuffer.resize(cols, rows);
    this.onResize?.(cols, rows);
  }

  // ---------------------------------------------------------------------------
  // Size
  // ---------------------------------------------------------------------------

  /**
   * Get current terminal size.
   * Amp ref: wB0.getSize()
   */
  getSize(): { width: number; height: number } {
    return this.screenBuffer.getSize();
  }

  // ---------------------------------------------------------------------------
  // Render stats
  // ---------------------------------------------------------------------------

  /**
   * Get stats from the last render cycle.
   * Amp ref: wB0.getLastRenderDiffStats()
   */
  getLastRenderStats(): RenderStats {
    return { ...this.lastRenderStats };
  }

  // ---------------------------------------------------------------------------
  // Suspend / Resume
  // Amp ref: wB0.suspend() / resume() for external editor integration
  // ---------------------------------------------------------------------------

  /**
   * Suspend the terminal (exit alt screen, disable raw mode).
   * Used when spawning an external editor.
   */
  suspend(): void {
    if (!this._isInitialized || this._suspended) return;

    const suspendSequence =
      this.renderer.disableMouse() +
      this.renderer.disableBracketedPaste() +
      this.renderer.showCursor() +
      this.renderer.exitAltScreen();

    this.platform.writeStdout(suspendSequence);
    this.platform.disableRawMode();
    this._suspended = true;
  }

  /**
   * Resume the terminal (re-enter alt screen, enable raw mode).
   * Called after external editor returns.
   */
  resume(): void {
    if (!this._isInitialized || !this._suspended) return;

    this.platform.enableRawMode();

    const resumeSequence =
      this.renderer.enterAltScreen() +
      this.renderer.hideCursor() +
      this.renderer.enableMouse() +
      this.renderer.enableBracketedPaste();

    this.platform.writeStdout(resumeSequence);
    this.screenBuffer.markForRefresh();
    this._suspended = false;
  }

  // ---------------------------------------------------------------------------
  // MINR-01: JetBrains terminal wheel filter
  // Amp ref: wB0 — JetBrains IDEs send rapid repeated scroll events
  // ---------------------------------------------------------------------------

  /**
   * Detect whether we're running inside a JetBrains terminal.
   * Checks TERMINAL_EMULATOR and TERM_PROGRAM environment variables.
   */
  private static _detectJetBrains(): boolean {
    const env = typeof process !== 'undefined' ? process.env : {};
    if (env.TERMINAL_EMULATOR?.includes('JetBrains')) return true;
    if (env.TERM_PROGRAM === 'JetBrains-JediTerm') return true;
    return false;
  }

  /**
   * Filter a wheel event. Returns true if the event should be processed,
   * false if it should be discarded (filtered out).
   *
   * When jetBrainsWheelFilter is enabled, rapid successive scroll events
   * (within 50ms of each other) are debounced: only the first event in
   * a burst is kept.
   *
   * @param _buttonCode The mouse button code for the scroll event (unused in current impl)
   * @returns true if the event should be processed, false if filtered
   */
  filterWheelEvent(_buttonCode: number): boolean {
    if (!this.jetBrainsWheelFilter) {
      return true; // filter disabled, pass all events
    }

    const now = Date.now();
    const elapsed = now - this._lastWheelTimestamp;

    if (elapsed < TerminalManager.WHEEL_DEBOUNCE_MS) {
      return false; // too rapid, filter out
    }

    this._lastWheelTimestamp = now;
    return true; // first event in burst, allow
  }

  // ---------------------------------------------------------------------------
  // MINR-05: Configurable scroll step
  // Amp ref: wB0.scrollStep — lines per scroll wheel event
  // ---------------------------------------------------------------------------

  /**
   * Get the number of lines to scroll per wheel event.
   * Default: 3 lines.
   */
  get scrollStep(): number {
    return this._scrollStep;
  }

  /**
   * Set the number of lines to scroll per wheel event.
   * Clamped to the range [1, 20].
   *
   * @param lines Number of lines per scroll step
   */
  setScrollStep(lines: number): void {
    this._scrollStep = Math.max(1, Math.min(20, Math.round(lines)));
  }
}
