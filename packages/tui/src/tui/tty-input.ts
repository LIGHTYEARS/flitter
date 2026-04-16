/**
 * TtyInputSource — 终端输入源模块。
 *
 * 逆向: eXT/Zu0/Ju0/Qu0/hy0 in tui-widget-framework.js:679-934
 *
 * 提供 /dev/tty 主输入源（绕过 stdin 重定向）和 process.stdin 回退。
 * 输出目标策略: stdout > stderr > /dev/tty write。
 * Bun 版本检测: Bun < 1.2.22 回退到 process.stdin。
 *
 * @example
 * ```ts
 * import { createTtyInput, createTtyOutput } from "./tty-input.js";
 *
 * const input = createTtyInput();
 * input.on("data", (buf) => parser.feed(buf));
 *
 * const output = createTtyOutput();
 * output.stream.write("Hello terminal\n");
 *
 * // 清理
 * input.dispose();
 * output.dispose();
 * ```
 *
 * @module
 */

import * as fs from "node:fs";
import * as tty from "node:tty";

// ════════════════════════════════════════════════════
//  接口定义
// ════════════════════════════════════════════════════

/**
 * 终端输入源接口。
 *
 * 逆向: Zu0/Ju0 返回类型，tui-widget-framework.js
 *
 * 统一 /dev/tty 和 process.stdin 两种输入源，提供一致的
 * init/on/pause/resume/dispose 生命周期管理。
 *
 * @example
 * ```ts
 * const source: TtyInputSource = createDevTtyInput();
 * source.on("data", (buf) => console.log("input:", buf));
 * // ... 使用
 * source.dispose();
 * ```
 */
export interface TtyInputSource {
  /** 底层读取流 */
  stdin: tty.ReadStream | NodeJS.ReadStream | null;
  /** 数据回调 */
  dataCallback: ((data: Buffer) => void) | null;
  /** 初始化前的输入缓冲区 */
  earlyInputBuffer: Buffer[];
  /** 初始化输入源 */
  init(): void;
  /** 注册数据事件处理器 */
  on(event: "data", handler: (data: Buffer) => void): void;
  /** 暂停输入 */
  pause(): void;
  /** 恢复输入 */
  resume(): void;
  /** 释放资源 */
  dispose(): void;
  /** 获取早期输入文本并清空缓冲区 */
  getEarlyInputText(): string;
}

/**
 * 终端输出目标接口。
 *
 * 逆向: hy0 返回类型，tui-widget-framework.js:903-934
 *
 * 统一 stdout/stderr/dev-tty 三种输出目标。
 *
 * @example
 * ```ts
 * const output: TtyOutputTarget = createTtyOutput();
 * output.stream.write("\x1b[31mRed text\x1b[0m");
 * output.dispose();
 * ```
 */
export interface TtyOutputTarget {
  /** 输出流（支持 write 方法） */
  stream: { write(data: string | Buffer): boolean };
  /** 输出目标类型 */
  target: "stdout" | "stderr" | "dev-tty";
  /** 释放资源（关闭 /dev/tty fd） */
  dispose(): void;
}

/**
 * createDevTtyInput / createStdinFallback 的选项。
 */
export interface TtyInputOptions {
  /** 延迟初始化（测试用），不立即打开 /dev/tty */
  deferInit?: boolean;
}

// ════════════════════════════════════════════════════
//  Bun 版本检测
// ════════════════════════════════════════════════════

/**
 * 检测当前 Bun 版本是否存在 /dev/tty bug。
 *
 * 逆向: Qu0() in tui-widget-framework.js:679-689
 *
 * Bun < 1.2.22 的 tty.ReadStream 存在 bug，需要回退到 process.stdin。
 * 仅 Bun 1.2.x (x < 22) 返回 true。
 *
 * @returns 是否需要回退到 process.stdin
 *
 * @example
 * ```ts
 * if (isBunWithTtyBug()) {
 *   // 使用 process.stdin 回退
 * } else {
 *   // 使用 /dev/tty
 * }
 * ```
 */
export function isBunWithTtyBug(): boolean {
  const version = (process.versions as Record<string, string | undefined>).bun;
  if (!version) return false;
  const parts = version.split(".").map(Number);
  const [major, minor, patch] = parts;
  if (major !== 1 || minor !== 2) return false;
  return (patch ?? 0) < 22;
}

// ════════════════════════════════════════════════════
//  ANSI 转义剥离
// ════════════════════════════════════════════════════

/**
 * 移除字符串中的 ANSI 转义序列。
 *
 * 逆向: aXT() in tui-widget-framework.js
 *
 * 处理 CSI 序列 (\x1b[...) 和 OSC 序列 (\x1b]... 以 ST 或 BEL 结尾)。
 *
 * @param text - 可能包含 ANSI 转义的字符串
 * @returns 去除转义后的纯文本
 *
 * @example
 * ```ts
 * stripAnsiEscapes("\x1b[31mhello\x1b[0m")  // => "hello"
 * stripAnsiEscapes("\x1b]0;title\x07text")   // => "text"
 * ```
 */
