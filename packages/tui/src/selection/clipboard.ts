/**
 * 跨平台剪贴板操作。
 *
 * 逆向: eA (KXT) in amp-cli-reversed/chunk-004.js:3713-3944
 *
 * 写入优先级 (matchs amp eA.writeText):
 * 1. OSC 52 — 仅当 capabilities.osc52 为 true 时:
 *    - 非 tmux: 写入后立即返回 true
 *    - tmux: 写入 OSC 52 后继续尝试平台工具 (set-clipboard="on"/"unknown")
 * 2. 平台工具 (pbcopy / wl-copy / xclip / clip.exe / powershell.exe)
 * 3. 若前两步均失败但 OSC 52 已写入，返回 true
 *
 * tmux 特殊处理:
 * - 检测 `tmux show-options -s -v set-clipboard`
 * - "on" / "unknown" → isTmuxOsc52Allowed = true
 * - "off" / "external" 时跳过 OSC 52 (tmux 不会转发)
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

import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import type { TerminalCapabilities } from "../tui/tui-controller.js";

// ════════════════════════════════════════════════════
//  Types
// ════════════════════════════════════════════════════

/** 剪贴板读取策略类型 */
export type ClipboardStrategy = "pbcopy" | "wl-copy" | "xclip" | "osc52";

/** tmux set-clipboard option values */
type TmuxSetClipboard = "on" | "external" | "off" | "unknown";

// ════════════════════════════════════════════════════
//  Clipboard
// ════════════════════════════════════════════════════

/**
 * 跨平台剪贴板。
 *
 * 根据终端能力和当前平台自动选择最佳的剪贴板读写策略。
 * 所有外部命令通过 `child_process.spawn` 调用，
 * 文本通过 stdin 传递以避免命令注入。
 *
 * 逆向: eA (KXT) in amp-cli-reversed/chunk-004.js:3713-3944
 */
export class Clipboard {
  /**
   * 当前终端能力（由 setCapabilities 注入）。
   *
   * 逆向: KXT.capabilities — set via setCapabilities()
   */
  private _capabilities: Pick<TerminalCapabilities, "osc52"> | null = null;

  /**
   * tmux set-clipboard 选项值。
   *
   * 逆向: KXT.tmuxSetClipboard — async populated by detectTmuxSetClipboard()
   *   "on" | "external" → isTmuxOsc52Allowed
   *   "off" → not allowed
   *   "unknown" → allowed (conservative default)
   */
  private _tmuxSetClipboard: TmuxSetClipboard = "unknown";

  /** 当前使用的剪贴板读取策略 */
  private _strategy: ClipboardStrategy;

  /**
   * 创建 Clipboard 实例，自动检测平台。
   */
  constructor() {
    this._strategy = this._detectPlatform();
  }

  // ════════════════════════════════════════════════════
  //  Capability injection
  // ════════════════════════════════════════════════════

  /**
   * 注入终端能力，触发 tmux set-clipboard 异步检测。
   *
   * 逆向: KXT.setCapabilities in chunk-004.js:3719-3721
   *   if (this.capabilities = T, Xb()) this.detectTmuxSetClipboard();
   *   Xb() = detectTmux() = !!process.env.TMUX
   *
   * @param capabilities - 终端能力（来自 QueryParser）
   */
  setCapabilities(capabilities: Pick<TerminalCapabilities, "osc52">): void {
    this._capabilities = capabilities;
    if (this._isTmux()) {
      this._detectTmuxSetClipboard();
    }
  }

  // ════════════════════════════════════════════════════
  //  Public API
  // ════════════════════════════════════════════════════

