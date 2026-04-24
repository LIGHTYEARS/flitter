/**
 * TuiController — 终端控制器。
 *
 * 逆向: XXT in clipboard-and-input.js:511-620
 *
 * 管理终端 raw mode、alt screen、/dev/tty 输入读取、鼠标/键盘/粘贴事件分发、
 * 终端能力检测、信号处理 (SIGWINCH, SIGINT, SIGTERM, SIGTSTP)。
 *
 * 使用 TtyInputSource 从 /dev/tty 读取输入（绕过 stdin 重定向），
 * 使用 TtyOutputTarget 写入终端输出（stdout > stderr > /dev/tty 回退）。
 *
 * 为 WidgetsBinding 提供事件源和渲染输出通道。
 *
 * @example
 * ```ts
 * import { TuiController } from "./tui-controller.js";
 *
 * const ctrl = new TuiController();
 * ctrl.onKey((e) => console.log("key:", e.key));
 * ctrl.onResize((size) => console.log("resize:", size));
 * ctrl.init();
 *
 * // 渲染一帧
 * ctrl.render();
 *
 * // 清理
 * await ctrl.deinit();
 * ```
 *
 * @module
 */

import { logger } from "../debug/logger.js";
import {
  ALT_SCREEN_OFF,
  ALT_SCREEN_ON,
  AnsiRenderer,
  type ColorDepth,
  EMOJI_WIDTH_OFF,
  EMOJI_WIDTH_ON,
  FOCUS_OFF,
  FOCUS_ON,
  IN_BAND_RESIZE_OFF,
  IN_BAND_RESIZE_ON,
  KITTY_KEYBOARD_OFF,
  KITTY_KEYBOARD_ON,
  MODIFY_OTHER_KEYS_OFF,
  MODIFY_OTHER_KEYS_ON,
  MODIFY_OTHER_KEYS_ON_MODE2,
  MOUSE_OFF,
  MOUSE_ON,
  PASTE_OFF,
  PASTE_ON,
  PROGRESS_BAR_INDETERMINATE,
  PROGRESS_BAR_OFF,
  PROGRESS_BAR_PAUSED,
  SET_CURSOR_SHAPE,
  SHOW_CURSOR,
  SYNC_END,
  SYNC_START,
} from "../screen/ansi-renderer.js";
import { Screen } from "../screen/screen.js";
import { InputParser } from "../vt/input-parser.js";
import type {
  InbandResizeEvent,
  KeyEvent,
  PasteEvent,
  FocusEvent as TermFocusEvent,
  MouseEvent as TermMouseEvent,
} from "../vt/types.js";
import { QueryParser } from "./query-parser.js";
import type { TtyInputSource, TtyOutputTarget } from "./tty-input.js";
import { createTtyInput, createTtyOutput } from "./tty-input.js";

// ════════════════════════════════════════════════════
//  类型定义
// ════════════════════════════════════════════════════

/**
 * 检查流是否为真实 TTY 流。
 *
 * 逆向: JxT in tui-layout-engine.js:409-411
 *
 * @param stream - 要检查的流对象
 * @returns 如果是 TTY 流返回 true
 */
export function isTtyStream(stream: unknown): boolean {
  return (
    typeof stream === "object" &&
    stream !== null &&
    "isTTY" in stream &&
    // biome-ignore lint/suspicious/noExplicitAny: runtime duck-typing check on unknown stream
    (stream as any).isTTY === true &&
    // biome-ignore lint/suspicious/noExplicitAny: runtime duck-typing check on unknown stream
    typeof (stream as any).setRawMode === "function"
  );
}

/**
 * 终端能力信息。
 *
 * 描述终端仿真器支持的特性集。
 */
export interface TerminalCapabilities {
  /** 是否支持 Emoji 宽度检测 */
  emojiWidth: boolean;
  /** 是否支持同步输出 (DEC Private Mode 2026) */
  syncOutput: boolean;
  /** 是否支持 Kitty 键盘协议 */
  kittyKeyboard: boolean;
  /** 是否支持调色板变更通知 */
  colorPaletteNotifications: boolean;
  /** xtversion 响应字符串，null 表示未检测到 */
  xtversion: string | null;
  /**
   * Kitty graphics protocol support.
   *
   * 逆向: amp modules/2109_unknown_dY.js:16
   *   kittyGraphics: this.detectKittyGraphicsFromEnv()
   *   processKittyGraphics(): sets true unless isTerm2()
   */
  kittyGraphics: boolean;
  /**
   * SGR pixel mouse tracking support (DEC Private Mode 1016).
   *
   * 逆向: amp modules/2109_unknown_dY.js:8
   *   pixelMouse: !1 (set via processDecrqss when ?1016 enabled)
   */
  pixelMouse: boolean;
  /**
   * Terminal pixel dimensions.
   *
   * 逆向: amp modules/2109_unknown_dY.js:9
   *   pixelDimensions: !1 (boolean in amp)
   *   We use a richer type to store the actual dimensions for downstream use.
   *   null = not available, object = pixel width/height detected.
   */
  pixelDimensions: { width: number; height: number } | null;
  /**
   * OSC 52 clipboard support.
   *
   * 逆向: amp modules/2109_unknown_dY.js:15
   *   osc52: !1 (set via processXtversion or processXtgettcap)
   *   Enabled for: ghostty, kitty, wezterm, foot, alacritty, iterm2, tmux
   */
  osc52: boolean;
  /**
   * Terminal background luminance.
   *
   * 逆向: amp modules/2109_unknown_dY.js:17
   *   background: "unknown" — updated via processOsc11 using luma formula:
   *   luma = 0.299*r + 0.587*g + 0.114*b; dark if luma < 128
   *
   * Amp uses "unknown" as initial value; we default to "dark" for safety.
   */
  background: "dark" | "light";
  /**
   * Kitty explicit cell width support.
   *
   * 逆向: amp modules/2109_unknown_dY.js:19
   *   kittyExplicitWidth: !1 (set via processCursorPositionReport when kittyWidthQuerySent)
   */
  kittyExplicitWidth: boolean;
  /**
   * 是否支持光标形状控制 (DECSCUSR).
   *
   * 逆向: amp modules/2109_unknown_dY.js:263-265
   *   detectCursorShapeSupport() { return !this.detectEmacs() && !this.detectJetBrains(); }
   *
   * Disabled for Emacs (INSIDE_EMACS) and JetBrains (TERMINAL_EMULATOR=JetBrains*)
   */
  supportsCursorShape: boolean;
  /**
   * Detected color depth.
   * 逆向: QXR in modules/0080_unknown_QXR.js
   */
  colorDepth: ColorDepth;
  /**
   * Animation support level.
   *
   * 逆向: dY.js:266-272 — detectAnimationSupport()
   *   "disabled": NO_ANIMATION=1 env, Emacs (INSIDE_EMACS), SSH (SSH_CLIENT/SSH_TTY/SSH_CONNECTION)
   *   "slow": JetBrains (TERMINAL_EMULATOR=JetBrains*)
   *   "fast": all other terminals
   *
   * Used by spinners to decide between animated (BrailleSpinner) and
   * static (text dots) rendering.
   */
  animationSupport: "fast" | "slow" | "disabled";
  /**
   * Underline support level.
   *
   * 逆向: dY.js:20 — `underlineSupport: ji() ? "none" : "standard"`
   *   ji() checks TERMINAL_EMULATOR?.includes("JetBrains")
   *
   * "none" = underlines silently dropped in ANSI output (JetBrains terminal)
   * "standard" = normal underline support
   */
  underlineSupport: "none" | "standard";
  /**
   * Scroll step function — returns lines per scroll tick.
   *
   * 逆向: dY.js:21 — `scrollStep: () => this.getScrollStep()`
   *   getScrollStep(): ghostty → 1, JetBrains → 1, else → 3
   *
   * A function (not a value) to match amp's lazy evaluation pattern.
   */
  scrollStep: () => number;
}

