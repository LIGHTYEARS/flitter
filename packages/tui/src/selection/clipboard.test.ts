/**
 * Clipboard 跨平台剪贴板 - 单元测试
 *
 * 验证 Clipboard 在不同平台 (macOS/Linux Wayland/Linux X11/OSC52)
 * 的写入和读取行为。
 *
 * @module
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
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

  describe("writeText", () => {
    it("should call pbcopy on macOS via spawn", async () => {
      Object.defineProperty(process, "platform", { value: "darwin", configurable: true });
      const cb = new Clipboard();
      // Mock spawn to simulate successful pbcopy
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
      cb._spawn = () => mockProcess as any;

      const result = await cb.writeText("hello");
      expect(result).toBe(true);
      expect(mockStdin.write).toHaveBeenCalledWith("hello");
      expect(mockStdin.end).toHaveBeenCalled();
    });

    it("should return false when spawn fails", async () => {
      Object.defineProperty(process, "platform", { value: "darwin", configurable: true });
      const cb = new Clipboard();
      // @ts-expect-error override for testing
      cb._spawn = () => { throw new Error("command not found"); };

      const result = await cb.writeText("hello");
      expect(result).toBe(false);
    });

    it("should use OSC 52 escape sequence for osc52 strategy", async () => {
      Object.defineProperty(process, "platform", { value: "freebsd", configurable: true });
      delete process.env.WAYLAND_DISPLAY;
      delete process.env.DISPLAY;
      const cb = new Clipboard();

      let written = "";
      // @ts-expect-error override for testing
      cb._writeStdout = (data: string) => { written = data; };

      const result = await cb.writeText("hello");
      expect(result).toBe(true);
      // base64("hello") = "aGVsbG8="
      expect(written).toContain("aGVsbG8=");
      // OSC 52 format: \x1b]52;c;{base64}\x07
      expect(written.startsWith("\x1b]52;c;")).toBe(true);
      expect(written.endsWith("\x07")).toBe(true);
    });
  });

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
      cb._execCommand = async (cmd: string) => { execCalled = cmd; return "wayland text"; };

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
      cb._execCommand = async (cmd: string, args?: string[]) => { execArgs = args || []; return "x11 text"; };

      const result = await cb.readText();
      expect(result).toBe("x11 text");
      expect(execArgs).toContain("-o");
    });
  });
});