  /**
   * 写入文本到系统剪贴板。
   *
   * 逆向: KXT.writeText in chunk-004.js:3921-3944
   *   Priority:
   *   1. OSC 52 if supported (and tmux allows it)
   *   2. Platform tools (pbcopy / wl-copy / xclip / clip.exe / powershell)
   *   3. Return true if OSC 52 was already written
   *
   * @param text - 要写入的文本
   * @returns 是否成功写入
   */
  async writeText(text: string): Promise<boolean> {
    // 逆向: KXT.writeText:3921
    //   let R = Xb() (isTmux), a = false (osc52Written)
    const isTmux = this._isTmux();
    let osc52Written = false;

    // 逆向: KXT.writeText:3924-3928
    //   if (isOsc52Supported() && (!R || isTmuxOsc52Allowed())) {
    //     write OSC 52; a = true; if (!R) return true;
    //   }
    if (this.isOsc52Supported() && (!isTmux || this.isTmuxOsc52Allowed())) {
      const encoded = Buffer.from(text).toString("base64");
      const osc52Seq = `\x1b]52;c;${encoded}\x07`;
      this._writeStdout(osc52Seq);
      osc52Written = true;
      if (!isTmux) {
        // Non-tmux: OSC 52 is the only needed path — return immediately
        return true;
      }
    }

    // 逆向: KXT.writeText:3929 — platform fallthrough
    //   (for tmux: try platform tools even after OSC 52)
    const platform = this._getPlatform();
    if (platform === "darwin") {
      if (await this._writeToPbcopy(text)) return true;
    } else if (platform === "win32") {
      if (await this._writeToPowerShell(text)) return true;
      if (await this._writeToClipExe(text)) return true;
    } else {
      // Linux / other
      if (
        (await this._commandExists("wl-copy")) &&
        (await this._writeViaSpawn("wl-copy", [], text))
      )
        return true;
      if (
        (await this._commandExists("xclip")) &&
        (await this._writeViaSpawn("xclip", ["-selection", "clipboard"], text))
      )
        return true;
      if (this._isWSL()) {
        if (await this._writeToPowerShell(text)) return true;
      }
    }

    // 逆向: KXT.writeText:3942-3943
    //   if (a) return true — OSC 52 was written in tmux path, count as success
    if (osc52Written) return true;
    return false;
  }

  /**
   * 从系统剪贴板读取文本。
   *
   * Note: amp reads via OSC 52 when supported (requires pending read promise
   * infrastructure tied to the VT input stream). That path is not yet wired
   * in Flitter's clipboard layer. We fall through to platform tools.
   *
   * @returns 剪贴板中的文本，失败时返回空字符串
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
        // OSC 52 read requires VT input stream integration — not yet available
        return "";
      default:
        return "";
    }
  }

  /**
   * Read X11 primary selection (middle-click paste).
   *
   * 逆向: KXT.readPrimarySelection in chunk-004.js:3904-3920
   *
   * Algorithm (matches amp):
   * 1. macOS / win32 → delegate to readText() (no primary selection concept)
   * 2. OSC 52 primary read (not yet wired — skip)
   * 3. wl-paste --primary --no-newline
   * 4. xclip -selection primary -o
   * 5. Return null if all paths fail
   *
   * @returns Primary selection text, or null if unavailable
   */
  async readPrimarySelection(): Promise<string | null> {
    // 逆向: KXT.readPrimarySelection:3904
    //   let T = wM(); if (T === "darwin" || T === "win32") return this.readText();
    const platform = this._getPlatform();
    if (platform === "darwin" || platform === "win32") {
      const text = await this.readText();
      return text || null;
    }

    // 逆向: KXT.readPrimarySelection:3907-3909
    //   if (this.isOsc52Supported()) { let R = await this.readFromOSC52Primary(); if (R !== null) return R; }
    // OSC 52 primary read requires VT input stream integration — not yet available

    // 逆向: KXT.readPrimarySelection:3911-3914
    //   if (await this.commandExists("wl-paste")) { let R = await this.readFromWlPaste("primary"); if (R !== null) return R; }
    if (await this._commandExists("wl-paste")) {
      const text = await this._execCommand("wl-paste", ["--no-newline", "--primary"]);
      if (text) return text;
    }

    // 逆向: KXT.readPrimarySelection:3915-3918
    //   if (await this.commandExists("xclip")) { let R = await this.readFromXclip("primary"); if (R !== null) return R; }
    if (await this._commandExists("xclip")) {
      const text = await this._execCommand("xclip", ["-selection", "primary", "-o"]);
      if (text) return text;
    }

    return null;
  }

  // ════════════════════════════════════════════════════
  //  Capability helpers
  // ════════════════════════════════════════════════════

  /**
   * 是否支持 OSC 52 剪贴板写入。
   *
   * 逆向: KXT.isOsc52Supported in chunk-004.js:3735-3737
   *   return this.capabilities?.osc52 ?? false
   */
  isOsc52Supported(): boolean {
    return this._capabilities?.osc52 ?? false;
  }

  /**
   * tmux 是否允许转发 OSC 52。
   *
   * 逆向: KXT.isTmuxOsc52Allowed in chunk-004.js:3732-3734
   *   return this.tmuxSetClipboard === "on" || this.tmuxSetClipboard === "unknown"
   *
   * Note: amp treats "unknown" as allowed (conservative default when
   * the tmux command timed out or returned an unexpected value).
   * "external" means tmux passes it to the outer terminal, but the outer
   * terminal's osc52 support is unknown; amp does NOT allow in that case.
   * "off" means tmux blocks OSC 52.
   */
  isTmuxOsc52Allowed(): boolean {
    return this._tmuxSetClipboard === "on" || this._tmuxSetClipboard === "unknown";
  }