/**
 * 终端尺寸。
 */
export interface TerminalSize {
  /** 列数 */
  width: number;
  /** 行数 */
  height: number;
}

/**
 * 能力变化事件。
 */
export interface CapabilityEvent {
  /** 已检测到的终端能力 */
  capabilities: TerminalCapabilities;
}

// ════════════════════════════════════════════════════
//  Color Depth Detection
// ════════════════════════════════════════════════════

/**
 * Detect terminal color depth from environment variables.
 *
 * 逆向: QXR in modules/0080_unknown_QXR.js
 *
 * Detection order (matching amp's priority):
 * 1. COLORTERM=truecolor or COLORTERM=24bit → truecolor
 * 2. TERM=xterm-kitty → truecolor
 * 3. TERM_PROGRAM iTerm.app v3+ → truecolor, Apple_Terminal → 256
 * 4. TERM containing "256color" → 256
 * 5. TERM matching screen/xterm/vt100/rxvt/color/ansi/cygwin/linux → 16
 * 6. COLORTERM present → 16
 * 7. Fallback: 16
 */
export function detectColorDepth(
  env: Record<string, string | undefined> = process.env,
): ColorDepth {
  // 逆向: QXR line 37 — COLORTERM === "truecolor" → level 3
  if (env.COLORTERM === "truecolor" || env.COLORTERM === "24bit") {
    return "truecolor";
  }

  // 逆向: QXR line 38 — TERM === "xterm-kitty" → level 3
  if (env.TERM === "xterm-kitty") {
    return "truecolor";
  }

  // 逆向: QXR line 39-46 — TERM_PROGRAM checks
  if (env.TERM_PROGRAM) {
    const version = Number.parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
    switch (env.TERM_PROGRAM) {
      case "iTerm.app":
        return version >= 3 ? "truecolor" : "256";
      case "Apple_Terminal":
        return "256";
    }
  }

  // 逆向: QXR line 48 — TERM containing 256color → level 2
  if (/-256(color)?$/i.test(env.TERM ?? "")) {
    return "256";
  }

  // 逆向: QXR line 49 — common TERM values → level 1
  if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM ?? "")) {
    return "16";
  }

  // 逆向: QXR line 50 — COLORTERM present (any value) → level 1
  if ("COLORTERM" in env && env.COLORTERM !== undefined) {
    return "16";
  }

  // Fallback: basic 16-color
  return "16";
}

// ════════════════════════════════════════════════════
//  TuiController
// ════════════════════════════════════════════════════

/**
 * TuiController — 终端控制器。
 *
 * 逆向: XXT in clipboard-and-input.js:511-620
 *
 * 管理终端 raw mode、alt screen、/dev/tty 输入读取、鼠标/键盘/粘贴事件分发、
 * 终端能力检测、信号处理 (SIGWINCH, SIGINT, SIGTERM, SIGTSTP)。
 *
 * 使用 TtyInputSource 从 /dev/tty 读取输入，TtyOutputTarget 写入终端输出。
 */
export class TuiController {
  /** Scoped debug logger for terminal size + init tracing */
  private static readonly log = logger.scoped("tui");

  /** 输入解析器 */
  private parser: InputParser | null = null;
  /** 是否已初始化 */
  private initialized = false;
  /** 是否在备用屏幕缓冲区中 */
  private inAltScreen = false;
  /** 双缓冲屏幕 */
  private screen: Screen;
  /** ANSI 差分渲染器 */
  private renderer: AnsiRenderer;
  /** 终端能力信息 */
  private capabilities: TerminalCapabilities | null = null;
  /** 能力检测超时计时器 */
  private capabilityTimeout: ReturnType<typeof setTimeout> | null = null;
  /** 能力检测 resolve 回调 */
  private capabilityResolve: (() => void) | null = null;

  /** QueryParser for terminal capability probing. 逆向: XXT.queryParser in 2112_unknown_XXT.js:9 */
  private _queryParser: QueryParser | null = null;

  /** 缓存的终端尺寸（amp: this.terminalSize） */
  private terminalSize: TerminalSize = { width: 80, height: 24 };
  /** 是否处于暂停状态 逆向: suspended field in tui-layout-engine.js */
  private suspended = false;

  /** /dev/tty 输入源 */
  private ttyInput: TtyInputSource | null = null;
  /** 终端输出目标 */
  private ttyOutput: TtyOutputTarget | null = null;

  /** 键盘事件处理器 */
  private keyHandlers: ((event: KeyEvent) => void)[] = [];
  /** 鼠标事件处理器 */
  private mouseHandlers: ((event: TermMouseEvent) => void)[] = [];
  /** 尺寸变化处理器 */
  private resizeHandlers: ((event: TerminalSize) => void)[] = [];
  /** 粘贴事件处理器 */
  private pasteHandlers: ((event: PasteEvent) => void)[] = [];
  /** 能力检测完成处理器 */
  private capabilityHandlers: ((event: CapabilityEvent) => void)[] = [];

  private focusHandlers: ((event: TermFocusEvent) => void)[] = [];

  /** 绑定的 resize 处理函数引用（用于移除监听器） */
  private boundHandleResize = this.handleResize.bind(this);
  /** 绑定的 cleanup 处理函数引用（用于移除监听器） */
  private boundCleanup = this.cleanup.bind(this);
  /** 绑定的 handleResume 处理函数引用（用于移除监听器） */
  private boundHandleResume = this.handleResume.bind(this);