export function stripAnsiEscapes(text: string): string {
  // CSI: \x1b[ 后跟参数字节(0x30-0x3f)和中间字节(0x20-0x2f)，最后是终止字节(0x40-0x7e)
  // OSC: \x1b] 后跟任意内容，以 ST(\x1b\\) 或 BEL(\x07) 结尾
  return text
    .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "") // CSI 序列
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, ""); // OSC 序列
}

// ════════════════════════════════════════════════════
//  /dev/tty 输入源
// ════════════════════════════════════════════════════

/**
 * 创建 /dev/tty 输入源。
 *
 * 逆向: Zu0() in tui-widget-framework.js:768-813
 *
 * 直接打开 /dev/tty 设备作为输入源，绕过 process.stdin 的重定向。
 * 支持早期输入缓冲（在 TUI 初始化完成前捕获按键）。
 *
 * @param options - 选项，deferInit=true 时不立即打开 /dev/tty
 * @returns TtyInputSource 实例
 *
 * @example
 * ```ts
 * const input = createDevTtyInput();
 * input.on("data", (buf) => parser.feed(buf));
 * // ...
 * input.dispose();
 * ```
 */
export function createDevTtyInput(options?: TtyInputOptions): TtyInputSource {
  let drainedEarly = false;

  const source: TtyInputSource = {
    stdin: null,
    dataCallback: null,
    earlyInputBuffer: [],

    init() {
      if (this.stdin !== null) return;
      const fd = fs.openSync("/dev/tty", "r");
      if (!tty.isatty(fd)) {
        fs.closeSync(fd);
        throw new Error("/dev/tty is not a TTY device");
      }
      const stream = new tty.ReadStream(fd);
      this.stdin = stream;
      stream.setRawMode(true);
      stream.on("data", (data: Buffer) => {
        if (!drainedEarly) {
          this.earlyInputBuffer.push(Buffer.from(data));
        }
        this.dataCallback?.(data);
      });
    },

    on(_event: "data", handler: (data: Buffer) => void) {
      this.dataCallback = handler;
    },

    pause() {
      if (this.stdin && "setRawMode" in this.stdin) {
        try {
          (this.stdin as tty.ReadStream).setRawMode(false);
        } catch {
          // stream 可能已关闭
        }
      }
      this.stdin?.removeAllListeners("data");
      try {
        this.stdin?.destroy();
      } catch {
        // ignore
      }
      this.stdin = null;
    },

    resume() {
      this.init();
    },

    dispose() {
      if (this.stdin && "setRawMode" in this.stdin) {
        try {
          (this.stdin as tty.ReadStream).setRawMode(false);
        } catch {
          // stream 可能已关闭
        }
      }
      if (this.stdin) {
        this.stdin.removeAllListeners("data");
        try {
          this.stdin.destroy();
        } catch {
          // ignore
        }
      }
      this.stdin = null;
      this.dataCallback = null;
      this.earlyInputBuffer = [];
    },

    getEarlyInputText() {
      drainedEarly = true;
      if (this.earlyInputBuffer.length === 0) return "";
      const text = Buffer.concat(this.earlyInputBuffer).toString("utf8");
      this.earlyInputBuffer = [];
      return stripAnsiEscapes(text);
    },
  };

  if (!options?.deferInit) {
    source.init();
  }

  return source;
}

// ════════════════════════════════════════════════════
//  process.stdin 回退输入源
// ════════════════════════════════════════════════════

/**
 * 创建 process.stdin 回退输入源。
 *
 * 逆向: Ju0() in tui-widget-framework.js:815-879
 *
 * 在 Bun < 1.2.22 或 /dev/tty 不可用时使用 process.stdin 作为输入源。
 *
 * @param options - 选项，deferInit=true 时不立即配置 stdin
 * @returns TtyInputSource 实例
 *
 * @example
 * ```ts
 * const input = createStdinFallback();
 * input.on("data", (buf) => parser.feed(buf));
 * // ...
 * input.dispose();
 * ```
 */
