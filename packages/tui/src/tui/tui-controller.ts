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

import { InputParser } from "../vt/input-parser.js";
import type { KeyEvent, MouseEvent as TermMouseEvent, PasteEvent } from "../vt/types.js";
import { Screen } from "../screen/screen.js";
import {
  AnsiRenderer,
  ALT_SCREEN_ON,
  ALT_SCREEN_OFF,
  MOUSE_ON,
  MOUSE_OFF,
  PASTE_ON,
  PASTE_OFF,
  SHOW_CURSOR,
  HIDE_CURSOR,
} from "../screen/ansi-renderer.js";
import { createTtyInput, createTtyOutput } from "./tty-input.js";
import type { TtyInputSource, TtyOutputTarget } from "./tty-input.js";

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
function isTtyStream(stream: unknown): boolean {
  return (
    typeof stream === "object" &&
    stream !== null &&
    "isTTY" in stream &&
    (stream as any).isTTY === true &&
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
  /** 能力检测 Promise resolve 函数 */
  private capabilityResolve: (() => void) | null = null;
  /** 能力检测超时计时器 */
  private capabilityTimeout: ReturnType<typeof setTimeout> | null = null;

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
          default:
            // focus, resize 等其他事件暂不通过 InputParser 分发
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

      // 注册清理 handlers
      this.setupCleanupHandlers();

      this.initialized = true;

      // 启用鼠标追踪和 bracketed paste
      this.enableMouse();
      this.enableBracketedPaste();
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
    this.initialized = false;
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
    if (!this.ttyInput || !isTtyStream(this.ttyInput)) {
      this.terminalSize = { width: 80, height: 24 };
      return;
    }
    // amp: let T = Uk0(process.stdout); if (T) this.terminalSize = T
    const size = this.getStreamSize(process.stdout);
    if (size) {
      this.terminalSize = size;
    }
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
      this.ttyOutput?.stream.write(output);
    }
    this.screen.present();
  }

  // ════════════════════════════════════════════════════
  //  能力检测
  // ════════════════════════════════════════════════════

  /**
   * 等待终端能力检测完成。
   *
   * 如果已有能力信息则立即返回。否则等待 timeout 毫秒后
   * 使用默认能力 resolve。
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
      this.capabilityTimeout = setTimeout(() => {
        this.capabilities ??= this.defaultCapabilities();
        this.capabilityTimeout = null;
        resolve();
      }, timeout);
    });
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
    seq += SHOW_CURSOR;
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
      try { this.ttyInput?.dispose(); } catch { }
      this.ttyInput = null;
      try { this.ttyOutput?.dispose(); } catch { }
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
      this.initialized = false;
    } catch { }
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
      syncOutput: false,
      kittyKeyboard: false,
      colorPaletteNotifications: false,
      xtversion: null,
    };
  }
}