  constructor() {
    this.screen = new Screen(80, 24);
    this.renderer = new AnsiRenderer();
  }

  // ════════════════════════════════════════════════════
  //  初始化 / 清理
  // ════════════════════════════════════════════════════

  /**
   * 初始化终端控制器。
   *
   * 创建 InputParser，绑定 stdin 数据读取、SIGWINCH 信号处理，
   * 进入 raw mode（如果 stdin 是 TTY），启用鼠标追踪和 bracketed paste。
   *
   * @throws {Error} 如果已经初始化
   *
   * @example
   * ```ts
   * const ctrl = new TuiController();
   * ctrl.init();
   * // ... 使用终端
   * await ctrl.deinit();
   * ```
   */
  init(): void {
    if (this.initialized) throw new Error("TUI is already initialized");
    try {
      // 创建输入解析器并注册事件分发
      this.parser = new InputParser();
      this.parser.onInput((event) => {
        switch (event.type) {
          case "key":
            this.handleKeyEvent(event);
            break;
          case "mouse":
            for (const handler of this.mouseHandlers) handler(event);
            break;
          case "paste":
            for (const handler of this.pasteHandlers) handler(event);
            break;
          case "focus":
            for (const handler of this.focusHandlers) handler(event);
            break;
          case "inband_resize":
            // In-band resize notification from DEC mode ?2048
            // 逆向: amp 2112_unknown_XXT.js:449-470 — handleInbandResize()
            this.handleInbandResize(event);
            break;
          case "cursor_position":
            // Cursor Position Report (CPR) — route to query parser for kitty width detection
            // 逆向: amp 2112_unknown_XXT.js:66-67
            //   parser.onCursorPositionReport(T => queryParser.processCursorPositionReport(T.row, T.col))
            if (this._queryParser && this.initialized) {
              this._queryParser.processCursorPositionReport(event.row, event.col);
            }
            break;
          case "kitty_keyboard_response":
            // Kitty keyboard protocol response — terminal confirms support
            // 逆向: amp csiToKittyKeyboardResponse (2026_tail_anonymous.js:157504-157512)
            //   emits decrqss_response with request="u" → processDecrqss → kittyKeyboard=true
            if (this._queryParser) {
              this._queryParser.processKittyKeyboard();
            }
            break;
          default:
            // resize 等其他事件暂不通过 InputParser 分发
            break;
        }
      });

      // 创建 /dev/tty 输入源（自动路由: /dev/tty 或 stdin 回退）
      this.ttyInput = createTtyInput();
      this.ttyInput.on("data", (data: Buffer) => {
        this.parser?.feed(data);
      });

      // 创建终端输出目标（stdout > stderr > /dev/tty write）
      this.ttyOutput = createTtyOutput();

      // 信号处理
      process.on("SIGWINCH", this.boundHandleResize);
      if (process.stdout.isTTY) {
        process.stdout.on("resize", this.boundHandleResize);
      }

      // 更新尺寸并同步 Screen
      this.updateTerminalSize();
      const size = this.getSize();
      this.screen.resize(size.width, size.height);

      // Detect color depth and configure renderer before first frame
      // 逆向: QXR in modules/0080_unknown_QXR.js — detect terminal color support
      const colorDepth = detectColorDepth();
      this.renderer.setColorDepth(colorDepth);

      // 注册清理 handlers
      this.setupCleanupHandlers();

      this.initialized = true;

      // 启用鼠标追踪和 bracketed paste
      this.enableMouse();
      this.enableBracketedPaste();
      this.enableKittyKeyboard();
      this.enableFocusReporting();
      // Enable in-band resize notification (DEC mode ?2048)
      // 逆向: amp 2112_unknown_XXT.js:431 — enableInBandResize() called unconditionally
      //   in finishInitialization() after capability detection.
      // Amp also enables it unconditionally at init/resume (without capability gate).
      this.enableInBandResize();
    } catch (error) {
      this.deinit();
      throw error;
    }
  }

  /**
   * 清理终端控制器。
   *
   * 退出备用屏幕、禁用鼠标追踪、恢复终端状态、移除所有信号处理器。
   *
   * @example
   * ```ts
   * await ctrl.deinit();
   * ```
   */
  async deinit(): Promise<void> {
    if (this.initialized) {
      // 使用同步的终端恢复方法
      this.restoreTerminalSync();
    }

    // 清除能力检测计时器
    if (this.capabilityTimeout) {
      clearTimeout(this.capabilityTimeout);
      this.capabilityTimeout = null;
    }

    // 清空所有事件处理器
    this.keyHandlers.length = 0;
    this.mouseHandlers.length = 0;
    this.resizeHandlers.length = 0;
    this.pasteHandlers.length = 0;
    this.capabilityHandlers.length = 0;
    this.focusHandlers.length = 0;

    // 移除信号和事件监听器
    process.removeListener("SIGWINCH", this.boundHandleResize);
    process.stdout.removeListener("resize", this.boundHandleResize);
    process.removeListener("SIGINT", this.boundCleanup);
    process.removeListener("SIGTERM", this.boundCleanup);
    process.removeListener("exit", this.boundCleanup);
    process.removeListener("SIGCONT", this.boundHandleResume);

    // 释放 /dev/tty 输入源（handles setRawMode(false) + removeAllListeners + destroy）
    try {
      this.ttyInput?.dispose();
    } catch {
      // 输入流可能已关闭
    }
    this.ttyInput = null;

    // 释放输出目标（关闭 /dev/tty fd，如果是 /dev/tty 输出）
    try {
      this.ttyOutput?.dispose();
    } catch {
      // 输出流可能已关闭
    }
    this.ttyOutput = null;

    this.parser = null;
    this.capabilities = null;
    this._queryParser = null;
    this.initialized = false;
  }

  /**
   * Set the terminal mouse cursor shape via OSC 22.
   *
   * 逆向: chunk-004.js:4208-4211 — setMouseCursor(T) { process.stdout.write(`\x1b]22;${T}\x07`) }
   *
   * Supported cursor values: "default", "pointer", "text", "wait"
   * Terminals that don't understand OSC 22 silently ignore the sequence.
   *
   * @param cursor - Cursor shape name (e.g. "default", "pointer", "text")
   */
  setMouseCursor(cursor: string): void {
    const seq = `\x1b]22;${cursor}\x07`;
    try {
      process.stdout.write(seq);
    } catch {
      // Output stream may be closed
    }
  }

  /**
   * Reset the terminal mouse cursor to the default shape.
   *
   * 逆向: chunk-004.js:4212-4214 — resetMouseCursor() { this.setMouseCursor(B3.DEFAULT) }
   */
  resetMouseCursor(): void {
    this.setMouseCursor("default");
  }

