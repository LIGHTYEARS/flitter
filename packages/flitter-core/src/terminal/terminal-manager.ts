// TerminalManager — Terminal I/O coordinator.
// Owns ScreenBuffer + Renderer, manages terminal lifecycle (raw mode, alt screen, mouse, etc.).
// Amp ref: amp-strings.txt:529716 — class wB0 TerminalManager
// Amp ref: .reference/screen-buffer.md section 6 (render pipeline), section 13 (TerminalManager)

import { ScreenBuffer } from './screen-buffer.js';
import { Renderer } from './renderer.js';
import { type PlatformAdapter, type TerminalCapabilities, type ParsedCapabilities, detectCapabilities, mergeCapabilities } from './platform.js';
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
  jetBrainsWheelFilter: boolean;
  private _lastWheelTimestamp: number = 0;
  private static readonly WHEEL_DEBOUNCE_MS = 50;

  // --- MINR-05: Configurable scroll step ---
  private _scrollStep: number = 3;

  // Event callbacks
  onInput?: (data: Buffer) => void;
  onResize?: (width: number, height: number) => void;

  // Capability update callback
  onCapabilitiesChanged?: (caps: TerminalCapabilities) => void;

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
    this.jetBrainsWheelFilter = TerminalManager._detectJetBrains();
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  get isSuspended(): boolean {
    return this._suspended;
  }

  get capabilities(): TerminalCapabilities {
    return this._capabilities;
  }

  /**
   * Update capabilities after async detection completes.
   * Notifies the callback so WidgetsBinding can update MediaQuery.
   */
  updateCapabilities(newCaps: TerminalCapabilities): void {
    this._capabilities = newCaps;
    this.renderer.setCapabilities(newCaps);
    this.onCapabilitiesChanged?.(newCaps);
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Initialize the terminal: enable raw mode, alt screen, hide cursor, mouse on,
   * bracketed paste on, in-band resize on. Registers input and resize handlers.
   *
   * Amp ref: wB0.init()
   */
  initialize(): void {
    if (this._isInitialized) return;

    this.platform.enableRawMode();

    // GAP-SUM-056: enable in-band resize (mode 2048) alongside other modes
    const initSequence =
      this.renderer.enterAltScreen() +
      this.renderer.hideCursor() +
      this.renderer.enableMouse() +
      this.renderer.enableBracketedPaste() +
      this.renderer.enableInBandResize() +
      this.renderer.enableEmojiWidth() +
      this.renderer.enableKittyKeyboard();

    this.platform.writeStdout(initSequence);

    this.boundInputHandler = (data: Buffer) => {
      this.onInput?.(data);
    };
    this.platform.onStdinData(this.boundInputHandler);

    this.boundResizeHandler = (cols: number, rows: number) => {
      this.handleResize(cols, rows);
    };
    this.platform.onResize(this.boundResizeHandler);

    this._isInitialized = true;
  }

  /**
   * Dispose the terminal: restore cursor, disable mouse, exit alt screen,
   * disable raw mode. Unregisters all handlers.
   */
  dispose(): void {
    if (!this._isInitialized) return;

    const disposeSequence = terminalCleanup(this.renderer);
    this.platform.writeStdout(disposeSequence);

    if (this.boundInputHandler) {
      this.platform.removeStdinData(this.boundInputHandler);
      this.boundInputHandler = null;
    }
    if (this.boundResizeHandler) {
      this.platform.removeResize(this.boundResizeHandler);
      this.boundResizeHandler = null;
    }

    this.platform.disableRawMode();
    this._isInitialized = false;
  }

  // ---------------------------------------------------------------------------
  // Render cycle
  // ---------------------------------------------------------------------------

  /**
   * Execute a full render cycle: getDiff -> render -> writeStdout -> present.
   */
  flush(): void {
    if (!this._isInitialized) {
      throw new Error('TerminalManager not initialized');
    }
    if (this._suspended) return;

    const diff = this.screenBuffer.getDiff();
    const size = this.screenBuffer.getSize();
    const totalCells = size.width * size.height;

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
      const cursorState = {
        position: cursorPos,
        visible: this.screenBuffer.isCursorVisible(),
        shape: this.screenBuffer.getCursorShape(),
      };

      const output = this.renderer.render(diff, cursorState);
      this.lastRenderStats.bytesWritten = output.length;
      this.platform.writeStdout(output);
      this.screenBuffer.present();
    }
  }

  // ---------------------------------------------------------------------------
  // Resize handling
  // ---------------------------------------------------------------------------

  /**
   * Handle terminal resize. Updates ScreenBuffer dimensions and marks for full refresh.
   * Called both from SIGWINCH (via platform) and from in-band resize events (mode 2048).
   */
  handleResize(cols: number, rows: number): void {
    this.screenBuffer.resize(cols, rows);
    this.onResize?.(cols, rows);
  }

  // ---------------------------------------------------------------------------
  // Size
  // ---------------------------------------------------------------------------

  getSize(): { width: number; height: number } {
    return this.screenBuffer.getSize();
  }

  // ---------------------------------------------------------------------------
  // Render stats
  // ---------------------------------------------------------------------------

  getLastRenderStats(): RenderStats {
    return { ...this.lastRenderStats };
  }

  // ---------------------------------------------------------------------------
  // Suspend / Resume
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
      this.renderer.disableInBandResize() +
      this.renderer.disableEmojiWidth() +
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
      this.renderer.enableBracketedPaste() +
      this.renderer.enableInBandResize() +
      this.renderer.enableEmojiWidth() +
      this.renderer.enableKittyKeyboard();

    this.platform.writeStdout(resumeSequence);
    this.screenBuffer.markForRefresh();
    this._suspended = false;
  }

  // ---------------------------------------------------------------------------
  // MINR-01: JetBrains terminal wheel filter
  // ---------------------------------------------------------------------------

  private static _detectJetBrains(): boolean {
    const env = typeof process !== 'undefined' ? process.env : {};
    if (env.TERMINAL_EMULATOR?.includes('JetBrains')) return true;
    if (env.TERM_PROGRAM === 'JetBrains-JediTerm') return true;
    return false;
  }

  /**
   * Filter a wheel event. Returns true if the event should be processed,
   * false if it should be discarded (filtered out).
   */
  filterWheelEvent(_buttonCode: number): boolean {
    if (!this.jetBrainsWheelFilter) {
      return true;
    }

    const now = Date.now();
    const elapsed = now - this._lastWheelTimestamp;

    if (elapsed < TerminalManager.WHEEL_DEBOUNCE_MS) {
      return false;
    }

    this._lastWheelTimestamp = now;
    return true;
  }

  // ---------------------------------------------------------------------------
  // MINR-05: Configurable scroll step
  // ---------------------------------------------------------------------------

  get scrollStep(): number {
    return this._scrollStep;
  }

  setScrollStep(lines: number): void {
    this._scrollStep = Math.max(1, Math.min(20, Math.round(lines)));
  }

  // ---------------------------------------------------------------------------
  // OSC 52 Clipboard
  // ---------------------------------------------------------------------------

  /**
   * Copy text to the system clipboard via OSC 52.
   * Writes the escape sequence directly to stdout.
   */
  copyToClipboard(text: string): void {
    if (!this._isInitialized || this._suspended) return;
    this.platform.writeStdout(this.renderer.copyToClipboard(text));
  }

  // ---------------------------------------------------------------------------
  // Terminal capability auto-detection from response events
  // ---------------------------------------------------------------------------

  applyParsedCapabilities(parsed: ParsedCapabilities): void {
    const merged = mergeCapabilities(this._capabilities, parsed);
    this.updateCapabilities(merged);
  }

  // ---------------------------------------------------------------------------
  // OSC 9;4 Progress Bar (ConEmu/Windows Terminal/iTerm2)
  // ---------------------------------------------------------------------------

  setProgress(percent: number): void {
    if (!this._isInitialized || this._suspended) return;
    this.platform.writeStdout(this.renderer.setProgressBar(percent));
  }

  clearProgress(): void {
    if (!this._isInitialized || this._suspended) return;
    this.platform.writeStdout(this.renderer.setProgressBarOff());
  }
}
