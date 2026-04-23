/**
 * Clipboard 跨平台剪贴板 - 单元测试
 *
 * 验证 Clipboard 在不同平台 (macOS/Linux Wayland/Linux X11/OSC52/tmux)
 * 的写入和读取行为，以及 OSC 52 能力门控逻辑。
 *
 * 逆向: eA (KXT) in amp-cli-reversed/chunk-004.js:3713-3944
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { Clipboard } from "./clipboard.js";

describe("Clipboard", () => {
  let originalPlatform: PropertyDescriptor | undefined;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalPlatform = Object.getOwnPropertyDescriptor(process, "platform");
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    if (originalPlatform) {
      Object.defineProperty(process, "platform", originalPlatform);
    }
    process.env = originalEnv;
  });

  // ════════════════════════════════════════════════════
  //  _detectPlatform (read strategy)
  // ════════════════════════════════════════════════════

  describe("_detectPlatform", () => {
    it("should detect 'pbcopy' on darwin", () => {
      Object.defineProperty(process, "platform", { value: "darwin", configurable: true });
      const cb = new Clipboard();
      // @ts-expect-error access private for testing
      expect(cb._strategy).toBe("pbcopy");
    });

    it("should detect 'wl-copy' on Linux with WAYLAND_DISPLAY", () => {
      Object.defineProperty(process, "platform", { value: "linux", configurable: true });
      process.env.WAYLAND_DISPLAY = "wayland-0";
      delete process.env.DISPLAY;
      const cb = new Clipboard();
      // @ts-expect-error access private for testing
      expect(cb._strategy).toBe("wl-copy");
    });

    it("should detect 'xclip' on Linux with DISPLAY", () => {
      Object.defineProperty(process, "platform", { value: "linux", configurable: true });
      delete process.env.WAYLAND_DISPLAY;
      process.env.DISPLAY = ":0";
      const cb = new Clipboard();
      // @ts-expect-error access private for testing
      expect(cb._strategy).toBe("xclip");
    });

    it("should fallback to 'osc52' when no platform matched", () => {
      Object.defineProperty(process, "platform", { value: "freebsd", configurable: true });
      delete process.env.WAYLAND_DISPLAY;
      delete process.env.DISPLAY;
      const cb = new Clipboard();
      // @ts-expect-error access private for testing
      expect(cb._strategy).toBe("osc52");
    });
  });

  // ════════════════════════════════════════════════════
  //  isOsc52Supported / isTmuxOsc52Allowed
  // ════════════════════════════════════════════════════

  describe("isOsc52Supported", () => {
    it("returns false by default (no capabilities set)", () => {
      const cb = new Clipboard();
      expect(cb.isOsc52Supported()).toBe(false);
    });

    it("returns false when capabilities.osc52=false", () => {
      const cb = new Clipboard();
      cb.setCapabilities({ osc52: false });
      expect(cb.isOsc52Supported()).toBe(false);
    });

    it("returns true when capabilities.osc52=true", () => {
      const cb = new Clipboard();
      cb.setCapabilities({ osc52: true });
      expect(cb.isOsc52Supported()).toBe(true);
    });
  });

  describe("isTmuxOsc52Allowed", () => {
    it("returns true when tmuxSetClipboard is 'unknown' (default)", () => {
      const cb = new Clipboard();
      expect(cb.isTmuxOsc52Allowed()).toBe(true);
    });

    it("returns true when tmuxSetClipboard is 'on'", () => {
      const cb = new Clipboard();
      // @ts-expect-error access private for testing
      cb._tmuxSetClipboard = "on";
      expect(cb.isTmuxOsc52Allowed()).toBe(true);
    });

    it("returns false when tmuxSetClipboard is 'external'", () => {
      const cb = new Clipboard();
      // @ts-expect-error access private for testing
      cb._tmuxSetClipboard = "external";
      expect(cb.isTmuxOsc52Allowed()).toBe(false);
    });

    it("returns false when tmuxSetClipboard is 'off'", () => {
      const cb = new Clipboard();
      // @ts-expect-error access private for testing
      cb._tmuxSetClipboard = "off";
      expect(cb.isTmuxOsc52Allowed()).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════
  //  writeText — OSC 52 capability gating
  // ════════════════════════════════════════════════════

  describe("writeText — OSC 52 capability gating", () => {
    it("does NOT use OSC 52 when capabilities not set (default)", async () => {
      Object.defineProperty(process, "platform", { value: "freebsd", configurable: true });
      delete process.env.TMUX;
      const cb = new Clipboard();
      // No capabilities set → osc52=false by default

      let written = "";
      // @ts-expect-error override for testing
      cb._writeStdout = (data: string) => {
        written = data;
      };
      // Platform tools will all fail on freebsd — but no OSC 52 either
      // @ts-expect-error override for testing
      cb._spawn = () => {
        throw new Error("command not found");
      };

      const result = await cb.writeText("hello");
      expect(result).toBe(false);
      expect(written).toBe(""); // OSC 52 NOT written
    });

    it("does NOT use OSC 52 when capabilities.osc52=false", async () => {
      Object.defineProperty(process, "platform", { value: "freebsd", configurable: true });
      delete process.env.TMUX;
      const cb = new Clipboard();
      cb.setCapabilities({ osc52: false });

      let written = "";
      // @ts-expect-error override for testing
      cb._writeStdout = (data: string) => {
        written = data;
      };
      // @ts-expect-error override for testing
      cb._spawn = () => {
        throw new Error("command not found");
      };

      const result = await cb.writeText("hello");
      expect(result).toBe(false);
      expect(written).toBe("");
    });

    it("uses OSC 52 as first path when capabilities.osc52=true (non-tmux)", async () => {
      Object.defineProperty(process, "platform", { value: "freebsd", configurable: true });
      delete process.env.TMUX;
      const cb = new Clipboard();
      cb.setCapabilities({ osc52: true });

      let written = "";
      // @ts-expect-error override for testing
      cb._writeStdout = (data: string) => {
        written = data;
      };

      const result = await cb.writeText("hello");
      expect(result).toBe(true);
      // base64("hello") = "aGVsbG8="
      expect(written).toContain("aGVsbG8=");
      expect(written.startsWith("\x1b]52;c;")).toBe(true);
      expect(written.endsWith("\x07")).toBe(true);
    });

    it("returns immediately after OSC 52 in non-tmux — does NOT call platform tools", async () => {
      Object.defineProperty(process, "platform", { value: "darwin", configurable: true });
      delete process.env.TMUX;
      const cb = new Clipboard();
      cb.setCapabilities({ osc52: true });

      let spawnCalled = false;
      let written = "";
      // @ts-expect-error override for testing
      cb._writeStdout = (data: string) => {
        written = data;
      };
      // @ts-expect-error override for testing
      cb._spawn = () => {
        spawnCalled = true;
        throw new Error("should not be called");
      };

      const result = await cb.writeText("hello");
      expect(result).toBe(true);
      expect(written).toContain("aGVsbG8=");
      expect(spawnCalled).toBe(false); // pbcopy was NOT attempted
    });

    it("uses OSC 52 on macOS when osc52=true and returns immediately", async () => {
      Object.defineProperty(process, "platform", { value: "darwin", configurable: true });
      delete process.env.TMUX;
      const cb = new Clipboard();
      cb.setCapabilities({ osc52: true });

      let written = "";
      // @ts-expect-error override for testing
      cb._writeStdout = (data: string) => {
        written = data;
      };

      const result = await cb.writeText("test text");
      expect(result).toBe(true);
      // base64("test text") = "dGVzdCB0ZXh0"
      expect(written).toContain("dGVzdCB0ZXh0");
    });
  });

  // ════════════════════════════════════════════════════
  //  writeText — tmux path
  // ════════════════════════════════════════════════════

  describe("writeText — tmux path", () => {
    it("writes OSC 52 in tmux when set-clipboard=on, then also tries platform", async () => {
      Object.defineProperty(process, "platform", { value: "darwin", configurable: true });
      process.env.TMUX = "/tmp/tmux-0/default,1234,0";
      const cb = new Clipboard();
      cb.setCapabilities({ osc52: true });
      // @ts-expect-error access private for testing
      cb._tmuxSetClipboard = "on"; // simulate detected value

      let written = "";
      // @ts-expect-error override for testing
      cb._writeStdout = (data: string) => {
        written = data;
      };

      const mockStdin = {
        write: mock(() => {}),
        end: mock(() => {}),
      };
      const mockProcess = {
        stdin: mockStdin,
        on: mock((event: string, handler: (code: number) => void) => {
          if (event === "close") handler(0);
          return mockProcess;
        }),
      };
      // @ts-expect-error override for testing
      cb._spawn = () => mockProcess;

      const result = await cb.writeText("hello");
      expect(result).toBe(true);
      expect(written).toContain("aGVsbG8="); // OSC 52 was written
      expect(mockStdin.write).toHaveBeenCalledWith("hello"); // pbcopy also called
    });

    it("skips OSC 52 in tmux when set-clipboard=off", async () => {
      Object.defineProperty(process, "platform", { value: "darwin", configurable: true });
      process.env.TMUX = "/tmp/tmux-0/default,1234,0";
      const cb = new Clipboard();
      cb.setCapabilities({ osc52: true });
      // @ts-expect-error access private for testing
      cb._tmuxSetClipboard = "off"; // tmux blocks OSC 52

      let written = "";
      // @ts-expect-error override for testing
      cb._writeStdout = (data: string) => {
        written = data;
      };

      const mockStdin = {
        write: mock(() => {}),
        end: mock(() => {}),
      };
      const mockProcess = {
        stdin: mockStdin,
        on: mock((event: string, handler: (code: number) => void) => {
          if (event === "close") handler(0);
          return mockProcess;
        }),
      };
      // @ts-expect-error override for testing
      cb._spawn = () => mockProcess;

      const result = await cb.writeText("hello");
      expect(result).toBe(true);
      expect(written).toBe(""); // OSC 52 NOT written
      expect(mockStdin.write).toHaveBeenCalledWith("hello"); // pbcopy used instead
    });

    it("uses OSC 52 in tmux with set-clipboard=unknown (default), falls through to platform", async () => {
      Object.defineProperty(process, "platform", { value: "darwin", configurable: true });
      process.env.TMUX = "/tmp/tmux-0/default,1234,0";
      const cb = new Clipboard();
      cb.setCapabilities({ osc52: true });
      // _tmuxSetClipboard stays "unknown" (default)

      let written = "";
      // @ts-expect-error override for testing
      cb._writeStdout = (data: string) => {
        written = data;
      };

      const mockStdin = {
        write: mock(() => {}),
        end: mock(() => {}),
      };
      const mockProcess = {
        stdin: mockStdin,
        on: mock((event: string, handler: (code: number) => void) => {
          if (event === "close") handler(0);
          return mockProcess;
        }),
      };
      // @ts-expect-error override for testing
      cb._spawn = () => mockProcess;

      const result = await cb.writeText("hello");
      expect(result).toBe(true);
      expect(written).toContain("aGVsbG8="); // OSC 52 written
      expect(mockStdin.write).toHaveBeenCalledWith("hello"); // pbcopy also called
    });

    it("returns true in tmux even when platform tool fails, if OSC 52 was written", async () => {
      Object.defineProperty(process, "platform", { value: "darwin", configurable: true });
      process.env.TMUX = "/tmp/tmux-0/default,1234,0";
      const cb = new Clipboard();
      cb.setCapabilities({ osc52: true });
      // _tmuxSetClipboard = "unknown"

      let written = "";
      // @ts-expect-error override for testing
      cb._writeStdout = (data: string) => {
        written = data;
      };
      // @ts-expect-error override for testing
      cb._spawn = () => {
        throw new Error("pbcopy not found");
      };

      const result = await cb.writeText("hello");
      expect(result).toBe(true); // success because OSC 52 was written
      expect(written).toContain("aGVsbG8=");
    });
  });

  // ════════════════════════════════════════════════════
  //  writeText — platform tools (no osc52)
  // ════════════════════════════════════════════════════

  describe("writeText — platform tools", () => {
    it("should call pbcopy on macOS via spawn", async () => {
      Object.defineProperty(process, "platform", { value: "darwin", configurable: true });
      delete process.env.TMUX;
      const cb = new Clipboard();
      // osc52 NOT set → falls through to platform
      const mockStdin = {
        write: mock(() => {}),
        end: mock(() => {}),
      };
      const mockProcess = {
        stdin: mockStdin,
        on: mock((event: string, handler: (code: number) => void) => {
          if (event === "close") handler(0);
          return mockProcess;
        }),
      };
      // @ts-expect-error override for testing
      cb._spawn = () => mockProcess;

      const result = await cb.writeText("hello");
      expect(result).toBe(true);
      expect(mockStdin.write).toHaveBeenCalledWith("hello");
      expect(mockStdin.end).toHaveBeenCalled();
    });

    it("should return false when spawn fails and osc52 not set", async () => {
      Object.defineProperty(process, "platform", { value: "darwin", configurable: true });
      delete process.env.TMUX;
      const cb = new Clipboard();
      // @ts-expect-error override for testing
      cb._spawn = () => {
        throw new Error("command not found");
      };

      const result = await cb.writeText("hello");
      expect(result).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════
  //  readText
  // ════════════════════════════════════════════════════

  describe("readText", () => {
    it("should call pbpaste on macOS", async () => {
      Object.defineProperty(process, "platform", { value: "darwin", configurable: true });
      const cb = new Clipboard();
      // @ts-expect-error override for testing
      cb._execCommand = async () => "clipboard content";

      const result = await cb.readText();
      expect(result).toBe("clipboard content");
    });

    it("should return empty string for osc52 strategy (read not supported)", async () => {
      Object.defineProperty(process, "platform", { value: "freebsd", configurable: true });
      delete process.env.WAYLAND_DISPLAY;
      delete process.env.DISPLAY;
      const cb = new Clipboard();

      const result = await cb.readText();
      expect(result).toBe("");
    });

    it("should use wl-paste on Linux Wayland", async () => {
      Object.defineProperty(process, "platform", { value: "linux", configurable: true });
      process.env.WAYLAND_DISPLAY = "wayland-0";
      delete process.env.DISPLAY;
      const cb = new Clipboard();
      let execCalled = "";
      // @ts-expect-error override for testing
      cb._execCommand = async (cmd: string) => {
        execCalled = cmd;
        return "wayland text";
      };

      const result = await cb.readText();
      expect(result).toBe("wayland text");
      expect(execCalled).toBe("wl-paste");
    });

    it("should use xclip -o on Linux X11", async () => {
      Object.defineProperty(process, "platform", { value: "linux", configurable: true });
      delete process.env.WAYLAND_DISPLAY;
      process.env.DISPLAY = ":0";
      const cb = new Clipboard();
      let execArgs: string[] = [];
      // @ts-expect-error override for testing
      cb._execCommand = async (_cmd: string, args?: string[]) => {
        execArgs = args || [];
        return "x11 text";
      };

      const result = await cb.readText();
      expect(result).toBe("x11 text");
      expect(execArgs).toContain("-o");
    });
  });
});