  /**
   * Set the OS-level progress bar state (Ghostty/WezTerm/ConEmu).
   *
   * 逆向: amp 2112_unknown_XXT.js:304 — deinit() and suspend() both send
   *   this.renderer.setProgressBarOff() when xtversion starts with "ghostty".
   *
   * Amp gates cleanup on capabilities?.xtversion?.startsWith("ghostty").
   * Flitter also includes WezTerm (TERM_PROGRAM="WezTerm") which supports
   * OSC 9;4 identically.
   *
   * Calling setProgressBar("indeterminate") during a long-running operation
   * (e.g., LLM streaming) shows a spinning indicator in the OS taskbar /
   * dock / terminal tab bar on supported terminals.
   *
   * This method is a no-op if the terminal does not support OSC 9;4.
   *
   * @param state - "off" | "indeterminate" | "paused"
   */
  setProgressBar(state: "off" | "indeterminate" | "paused"): void {
    if (!this.initialized) return;
    if (!this._supportsProgressBar()) return;
    const seq =
      state === "off"
        ? PROGRESS_BAR_OFF
        : state === "indeterminate"
          ? PROGRESS_BAR_INDETERMINATE
          : PROGRESS_BAR_PAUSED;
    try {
      process.stdout.write(seq);
    } catch {
      // Output stream may be closed
    }
  }

  /**
   * Returns true when the connected terminal supports OSC 9;4 progress bars.
   *
   * 逆向: amp gates cleanup on capabilities?.xtversion?.startsWith("ghostty").
   * We also include WezTerm (TERM_PROGRAM="WezTerm") as it supports the same protocol.
   *
   * @private
   */
  private _supportsProgressBar(): boolean {
    // xtversion-based check (matches amp exactly)
    if (this.capabilities?.xtversion?.startsWith("ghostty")) return true;
    if (this.capabilities?.xtversion?.startsWith("WezTerm")) return true;
    // Heuristic fallback: TERM_PROGRAM env (pre-capability-detection safe path)
    if (process.env.TERM_PROGRAM === "ghostty") return true;
    if (process.env.TERM_PROGRAM === "WezTerm") return true;
    return false;
  }

  // ════════════════════════════════════════════════════
  //  Alt Screen
  // ════════════════════════════════════════════════════

  /**
   * 进入备用屏幕缓冲区。
   *
   * 如果已在备用屏幕中，此调用为 no-op。
   */
  enterAltScreen(): void {
    if (!this.inAltScreen) {
      this.ttyOutput?.stream.write(ALT_SCREEN_ON);
      this.inAltScreen = true;
    }
  }

  /**
   * 退出备用屏幕缓冲区。
   *
   * 如果不在备用屏幕中，此调用为 no-op。
   */
  exitAltScreen(): void {
    if (this.inAltScreen) {
      this.ttyOutput?.stream.write(ALT_SCREEN_OFF);
      this.inAltScreen = false;
    }
  }

  // ════════════════════════════════════════════════════
  //  查询方法
  // ════════════════════════════════════════════════════

  /**
   * 获取当前终端尺寸。
   *
   * 逆向: getSize in tui-layout-engine.js (returns copy of this.terminalSize)
   *
   * @returns 终端尺寸 { width, height }
   */
  getSize(): TerminalSize {
    return { ...this.terminalSize };
  }

  /**
   * 从流读取终端尺寸，4 层防御。
   *
   * 逆向: Uk0 in tui-layout-engine.js:413-426
   *
   * Layer 1: _refreshSize() 强制刷新
   * Layer 2: isTTY && columns && rows 真值检查 + Number.isFinite
   * Layer 3: getWindowSize() 备选
   * Layer 4: 返回 null（调用方使用缓存）
   *
   * @param stream - 要检查的流对象
   * @returns 终端尺寸或 null
   */
  // biome-ignore lint/suspicious/noExplicitAny: stream may be stdout, /dev/tty fd, or TtyOutputTarget — need duck-typing
  private getStreamSize(stream: NodeJS.WriteStream | any): TerminalSize | null {
    try {
      // Layer 1: 强制刷新终端尺寸（Node.js 内部 ioctl TIOCGWINSZ）
      stream._refreshSize?.();

      // Layer 2: 真值检查（拒绝 0, undefined, null, NaN, Infinity 通过 && 短路）
      // 额外加 Number.isFinite 防御 Bun 返回 Infinity
      if (
        stream.isTTY &&
        stream.columns &&
        stream.rows &&
        Number.isFinite(stream.columns) &&
        Number.isFinite(stream.rows)
      ) {
        return { width: stream.columns, height: stream.rows };
      }

      // Layer 3: getWindowSize() 备选（某些 Node 版本支持）
      const ws = stream.getWindowSize?.();
      if (ws && ws[0] > 0 && ws[1] > 0 && Number.isFinite(ws[0]) && Number.isFinite(ws[1])) {
        return { width: ws[0], height: ws[1] };
      }
    } catch {
      // Layer 4: 静默失败
    }
    return null;
  }

  /**
   * 更新缓存的终端尺寸。
   *
   * 逆向: updateTerminalSize in tui-layout-engine.js:232-242
   */
  private updateTerminalSize(): void {
    // amp checks: if (!this.tty.stdin || !JxT(this.tty.stdin))
    if (!this.ttyInput?.stdin || !isTtyStream(this.ttyInput.stdin)) {
      TuiController.log.debug("updateTerminalSize", {
        fallback: true,
        reason: !this.ttyInput?.stdin ? "no stdin" : "stdin not TTY",
        size: { width: 80, height: 24 },
      });
      this.terminalSize = { width: 80, height: 24 };
      return;
    }
    // amp: let T = Uk0(process.stdout); if (T) this.terminalSize = T
    const size = this.getStreamSize(process.stdout);
    if (size) {
      this.terminalSize = size;
    }
    TuiController.log.debug("updateTerminalSize", {
      fallback: false,
      size: this.terminalSize,
    });
    // If getStreamSize returns null, keep previous cached terminalSize (amp behavior)
  }

  /**
   * 获取 Screen 实例。
   *
   * @returns 双缓冲屏幕
   */
  getScreen(): Screen {
    return this.screen;
  }

  /**
   * 获取终端能力信息。
   *
   * 初始化后、能力检测完成前返回 null。
   *
   * @returns 终端能力信息，或 null
   */
  getCapabilities(): TerminalCapabilities | null {
    return this.capabilities;
  }

  // ════════════════════════════════════════════════════
  //  事件注册
  // ════════════════════════════════════════════════════

  /**
   * 注册键盘事件处理器。
   *
   * @param handler - 键盘事件回调
   */
  onKey(handler: (event: KeyEvent) => void): void {
    this.keyHandlers.push(handler);
  }