export function createStdinFallback(options?: TtyInputOptions): TtyInputSource {
  let drainedEarly = false;
  let boundHandler: ((data: Buffer | string) => void) | null = null;

  const source: TtyInputSource = {
    stdin: null,
    dataCallback: null,
    earlyInputBuffer: [],

    init() {
      if (this.stdin !== null) return;
      const stdin = process.stdin;
      this.stdin = stdin as unknown as tty.ReadStream;
      if (stdin.isTTY) {
        try {
          (stdin as unknown as tty.ReadStream).setRawMode(true);
        } catch {
          // stdin 可能不支持 raw mode
        }
        stdin.resume();
      } else {
        // 非 TTY 环境下 unref stdin，避免阻止进程退出
        try {
          stdin.unref();
        } catch {
          // Bun 可能不支持 unref
        }
      }
      boundHandler = (data: Buffer | string) => {
        const buf = typeof data === "string" ? Buffer.from(data) : data;
        if (!drainedEarly) {
          this.earlyInputBuffer.push(Buffer.from(buf));
        }
        this.dataCallback?.(buf);
      };
      stdin.on("data", boundHandler);
    },

    on(_event: "data", handler: (data: Buffer) => void) {
      this.dataCallback = handler;
    },

    pause() {
      if (boundHandler) {
        process.stdin.removeListener("data", boundHandler);
        boundHandler = null;
      }
      if (process.stdin.isTTY) {
        try {
          (process.stdin as unknown as tty.ReadStream).setRawMode(false);
        } catch {
          // ignore
        }
        process.stdin.pause();
      }
      this.stdin = null;
    },

    resume() {
      this.init();
    },

    dispose() {
      if (boundHandler) {
        process.stdin.removeListener("data", boundHandler);
        boundHandler = null;
      }
      if (process.stdin.isTTY) {
        try {
          (process.stdin as unknown as tty.ReadStream).setRawMode(false);
        } catch {
          // ignore
        }
        try {
          process.stdin.pause();
        } catch {
          // ignore
        }
      }
      this.stdin = null;
      this.dataCallback = null;
      this.earlyInputBuffer = [];
    },

    getEarlyInputText() {
      drainedEarly = true;
      if (this.earlyInputBuffer.length === 0) return "";
      const text = Buffer.concat(this.earlyInputBuffer).toString("utf8");
      this.earlyInputBuffer = [];
      return stripAnsiEscapes(text);
    },
  };

  if (!options?.deferInit) {
    source.init();
  }

  return source;
}

// ════════════════════════════════════════════════════
//  输出目标策略
// ════════════════════════════════════════════════════

/**
 * 创建终端输出目标。
 *
 * 逆向: hy0() in tui-widget-framework.js:903-934
 *
 * 优先级: process.stdout > process.stderr > /dev/tty write。
 * 确保在所有环境下都有可用的终端输出通道。
 *
 * @returns TtyOutputTarget 实例
 *
 * @example
 * ```ts
 * const output = createTtyOutput();
 * output.stream.write("Hello terminal\n");
 * output.dispose();
 * ```
 */
export function createTtyOutput(): TtyOutputTarget {
  // 优先: stdout
  if (process.stdout.isTTY) {
    return {
      stream: process.stdout,
      target: "stdout",
      dispose() {
        /* stdout 不需要关闭 */
      },
    };
  }

  // 次选: stderr
  if (process.stderr.isTTY) {
    return {
      stream: process.stderr,
      target: "stderr",
      dispose() {
        /* stderr 不需要关闭 */
      },
    };
  }

  // 最后: /dev/tty write
  try {
    const fd = fs.openSync("/dev/tty", "w");
    if (tty.isatty(fd)) {
      let closed = false;
      return {
        stream: {
          write(data: string | Buffer): boolean {
            if (closed) return false;
            try {
              fs.writeSync(fd, typeof data === "string" ? data : data.toString());
              return true;
            } catch {
              return false;
            }
          },
        },
        target: "dev-tty",
        dispose() {
          if (!closed) {
            closed = true;
            try {
              fs.closeSync(fd);
            } catch {
              // ignore
            }
          }
        },
      };
    }
    fs.closeSync(fd);
  } catch {
    // /dev/tty 不可用
  }

  // 兜底: 使用 stdout（可能不是 TTY 但仍可写入）
  return {
    stream: process.stdout,
    target: "stdout",
    dispose() {
      /* stdout 不需要关闭 */
    },
  };
}

// ════════════════════════════════════════════════════
//  输入源路由器
// ════════════════════════════════════════════════════

/**
 * 创建终端输入源（自动路由）。
 *
 * 逆向: eXT() in tui-widget-framework.js:881-883
 *
 * 如果 Bun < 1.2.22 则使用 process.stdin 回退，
 * 否则使用 /dev/tty 直接输入。
 *
 * @param options - 选项，deferInit=true 时不立即初始化
 * @returns TtyInputSource 实例
 *
 * @example
 * ```ts
 * const input = createTtyInput();
 * input.on("data", (buf) => parser.feed(buf));
 * // ...
 * input.dispose();
 * ```
 */
export function createTtyInput(options?: TtyInputOptions): TtyInputSource {
  if (isBunWithTtyBug()) {
    return createStdinFallback(options);
  }
  // 尝试 /dev/tty，失败则回退到 process.stdin
  // （CI/sandbox 环境可能没有 /dev/tty 设备）
  try {
    return createDevTtyInput(options);
  } catch {
    return createStdinFallback(options);
  }
}