  // ════════════════════════════════════════════════════
  //  Private helpers
  // ════════════════════════════════════════════════════

  /**
   * 自动检测平台，返回最佳读取策略。
   *
   * 检测优先级:
   * 1. macOS (darwin) → pbcopy/pbpaste
   * 2. Linux + WAYLAND_DISPLAY → wl-copy/wl-paste
   * 3. Linux + DISPLAY → xclip
   * 4. 其他 → OSC 52
   */
  private _detectPlatform(): ClipboardStrategy {
    const platform = this._getPlatform();
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
   * 检测 tmux set-clipboard 选项值（异步，spawn 后台进程）。
   *
   * 逆向: KXT.detectTmuxSetClipboard in chunk-004.js:3722-3730
   *   E_("tmux", ["show-options", "-s", "-v", "set-clipboard"], {timeout: 1000}, cb)
   *   if (!T) { a = R.trim(); if (a === "on"|"external"|"off") this.tmuxSetClipboard = a }
   *
   * E_ is execFile; default remains "unknown" on error/timeout/unrecognized value.
   */
  private _detectTmuxSetClipboard(): void {
    try {
      const child = spawn("tmux", ["show-options", "-s", "-v", "set-clipboard"], {
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 1000,
      });
      let stdout = "";
      child.stdout?.on("data", (data: Buffer) => {
        stdout += data.toString();
      });
      child.on("close", (code: number | null) => {
        if (code === 0) {
          const val = stdout.trim() as TmuxSetClipboard;
          if (val === "on" || val === "external" || val === "off") {
            this._tmuxSetClipboard = val;
          }
          // "unknown" stays as-is for unexpected / empty values
        }
        // non-zero exit (e.g. option not set) → leave as "unknown"
      });
    } catch {
      // spawn error → leave as "unknown"
    }
  }

  /**
   * 写入文本到 pbcopy (macOS).
   *
   * 逆向: KXT.writeToPbcopy in chunk-004.js:3745-3756
   */
  private async _writeToPbcopy(text: string): Promise<boolean> {
    return this._writeViaSpawn("pbcopy", [], text);
  }

  /**
   * 写入文本到 powershell.exe (Windows / WSL).
   *
   * 逆向: KXT.writeToPowerShell in chunk-004.js:3793-3804
   */
  private async _writeToPowerShell(text: string): Promise<boolean> {
    return this._writeViaSpawn(
      "powershell.exe",
      ["-NoProfile", "-Command", "$Input | Set-Clipboard"],
      text,
    );
  }

  /**
   * 写入文本到 clip.exe (Windows).
   *
   * 逆向: KXT.writeToClipExe in chunk-004.js:3781-3792
   */
  private async _writeToClipExe(text: string): Promise<boolean> {
    return this._writeViaSpawn("clip.exe", [], text);
  }

  /**
   * 检测命令是否存在（使用 `which`）。
   *
   * 逆向: KXT.commandExists in chunk-004.js:3738-3744
   */
  private async _commandExists(command: string): Promise<boolean> {
    try {
      const result = spawnSync("which", [command], { stdio: "ignore" });
      return result.status === 0;
    } catch {
      return false;
    }
  }

  /**
   * 检测是否在 WSL 环境中运行。
   *
   * 逆向: ZxT() in chunk-004.js:3709-3712
   *   wM() !== "linux" → false
   *   WSL_DISTRO_NAME || /proc/sys/fs/binfmt_misc/WSLInterop
   */
  private _isWSL(): boolean {
    if (this._getPlatform() !== "linux") return false;
    return Boolean(process.env.WSL_DISTRO_NAME);
  }

  /**
   * 检测是否运行在 tmux 内。
   *
   * 逆向: Xb() = detectTmux() = !!process.env.TMUX
   */
  private _isTmux(): boolean {
    return !!process.env.TMUX;
  }

  /**
   * 通过 spawn 外部命令写入剪贴板。
   *
   * 文本通过 stdin 传递，不进入命令参数 (安全: T-06-14/T-06-15)。
   *
   * @internal
   */
  private async _writeViaSpawn(command: string, args: string[], text: string): Promise<boolean> {
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
   * 执行外部命令并收集 stdout。
   *
   * @internal
   */
  private async _execCommand(command: string, args: string[] = []): Promise<string> {
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

  /**
   * 返回当前平台 (可被测试 mock 覆盖)。
   *
   * @internal
   */
  private _getPlatform(): NodeJS.Platform {
    return process.platform;
  }
}