  /**
   * 注销键盘事件处理器。
   *
   * @param handler - 之前注册的键盘事件回调
   */
  offKey(handler: (event: KeyEvent) => void): void {
    const idx = this.keyHandlers.indexOf(handler);
    if (idx !== -1) this.keyHandlers.splice(idx, 1);
  }

  /**
   * 注册鼠标事件处理器。
   *
   * @param handler - 鼠标事件回调
   */
  onMouse(handler: (event: TermMouseEvent) => void): void {
    this.mouseHandlers.push(handler);
  }

  /**
   * 注册终端尺寸变化处理器。
   *
   * @param handler - 尺寸变化回调
   */
  onResize(handler: (event: TerminalSize) => void): void {
    this.resizeHandlers.push(handler);
  }

  /**
   * 注册粘贴事件处理器。
   *
   * @param handler - 粘贴事件回调
   */
  onPaste(handler: (event: PasteEvent) => void): void {
    this.pasteHandlers.push(handler);
  }

  /**
   * 注册终端能力检测完成处理器。
   *
   * @param handler - 能力检测完成回调
   */
  onCapabilities(handler: (event: CapabilityEvent) => void): void {
    this.capabilityHandlers.push(handler);
  }

  /**
   * 注册终端焦点事件处理器。
   *
   * 逆向: amp's FNR (modules/1253_unknown_iUR.js:1-6) — initFocusTracking
   * subscribes via tui.onFocus(). Terminal sends CSI I / CSI O when
   * focus reporting is enabled (DECSET ?1004).
   *
   * @param handler - 焦点事件回调
   */
  onFocus(handler: (event: TermFocusEvent) => void): void {
    this.focusHandlers.push(handler);
  }

  /**
   * 注销终端焦点事件处理器。
   *
   * @param handler - 之前注册的焦点事件回调
   */
  offFocus(handler: (event: TermFocusEvent) => void): void {
    const idx = this.focusHandlers.indexOf(handler);
    if (idx !== -1) this.focusHandlers.splice(idx, 1);
  }

  // ════════════════════════════════════════════════════
  //  渲染
  // ════════════════════════════════════════════════════

  /**
   * 渲染一帧。
   *
   * 调用 AnsiRenderer 生成差分 ANSI 输出，写入 stdout。
   * 渲染后调用 Screen.present() 同步前后缓冲区。
   */
  render(): void {
    const output = this.renderer.render(this.screen);
    if (output) {
      // 逆向: amp-cli-reversed/modules/2112_unknown_XXT.js:188-201
      // Amp wraps render output with startSync()/endSync() to prevent visual tearing.
      if (this.capabilities?.syncOutput) {
        this.ttyOutput?.stream.write(SYNC_START + output + SYNC_END);
      } else {
        this.ttyOutput?.stream.write(output);
      }
    }
    this.screen.present();
  }

  // ════════════════════════════════════════════════════
  //  能力检测
  // ════════════════════════════════════════════════════

  /**
   * Start terminal capability detection by sending VT query sequences.
   *
   * 逆向: XXT.startCapabilityDetection in 2112_unknown_XXT.js:384-410
   *
   * - Apple Terminal: skip all queries (canRgb: false defaults applied immediately)
   * - JetBrains: skip kitty graphics query
   * - tmux: wrap sequences in DCS passthrough
   * - 2s timeout: finishInitialization() via capabilityTimeout
   */
  startCapabilityDetection(): void {
    if (!this.ttyInput?.stdin || !isTtyStream(this.ttyInput.stdin)) {
      // Not a real TTY — resolve immediately with defaults
      if (this.capabilityResolve) {
        this.capabilities ??= this.defaultCapabilities();
        this.capabilityResolve();
        this.capabilityResolve = null;
      }
      return;
    }

    // 逆向: XXT.js:389 — Apple_Terminal returns early without sending queries
    if (process.env.TERM_PROGRAM === "Apple_Terminal") {
      this.capabilities = {
        ...this.defaultCapabilities(),
        // Apple Terminal doesn't support RGB color queries
        background: "dark",
      };
      for (const handler of this.capabilityHandlers) {
        handler({ capabilities: this.capabilities });
      }
      if (this.capabilityResolve) {
        this.capabilityResolve();
        this.capabilityResolve = null;
      }
      return;
    }

    this._queryParser = new QueryParser();

    const isJetBrains = process.env.TERMINAL_EMULATOR?.includes("JetBrains") ?? false;
    const isAppleTerminal = process.env.TERM_PROGRAM === "Apple_Terminal";
    const isTmux = !!process.env.TMUX;

    // 逆向: Sk0[0] — "Query Kitty explicit width support" (data_structures.js:1-3)
    // Sent BEFORE the main query burst. Enters alt screen, writes a space with OSC 66 w=1,
    // requests cursor position (CPR), then exits alt screen. The CPR response tells us
    // if the terminal honored the explicit width directive.
    // 逆向: XXT.js:405 — markKittyWidthQuerySent() called after writing this sequence
    const kittyWidthProbe = "\x1b[?1049h\x1b[H\x1b]66;w=1; \x1b\\\x1b[6n\x1b[?1049l";
    if (!isAppleTerminal) {
      this.ttyOutput?.stream.write(kittyWidthProbe);
      this._queryParser.markKittyWidthQuerySent();
    }

    const sequence = this._queryParser.buildQuerySequence({ isJetBrains, isAppleTerminal, isTmux });
    if (sequence) {
      this.ttyOutput?.stream.write(sequence);
    }

    // 逆向: XXT.js:407-409 — 2s timeout triggers finishInitialization
    this.capabilityTimeout = setTimeout(() => {
      if (!this.capabilities && this._queryParser) {
        this._finishCapabilityDetection();
      }
    }, 2000);
  }

  /**
   * Finish capability detection — merge probed capabilities over heuristic defaults.
   *
   * 逆向: XXT.finishInitialization in 2112_unknown_XXT.js:411-433
   *
   * @private
   */
  private _finishCapabilityDetection(): void {
    if (this.capabilities) return; // already resolved
    const probed = this._queryParser?.getCapabilities() ?? {};
    const defaults = this.defaultCapabilities();
    // Merge: probed values override heuristic defaults
    this.capabilities = { ...defaults, ...probed } as TerminalCapabilities;
    if (this.capabilityTimeout) {
      clearTimeout(this.capabilityTimeout);
      this.capabilityTimeout = null;
    }
    for (const handler of this.capabilityHandlers) {
      handler({ capabilities: this.capabilities });
    }
    if (this.capabilityResolve) {
      TuiController.log.info("Terminal capabilities detected:", this.capabilities);
      this.capabilityResolve();
      this.capabilityResolve = null;
    }
    // 逆向: XXT.js:429 — if (capabilities.emojiWidth) this.enableEmojiWidth()
    this.enableEmojiWidth();
    // 逆向: XXT.js:431 — this.enableModifyOtherKeys() — unconditional, no capability gate
    this.enableModifyOtherKeys();
  }

