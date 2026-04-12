/**
 * 跨平台剪贴板操作。
 *
 * 自动检测运行平台并选择合适的剪贴板策略:
 * - macOS: `pbcopy` / `pbpaste`
 * - Linux Wayland: `wl-copy` / `wl-paste`
 * - Linux X11: `xclip` (selection clipboard)
 * - Fallback: OSC 52 终端转义序列
 *
 * 安全设计:
 * - spawn 的命令名硬编码，不接受用户输入 (T-06-15)
 * - 文本通过 stdin 传递，不进入命令参数 (T-06-14)
 * - 不使用 shell=true (T-06-15)
 *
 * @example
 * ```ts
 * const clipboard = new Clipboard();
 * await clipboard.writeText("hello");
 * const text = await clipboard.readText();
 * ```
 *
 * @module
 */

import { spawn, type ChildProcess } from "child_process";

/** 剪贴板策略类型 */
export type ClipboardStrategy = "pbcopy" | "wl-copy" | "xclip" | "osc52";

/**
 * 跨平台剪贴板。
 *
 * 根据当前平台自动选择最佳的剪贴板读写策略。
 * 所有外部命令通过 `child_process.spawn` 调用，
 * 文本通过 stdin 传递以避免命令注入。
 */
export class Clipboard {
  /** 当前使用的剪贴板策略 */
  private _strategy: ClipboardStrategy;

  /**
   * 创建 Clipboard 实例，自动检测平台。
   */
  constructor() {
    this._strategy = this._detectPlatform();
  }

  /**
   * 自动检测平台，返回最佳策略。
   *
   * 检测优先级:
   * 1. macOS (darwin) → pbcopy/pbpaste
   * 2. Linux + WAYLAND_DISPLAY → wl-copy/wl-paste
   * 3. Linux + DISPLAY → xclip
   * 4. 其他 → OSC 52
   */
  private _detectPlatform(): ClipboardStrategy {
    const platform = process.platform;
    if (platform === "darwin") {
      return "pbcopy";
    }
    if (platform === "linux") {
      if (process.env.WAYLAND_DISPLAY) {
        return "wl-copy";
      }
      if (process.env.DISPLAY) {
        return "xclip";
      }
    }
    return "osc52";
  }

  /**
   * 写入文本到系统剪贴板。
   *
   * @param text - 要写入的文本
   * @returns 是否成功写入
   */
  async writeText(text: string): Promise<boolean> {
    switch (this._strategy) {
      case "pbcopy":
        return this._writeViaSpawn("pbcopy", [], text);
      case "wl-copy":
        return this._writeViaSpawn("wl-copy", [], text);
      case "xclip":
        return this._writeViaSpawn("xclip", ["-selection", "clipboard"], text);
      case "osc52":
        return this._writeViaOsc52(text);
      default:
        return false;
    }
  }

  /**
   * 从系统剪贴板读取文本。
   *
   * @returns 剪贴板中的文本，OSC 52 策略不支持读取返回空字符串
   */
  async readText(): Promise<string> {
    switch (this._strategy) {
      case "pbcopy":
        return this._execCommand("pbpaste") ?? "";
      case "wl-copy":
        return this._execCommand("wl-paste") ?? "";
      case "xclip":
        return this._execCommand("xclip", ["-selection", "clipboard", "-o"]) ?? "";
      case "osc52":
        // OSC 52 不支持读取
        return "";
      default:
        return "";
    }
  }

  /**
   * 通过 spawn 外部命令写入剪贴板。
   *
   * 文本通过 stdin 传递，不进入命令参数 (安全: T-06-14/T-06-15)。
   *
   * @internal
   */
  private async _writeViaSpawn(
    command: string,
    args: string[],
    text: string
  ): Promise<boolean> {
    try {
      const child = this._spawn(command, args);
      child.stdin?.write(text);
      child.stdin?.end();
      return new Promise<boolean>((resolve) => {
        child.on("close", (code: number | null) => {
          resolve(code === 0);
        });
        child.on("error", () => {
          resolve(false);
        });
      });
    } catch {
      return false;
    }
  }

  /**
   * 通过 OSC 52 转义序列写入剪贴板。
   *
   * 格式: `\x1b]52;c;{base64}\x07`
   *
   * @internal
   */
  private async _writeViaOsc52(text: string): Promise<boolean> {
    try {
      const encoded = Buffer.from(text).toString("base64");
      this._writeStdout(`\x1b]52;c;${encoded}\x07`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 执行外部命令并收集 stdout。
   *
   * @internal
   */
  private async _execCommand(
    command: string,
    args: string[] = []
  ): Promise<string> {
    try {
      const child = this._spawn(command, args);
      let stdout = "";
      child.stdout?.on("data", (data: Buffer) => {
        stdout += data.toString();
      });
      return new Promise<string>((resolve) => {
        child.on("close", () => {
          resolve(stdout);
        });
        child.on("error", () => {
          resolve("");
        });
      });
    } catch {
      return "";
    }
  }

  /**
   * 创建子进程 (可被测试 mock 覆盖)。
   *
   * @internal
   */
  private _spawn(command: string, args: string[] = []): ChildProcess {
    return spawn(command, args, { stdio: ["pipe", "pipe", "ignore"] });
  }

  /**
   * 写入 stdout (可被测试 mock 覆盖)。
   *
   * @internal
   */
  private _writeStdout(data: string): void {
    process.stdout.write(data);
  }
}
