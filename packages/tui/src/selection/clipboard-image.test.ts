/**
 * ClipboardImage 多平台剪贴板图片检测 - 单元测试
 *
 * 验证 detectImageClipboardMethod 在不同平台和环境变量组合下
 * 返回正确的读取方法。
 *
 * @module
 */

import { describe, expect, test } from "bun:test";
import { detectImageClipboardMethod } from "./clipboard-image.js";

describe("ClipboardImage", () => {
  test("macOS uses osascript", () => {
    expect(detectImageClipboardMethod("darwin", {})).toBe("osascript");
  });

  test("Linux with WAYLAND_DISPLAY uses wl-paste", () => {
    expect(detectImageClipboardMethod("linux", { WAYLAND_DISPLAY: "wayland-0" })).toBe("wl-paste");
  });

  test("Linux with DISPLAY uses xclip", () => {
    expect(detectImageClipboardMethod("linux", { DISPLAY: ":0" })).toBe("xclip");
  });

  test("WSL uses wsl method", () => {
    expect(detectImageClipboardMethod("linux", { WSL_DISTRO_NAME: "Ubuntu" })).toBe("wsl");
  });

  test("win32 uses powershell", () => {
    expect(detectImageClipboardMethod("win32", {})).toBe("powershell");
  });

  test("unknown platform returns null", () => {
    expect(detectImageClipboardMethod("freebsd", {})).toBeNull();
  });

  test("WSL takes priority over WAYLAND_DISPLAY", () => {
    expect(
      detectImageClipboardMethod("linux", {
        WSL_DISTRO_NAME: "Ubuntu",
        WAYLAND_DISPLAY: "wayland-0",
      }),
    ).toBe("wsl");
  });

  test("WSL takes priority over DISPLAY", () => {
    expect(
      detectImageClipboardMethod("linux", {
        WSL_DISTRO_NAME: "Ubuntu",
        DISPLAY: ":0",
      }),
    ).toBe("wsl");
  });

  test("WAYLAND_DISPLAY takes priority over DISPLAY on plain Linux", () => {
    expect(
      detectImageClipboardMethod("linux", {
        WAYLAND_DISPLAY: "wayland-0",
        DISPLAY: ":0",
      }),
    ).toBe("wl-paste");
  });

  test("Linux with no display env returns null", () => {
    expect(detectImageClipboardMethod("linux", {})).toBeNull();
  });

  test("darwin ignores env variables", () => {
    expect(
      detectImageClipboardMethod("darwin", {
        WAYLAND_DISPLAY: "wayland-0",
        DISPLAY: ":0",
      }),
    ).toBe("osascript");
  });
});