  /**
   * 等待终端能力检测完成。
   *
   * 如果已有能力信息则立即返回。否则等待 timeout 毫秒后
   * 使用默认能力 resolve。
   *
   * 逆向: XXT.waitForCapabilities in 2112_unknown_XXT.js:156-161
   *   if (!this.initialized) throw Error
   *   if (this.capabilities) return this.capabilities
   *   if (!this.capabilityPromise) throw Error
   *   return this.capabilityPromise
   *
   * @param timeout - 超时毫秒数
   */
  async waitForCapabilities(timeout: number): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.capabilities) {
        resolve();
        return;
      }
      this.capabilityResolve = resolve;
      // If startCapabilityDetection() hasn't set a timeout yet, set a fallback here
      if (!this.capabilityTimeout) {
        this.capabilityTimeout = setTimeout(() => {
          if (!this.capabilities) {
            if (this._queryParser) {
              this._finishCapabilityDetection();
            } else {
              this.capabilities ??= this.defaultCapabilities();
            }
            this.capabilityTimeout = null;
          }
          resolve();
        }, timeout);
      }
    });
  }

  /**
   * Public getter for the QueryParser instance.
   *
   * 逆向: XXT.getQueryParser in 2112_unknown_XXT.js:153-155
   */
  get queryParser(): QueryParser | null {
    return this._queryParser;
  }

  // ════════════════════════════════════════════════════
  //  私有方法
  // ════════════════════════════════════════════════════

  /**
   * 处理终端窗口尺寸变化。
   *
   * 逆向: handleResize in tui-layout-engine.js
   *
   * @private
   */
  private handleResize(): void {
    this.updateTerminalSize();
    const size = this.getSize();
    this.screen.resize(size.width, size.height);
    for (const handler of this.resizeHandlers) {
      handler(size);
    }
  }

  /**
   * 处理键盘事件——分发给所有注册的 key handler。
   *
   * @param event - 键盘事件
   * @private
   */
  private handleKeyEvent(event: KeyEvent): void {
    for (const handler of this.keyHandlers) {
      handler(event);
    }
  }

  /**
   * 注册 SIGINT/SIGTERM/exit 清理 handler。
   *
   * 逆向: setupCleanupHandlers in tui-layout-engine.js:399-401
   *
   * @private
   */
  private setupCleanupHandlers(): void {
    process.setMaxListeners(0);
    process.on("SIGINT", this.boundCleanup);
    process.on("SIGTERM", this.boundCleanup);
    process.on("exit", this.boundCleanup);
    process.on("SIGCONT", this.boundHandleResume);
  }

  /**
   * 启用鼠标追踪 (SGR 1006 模式)。
   *
   * @private
   */
  private enableMouse(): void {
    this.ttyOutput?.stream.write(MOUSE_ON);
  }

  /**
   * 启用 Bracketed Paste 模式。
   *
   * @private
   */
  private enableBracketedPaste(): void {
    this.ttyOutput?.stream.write(PASTE_ON);
  }

  /**
   * 启用 Kitty Keyboard Protocol (mode 1: disambiguate keys).
   *
   * 逆向: amp enables kitty keyboard at init when the terminal supports it.
   * Mode 1 is safe — it's a progressive enhancement that only changes
   * encoding for ambiguous keys (e.g., Enter vs Ctrl+M).
   *
   * @private
   */
  private enableKittyKeyboard(): void {
    if (this.capabilities?.kittyKeyboard) {
      this.ttyOutput?.stream.write(KITTY_KEYBOARD_ON);
    }
  }

  /**
   * 启用终端焦点报告 (DECSET ?1004)。
   *
   * 逆向: amp enables focus reporting at init. Terminal sends CSI I (focus in)
   * and CSI O (focus out). Used by idle/focus tracking (modules/1253_unknown_iUR.js).
   *
   * @private
   */
  private enableFocusReporting(): void {
    this.ttyOutput?.stream.write(FOCUS_ON);
  }

  /**
   * 启用带内尺寸通知 (DEC Private Mode 2048)。
   *
   * 逆向: amp-cli-reversed/modules/0510_unknown_ktT.js:90-92
   *   enableInBandResize() { return nu0; }  (nu0 = t9 + "?2048h")
   *
   * 逆向: amp-cli-reversed/modules/2112_unknown_XXT.js:313, 431
   *   resume():               this.enableInBandResize()  — unconditional
   *   finishInitialization(): this.enableInBandResize()  — unconditional
   *
   * Amp enables this unconditionally (no capability gate) at both init and resume.
   * The terminal silently ignores it if it doesn't support ?2048.
   *
   * @private
   */
  private enableInBandResize(): void {
    this.ttyOutput?.stream.write(IN_BAND_RESIZE_ON);
  }

  /**
   * 处理带内尺寸变化通知。
   *
   * 逆向: amp-cli-reversed/modules/2112_unknown_XXT.js:449-470
   *   handleInbandResize(T) {
   *     this.terminalSize = { width: T.width, height: T.height };
   *     if (this.queryParser && T.pixelWidth && T.pixelHeight) {
   *       // Update pixel mouse converter if pixel data changed
   *     }
   *     this.screen.resize(T.width, T.height);
   *     setImmediate(() => {
   *       for (let R of this.resizeHandlers) R(T);
   *     });
   *   }
   *
   * CSI response: `ESC [ 48 ; rows ; cols ; pixelH ; pixelW t`
   * Fired by the terminal on window resize when DEC mode ?2048 is active.
   * More reliable than SIGWINCH since it arrives in-band with the input stream.
   * Falls back to SIGWINCH on terminals that don't support ?2048.
   *
   * @param event - InbandResizeEvent from InputParser
   * @private
   */
  private handleInbandResize(event: InbandResizeEvent): void {
    TuiController.log.debug("handleInbandResize", {
      width: event.width,
      height: event.height,
      pixelWidth: event.pixelWidth,
      pixelHeight: event.pixelHeight,
    });

    this.terminalSize = { width: event.width, height: event.height };
    this.screen.resize(event.width, event.height);

    const size = this.terminalSize;
    setImmediate(() => {
      for (const handler of this.resizeHandlers) {
        try {
          handler(size);
        } catch (err) {
          TuiController.log.error("Error in resize handler:", err);
        }
      }
    });
  }

  /**
   * 启用 Emoji 宽度模式 (DEC Private Mode 2027)。
   *
   * 逆向: XXT.js:273-277 — enableEmojiWidth()
   *   if (this.initialized) process.stdout.write(this.renderer.enableEmojiWidth())
   *
   * 逆向: XXT.js:429 — finishInitialization: if (capabilities.emojiWidth) this.enableEmojiWidth()
   * 逆向: XXT.js:311 — resume: if (capabilities?.emojiWidth) this.enableEmojiWidth()
   *
   * @private
   */
  private enableEmojiWidth(): void {
    if (this.capabilities?.emojiWidth) {
      this.ttyOutput?.stream.write(EMOJI_WIDTH_ON);
    }
  }

  /**
   * 启用 modifyOtherKeys 扩展键消歧模式。
   *
   * 逆向: XXT.enableModifyOtherKeys() in 2112_unknown_XXT.js:241-243
   *   process.stdout.write(this.renderer.enableModifyOtherKeys())
   *
   * 逆向: finishInitialization 2112_unknown_XXT.js:431
   *   this.enableModifyOtherKeys()  — always called unconditionally
   * 逆向: resume() 2112_unknown_XXT.js:313
   *   this.enableModifyOtherKeys()  — always called unconditionally
   *
   * 逆向: sy0.js:195-201 — tmux path sends mode 2 (ty0 = "\x1b[>4;2m")
   * instead of mode 1 because tmux doesn't proxy kitty keyboard queries.
   * Non-tmux path: mode 1 (_u0 = t9 + ">4;1m" = "\x1b[>4;1m").
   *
   * Always enabled unconditionally (no capability gate needed).
   *
   * @private
   */
  private enableModifyOtherKeys(): void {
    const isTmux = !!process.env.TMUX;
    this.ttyOutput?.stream.write(isTmux ? MODIFY_OTHER_KEYS_ON_MODE2 : MODIFY_OTHER_KEYS_ON);
  }

  /**
   * 同步恢复终端状态（ANSI 序列写入）。
   *
   * 逆向: XXT.deinit (sync part) in clipboard-and-input.js:600-607
   *       suspend() in tui-layout-engine.js:199-206
   *
   * Signal handlers (SIGINT, SIGTERM, exit) MUST use this sync method.
   * Cannot await async functions in signal context.
   */
  private restoreTerminalSync(): void {
    if (!this.initialized) return;
    let seq = "";
    seq += MOUSE_OFF;
    seq += PASTE_OFF;
    seq += FOCUS_OFF;
    // Disable in-band resize notification
    // 逆向: amp 2112_unknown_XXT.js:303 — suspend() sends disableInBandResize() unconditionally
    seq += IN_BAND_RESIZE_OFF;
    // Disable kitty keyboard if it was enabled
    if (this.capabilities?.kittyKeyboard) {
      seq += KITTY_KEYBOARD_OFF;
    }
    // Disable modifyOtherKeys — always enabled unconditionally, always disabled on cleanup
    // 逆向: XXT.js:303 — suspend() includes disableModifyOtherKeys() in cleanup sequence
    seq += MODIFY_OTHER_KEYS_OFF;
    // Disable emoji width mode if it was enabled
    // 逆向: XXT.js:303 — suspend() includes disableEmojiWidth() in cleanup sequence
    if (this.capabilities?.emojiWidth) {
      seq += EMOJI_WIDTH_OFF;
    }
    // Reset cursor shape to default before showing cursor
    // 逆向: amp XXT deinit/suspend: this.renderer.setCursorShape(0) + showCursor()
    if (this.capabilities?.supportsCursorShape) {
      seq += SET_CURSOR_SHAPE(0);
    }
    seq += SHOW_CURSOR;
    // Send progress bar off for terminals that support OSC 9;4.
    // 逆向: amp 2112_unknown_XXT.js:304 — deinit() and suspend() both send
    //   this.renderer.setProgressBarOff() when capabilities.xtversion starts with "ghostty".
    // We extend to WezTerm (supports same protocol) and add an env-var heuristic
    // so cleanup works even if capability detection hasn't completed.
    if (this._supportsProgressBar()) {
      seq += PROGRESS_BAR_OFF;
    }
    if (this.inAltScreen) {
      seq += ALT_SCREEN_OFF;
      this.inAltScreen = false;
    }
    try {
      // Use process.stdout.write directly (sync in signal context)
      // amp uses process.stdout.write(T) at line 606
      process.stdout.write(seq);
    } catch {
      // Output stream may be closed
    }
  }

  /**
   * 信号清理回调（同步）。
   *
   * 逆向: cleanup() in tui-layout-engine.js:402-406
   */
  private cleanup(): void {
    try {
      this.restoreTerminalSync();
      // Release tty input synchronously
      try {
        this.ttyInput?.dispose();
      } catch {}
      this.ttyInput = null;
      try {
        this.ttyOutput?.dispose();
      } catch {}
      this.ttyOutput = null;
      // Remove signal listeners
      process.removeListener("SIGWINCH", this.boundHandleResize);
      process.stdout.removeListener("resize", this.boundHandleResize);
      process.removeListener("SIGINT", this.boundCleanup);
      process.removeListener("SIGTERM", this.boundCleanup);
      process.removeListener("exit", this.boundCleanup);
      process.removeListener("SIGCONT", this.boundHandleResume);
      // Clear timers
      if (this.capabilityTimeout) {
        clearTimeout(this.capabilityTimeout);
        this.capabilityTimeout = null;
      }
      this.parser = null;
      this.capabilities = null;
      this._queryParser = null;
      this.initialized = false;
    } catch {}
  }

  /**
   * 处理终端暂停 (Ctrl+Z / SIGTSTP)。
   *
   * 逆向: handleSuspend() in tui-layout-engine.js:217-225
   *       suspend() in tui-layout-engine.js:199-206
   */
  handleSuspend(): void {
    if (!this.initialized || this.suspended) return;
    // Sync terminal restore (amp's suspend() at line 199-206)
    this.restoreTerminalSync();
    this.ttyInput?.pause?.();
    this.suspended = true;
    try {
      process.kill(0, "SIGTSTP");
    } catch {
      // Failed to suspend — already handled
    }
  }

  /**
   * 处理终端恢复 (SIGCONT)。
   *
   * 逆向: handleResume() in tui-layout-engine.js:226-231
   *       resume() in tui-layout-engine.js:207-213
   */
  handleResume(): void {
    if (!this.initialized || !this.suspended) return;
    this.ttyInput?.resume?.();
    if (this.parser) this.parser.reset();
    this.enterAltScreen();
    this.enableMouse();
    this.enableBracketedPaste();
    // 逆向: XXT.js:311 — if (capabilities?.emojiWidth) this.enableEmojiWidth()
    this.enableEmojiWidth();
    this.enableKittyKeyboard();
    this.enableFocusReporting();
    // 逆向: amp 2112_unknown_XXT.js:313 — enableInBandResize() called unconditionally on resume
    this.enableInBandResize();
    this.screen.needsFullRefresh = true;
    this.suspended = false;
  }

  /**
   * 默认终端能力（所有特性关闭）。
   *
   * @returns 默认 TerminalCapabilities
   * @private
   */
  private defaultCapabilities(): TerminalCapabilities {
    return {
      emojiWidth: false,
      syncOutput: detectSyncOutputSupport(),
      kittyKeyboard: detectKittyKeyboardSupport(),
      colorPaletteNotifications: false,
      xtversion: null,
      kittyGraphics: false,
      pixelMouse: false,
      pixelDimensions: null,
      osc52: false,
      background: "dark",
      kittyExplicitWidth: false,
      supportsCursorShape: detectCursorShapeSupport(),
      colorDepth: detectColorDepth(),
      animationSupport: detectAnimationSupport(),
      underlineSupport: detectUnderlineSupport(),
      scrollStep: detectScrollStep(),
    };
  }
}

