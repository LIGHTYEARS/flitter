/**
 * TuiController — 终端控制器。
 *
 * 逆向: XXT in clipboard-and-input.js:511-620
 *
 * 管理终端 raw mode、alt screen、stdin 读取、鼠标/键盘/粘贴事件分发、
 * 终端能力检测、信号处理 (SIGWINCH, SIGINT, SIGTERM, SIGTSTP)。
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

// ════════════════════════════════════════════════════
//  类型定义
// ════════════════════════════════════════════════════

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
 * 管理终端 raw mode、alt screen、stdin 读取、鼠标/键盘/粘贴事件分发、
 * 终端能力检测、信号处理 (SIGWINCH, SIGINT, SIGTERM, SIGTSTP)。
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
  /** 绑定的 stdin data 处理函数引用 */
  private boundOnData: ((data: Buffer | string) => void) | null = null;

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

      // 配置 stdin
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding("utf8");
      }

      // 绑定 stdin 数据读取
      this.boundOnData = (data: Buffer | string) => {
        const buf = typeof data === "string" ? Buffer.from(data) : data;
        this.parser?.feed(buf);
      };
      process.stdin.on("data", this.boundOnData);

      // 非 TTY 环境下 unref stdin，避免阻止进程退出
      if (!process.stdin.isTTY) {
        process.stdin.unref();
      }

      // 信号处理
      process.on("SIGWINCH", this.boundHandleResize);
      if (process.stdout.isTTY) {
        process.stdout.on("resize", this.boundHandleResize);
      }

      // 更新尺寸并同步 Screen
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
      let seq = "";
      seq += MOUSE_OFF;
      seq += PASTE_OFF;
      seq += SHOW_CURSOR;
      if (this.inAltScreen) {
        seq += ALT_SCREEN_OFF;
        this.inAltScreen = false;
      }
      if (process.stdout.writable) {
        process.stdout.write(seq);
      }
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

    // 移除 stdin data 监听器
    if (this.boundOnData) {
      process.stdin.removeListener("data", this.boundOnData);
      this.boundOnData = null;
    }

    // 恢复 stdin 状态
    if (process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(false);
        process.stdin.pause();
      } catch {
        // stdin 可能已关闭
      }
    }

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
      process.stdout.write(ALT_SCREEN_ON);
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
      process.stdout.write(ALT_SCREEN_OFF);
      this.inAltScreen = false;
    }
  }

  // ════════════════════════════════════════════════════
  //  查询方法
  // ════════════════════════════════════════════════════

  /**
   * 获取当前终端尺寸。
   *
   * 优先使用 process.stdout 的列数/行数，fallback 到 80x24。
   *
   * @returns 终端尺寸 { width, height }
   */
  getSize(): TerminalSize {
    return {
      width: process.stdout.columns ?? 80,
      height: process.stdout.rows ?? 24,
    };
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
      process.stdout.write(output);
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
  //  暂停 (Ctrl+Z)
  // ════════════════════════════════════════════════════

  /**
   * 处理终端暂停 (Ctrl+Z / SIGTSTP)。
   *
   * 清理终端状态后向自身发送 SIGTSTP。
   */
  handleSuspend(): void {
    this.deinit();
    process.kill(process.pid, "SIGTSTP");
  }

  // ════════════════════════════════════════════════════
  //  私有方法
  // ════════════════════════════════════════════════════

  /**
   * 处理终端窗口尺寸变化。
   *
   * @private
   */
  private handleResize(): void {
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
   * 注册 SIGINT/SIGTERM 清理 handler。
   *
   * @private
   */
  private setupCleanupHandlers(): void {
    process.on("SIGINT", this.boundCleanup);
    process.on("SIGTERM", this.boundCleanup);
  }

  /**
   * 启用鼠标追踪 (SGR 1006 模式)。
   *
   * @private
   */
  private enableMouse(): void {
    if (process.stdout.writable) {
      process.stdout.write(MOUSE_ON);
    }
  }

  /**
   * 启用 Bracketed Paste 模式。
   *
   * @private
   */
  private enableBracketedPaste(): void {
    if (process.stdout.writable) {
      process.stdout.write(PASTE_ON);
    }
  }

  /**
   * 信号清理回调。
   *
   * @private
   */
  private cleanup(): void {
    this.deinit();
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