/**
 * Heuristic detection for synchronized output support.
 *
 * 逆向: amp-cli-reversed/modules/2109_unknown_dY.js:36
 * Amp uses DECRQSS response to detect ?2026 support. For terminals that
 * don't respond to DECRQSS, we use TERM/TERM_PROGRAM heuristics for
 * terminals known to support DEC mode 2026.
 *
 * Known supporting terminals: kitty, iTerm2 3.5+, WezTerm, foot, Ghostty, Contour.
 */
function detectSyncOutputSupport(env: Record<string, string | undefined> = process.env): boolean {
  // TERM=xterm-kitty — kitty always supports ?2026
  if (env.TERM === "xterm-kitty") return true;

  // TERM_PROGRAM heuristic for common terminals
  switch (env.TERM_PROGRAM) {
    case "WezTerm":
    case "ghostty":
    case "contour":
      return true;
    case "iTerm.app": {
      // iTerm2 3.5+ supports synchronized output
      const ver = Number.parseFloat(env.TERM_PROGRAM_VERSION ?? "0");
      return ver >= 3.5;
    }
  }

  return false;
}

/**
 * Heuristic detection for Kitty keyboard protocol support.
 *
 * 逆向: amp uses CSI ? u query response to detect support.
 * For terminals that don't respond, we use heuristics for known supporters.
 *
 * Known supporting terminals: kitty, WezTerm, foot, Ghostty, Contour.
 * iTerm2 does NOT support kitty keyboard protocol.
 */
function detectKittyKeyboardSupport(
  env: Record<string, string | undefined> = process.env,
): boolean {
  // TERM=xterm-kitty — kitty always supports its own protocol
  if (env.TERM === "xterm-kitty") return true;

  switch (env.TERM_PROGRAM) {
    case "WezTerm":
    case "ghostty":
    case "contour":
      return true;
  }

  return false;
}

/**
 * Heuristic detection for cursor shape (DECSCUSR) support.
 *
 * 逆向: amp modules/2109_unknown_dY.js:263-265
 *   detectCursorShapeSupport() { return !this.detectEmacs() && !this.detectJetBrains(); }
 *
 * Most terminals support DECSCUSR. The exceptions are:
 * - Emacs (INSIDE_EMACS env var set) — terminal-in-terminal confusion
 * - JetBrains built-in terminal (TERMINAL_EMULATOR starts with "JetBrains")
 */
function detectCursorShapeSupport(env: Record<string, string | undefined> = process.env): boolean {
  if (env.INSIDE_EMACS) return false;
  if (env.TERMINAL_EMULATOR?.startsWith("JetBrains")) return false;
  return true;
}

/**
 * Detect animation support level based on terminal environment.
 *
 * 逆向: amp modules/2109_unknown_dY.js:266-272
 *   detectAnimationSupport() {
 *     if (this.options.animationDisabled) return "disabled";
 *     if (NO_ANIMATION === "1" || NO_ANIMATIONS === "1") return "disabled";
 *     if (this.detectEmacs() || this.detectSSH()) return "disabled";
 *     if (this.detectJetBrains()) return "slow";
 *     return "fast";
 *   }
 *
 * "disabled" = no animations at all (static spinners, no transitions)
 * "slow" = reduced animations (slower spinners, fewer frames)
 * "fast" = full animations (braille spinners, smooth transitions)
 */
export function detectAnimationSupport(
  env: Record<string, string | undefined> = process.env,
): "fast" | "slow" | "disabled" {
  // NO_ANIMATION=1 or NO_ANIMATIONS=1 — user explicitly disabled
  if (env.NO_ANIMATION === "1" || env.NO_ANIMATIONS === "1") return "disabled";
  // Emacs terminal — animation doesn't render well
  if (env.INSIDE_EMACS) return "disabled";
  // SSH session — latency makes animations distracting
  if (env.SSH_CLIENT || env.SSH_TTY || env.SSH_CONNECTION) return "disabled";
  // JetBrains built-in terminal — slower rendering, use reduced animations
  if (env.TERMINAL_EMULATOR?.startsWith("JetBrains")) return "slow";
  return "fast";
}

/**
 * Detect underline support level.
 *
 * 逆向: amp modules/2109_unknown_dY.js:20
 *   `underlineSupport: ji() ? "none" : "standard"`
 *   ji() is `detectJetBrains()` — checks TERMINAL_EMULATOR?.includes("JetBrains")
 *
 * JetBrains built-in terminal (JediTerm) doesn't render underline ANSI codes
 * correctly, so underlines are silently dropped.
 */
export function detectUnderlineSupport(
  env: Record<string, string | undefined> = process.env,
): "none" | "standard" {
  if (env.TERMINAL_EMULATOR?.startsWith("JetBrains")) return "none";
  return "standard";
}

/**
 * Detect scroll step based on terminal type.
 *
 * 逆向: dY.js:289-293 — getScrollStep()
 *   ghostty → 1, JetBrains (ji()) → 1, else → 3
 *
 * Returns a function (matching amp's lazy `scrollStep: () => this.getScrollStep()` pattern)
 * that can be re-evaluated if xtversion becomes available later.
 */
export function detectScrollStep(
  env: Record<string, string | undefined> = process.env,
): () => number {
  // Ghostty uses pixel-level scrolling; 1 line per tick is the right step
  if (env.TERM_PROGRAM === "ghostty") return () => 1;
  // JetBrains terminal (JediTerm) has small viewports
  if (env.TERMINAL_EMULATOR?.startsWith("JetBrains")) return () => 1;
  // Default: 3 lines per tick (amp default)
  return () => 3;
}
