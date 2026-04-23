/**
 * 多平台剪贴板图片读取。
 *
 * 根据运行平台和环境变量自动选择合适的读取方式:
 * - macOS (darwin): `osascript` AppleScript 读取
 * - Windows (win32): PowerShell `System.Windows.Forms.Clipboard`
 * - Linux WSL: PowerShell via `powershell.exe` + `wslpath` 路径转换
 * - Linux Wayland: `wl-paste --type image/png`
 * - Linux X11: `xclip -selection clipboard -t image/png -o`
 *
 * 逆向: VTR() in amp-cli-reversed/chunk-004.js:32086
 * 格式数组: KrT in amp-cli-reversed/chunk-006.js:18176
 * PowerShell脚本: fN0 in amp-cli-reversed/chunk-005.js:29516
 *
 * @module
 */

import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { copyFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** 支持的剪贴板图片读取方法 */
export type ClipboardImageMethod = "osascript" | "wl-paste" | "xclip" | "powershell" | "wsl";

/**
 * 图片格式描述符。
 *
 * 逆向: KrT in amp-cli-reversed/chunk-006.js:18176
 */
interface ImageFormat {
  extension: string;
  mimeType?: string;
  /** macOS AppleScript class (e.g. «class PNGf») */
  osascriptClass?: string;
}

/**
 * 支持的图片格式列表 (PNG, JPEG, GIF, WebP)。
 *
 * 逆向: KrT in amp-cli-reversed/chunk-006.js:18176-18191
 */
const IMAGE_FORMATS: ImageFormat[] = [
  { extension: "png", osascriptClass: "\xABclass PNGf\xBB", mimeType: "image/png" },
  { extension: "jpg", osascriptClass: "\xABclass JPEG\xBB", mimeType: "image/jpeg" },
  { extension: "gif", osascriptClass: "\xABclass GIFf\xBB", mimeType: "image/gif" },
  { extension: "webp", mimeType: "image/webp" },
];

/**
 * PowerShell 脚本：将剪贴板图片存为临时 PNG 文件并输出其路径。
 *
 * 逆向: fN0 in amp-cli-reversed/chunk-005.js:29516
 */
const POWERSHELL_SCRIPT =
  "Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; " +
  "if (-not [System.Windows.Forms.Clipboard]::ContainsImage()) { exit 2 }; " +
  "$image = [System.Windows.Forms.Clipboard]::GetImage(); " +
  "if ($null -eq $image) { exit 3 }; " +
  '$tempFile = Join-Path ([System.IO.Path]::GetTempPath()) ("amp-paste-{0}.png" -f [System.Guid]::NewGuid().ToString("N")); ' +
  "$image.Save($tempFile, [System.Drawing.Imaging.ImageFormat]::Png); " +
  "Write-Output $tempFile";

/**
 * 生成临时文件路径。
 *
 * 逆向: _W() in amp-cli-reversed/chunk-004.js:31896
 */
function makeTempPath(extension: string): string {
  const hex = randomBytes(8).toString("hex");
  return join(tmpdir(), `amp-paste-${hex}.${extension}`);
}

/**
 * 检查命令是否可用 (which)。
 *
 * 逆向: LQ() in amp-cli-reversed/chunk-004.js:31889
 */
async function commandExists(cmd: string): Promise<boolean> {
  try {
    await execFileAsync("which", [cmd]);
    return true;
  } catch {
    return false;
  }
}

/**
 * 取多行 stdout 最后一行有效内容。
 *
 * 逆向: IN0() in amp-cli-reversed/chunk-004.js:31904
 */
function lastNonEmptyLine(text: string): string | null {
  return (
    text
      .split(/\r?\n/u)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .at(-1) ?? null
  );
}

/**
 * 用 PowerShell 读取剪贴板图片，返回 Windows 临时文件路径。
 *
 * 逆向: KTR() in amp-cli-reversed/chunk-004.js:31907
 */
async function readPowerShellTempPath(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-STA", "-Command", POWERSHELL_SCRIPT],
      { timeout: 3000 },
    );
    const path = lastNonEmptyLine(stdout);
    if (!path) {
      return null;
    }
    return path;
  } catch {
    return null;
  }
}

/**
 * 转义 PowerShell 单引号字符串中的单引号。
 *
 * 逆向: gN0() in amp-cli-reversed/chunk-004.js:31923
 */
function escapePowerShellSingleQuote(s: string): string {
  return s.replaceAll("'", "''");
}

/**
 * 用 PowerShell 删除临时文件 (静默失败)。
 *
 * 逆向: $N0() in amp-cli-reversed/chunk-004.js:31926
 */
async function removePowerShellTempFile(path: string): Promise<void> {
  const cmd = `Remove-Item -LiteralPath '${escapePowerShellSingleQuote(path)}' -Force -ErrorAction SilentlyContinue`;
  try {
    await execFileAsync("powershell.exe", ["-NoProfile", "-Command", cmd], {
      timeout: 3000,
    });
  } catch {
    // Ignore errors
  }
}

/**
 * 将 Windows 路径通过 wslpath 转换为 Linux 路径。
 *
 * 逆向: vN0() in amp-cli-reversed/chunk-004.js:31934
 */
async function wslpathToUnix(windowsPath: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("wslpath", ["-u", windowsPath], {
      timeout: 3000,
    });
    const converted = stdout.trim();
    return converted.length > 0 ? converted : null;
  } catch {
    return null;
  }
}

/**
 * macOS osascript 方式读取剪贴板图片。
 * 依次尝试 PNG → JPEG → GIF，返回首个非空临时文件路径。
 *
 * 逆向: jN0() in amp-cli-reversed/chunk-004.js:31950
 */
async function readOsascript(): Promise<string | null> {
  for (const fmt of IMAGE_FORMATS) {
    if (!fmt.osascriptClass) continue;
    const tempFile = makeTempPath(fmt.extension);
    const script = `
      try
        set theImage to the clipboard as ${fmt.osascriptClass}
        set theFile to open for access POSIX file "${tempFile}" with write permission
        write theImage to theFile
        close access theFile
        return "${tempFile}"
      on error
        return ""
      end try
    `;
    try {
      const { stdout } = await execFileAsync("osascript", ["-e", script]);
      if (stdout.trim() === tempFile) {
        try {
          const info = await stat(tempFile);
          if (info.size > 0) {
            return tempFile;
          }
          // Empty file — clean up and try next format
          try {
            await import("node:fs/promises").then((m) => m.unlink(tempFile));
          } catch {}
        } catch {
          // File not created
        }
      }
    } catch {
      // osascript failed for this format — try next
    }
  }
  return null;
}

/**
 * Linux Wayland wl-paste 方式读取剪贴板图片。
 *
 * 逆向: SN0() in amp-cli-reversed/chunk-004.js:31987
 */
async function readWlPaste(): Promise<string | null> {
  for (const fmt of IMAGE_FORMATS) {
    if (!fmt.mimeType) continue;
    try {
      const { stdout } = await execFileAsync("wl-paste", ["--type", fmt.mimeType, "--no-newline"], {
        encoding: "buffer",
        maxBuffer: 52428800,
        timeout: 3000,
      } as Parameters<typeof execFileAsync>[2]);
      // stdout is a Buffer when encoding: "buffer"
      const buf = stdout as unknown as Buffer;
      if (buf.length > 0) {
        const tempFile = makeTempPath(fmt.extension);
        await writeFile(tempFile, buf);
        return tempFile;
      }
    } catch {
      // Try next format
    }
  }
  return null;
}

/**
 * Linux X11 xclip 方式读取剪贴板图片。
 *
 * 逆向: ON0() in amp-cli-reversed/chunk-004.js:32012
 */
async function readXclip(): Promise<string | null> {
  for (const fmt of IMAGE_FORMATS) {
    if (!fmt.mimeType) continue;
    try {
      const { stdout } = await execFileAsync(
        "xclip",
        ["-selection", "clipboard", "-t", fmt.mimeType, "-o"],
        { encoding: "buffer", maxBuffer: 52428800, timeout: 3000 } as Parameters<
          typeof execFileAsync
        >[2],
      );
      const buf = stdout as unknown as Buffer;
      if (buf.length > 0) {
        const tempFile = makeTempPath(fmt.extension);
        await writeFile(tempFile, buf);
        return tempFile;
      }
    } catch {
      // Try next format
    }
  }
  return null;
}

/**
 * Windows (native) PowerShell 方式读取剪贴板图片。
 *
 * 逆向: dN0() in amp-cli-reversed/chunk-004.js:32037
 */
async function readPowerShell(): Promise<string | null> {
  const windowsPath = await readPowerShellTempPath();
  if (!windowsPath) return null;
  try {
    const info = await stat(windowsPath);
    if (info.size > 0) {
      return windowsPath;
    }
    // Empty temp file
  } catch {
    // File not readable
  }
  try {
    await removePowerShellTempFile(windowsPath);
  } catch {}
  return null;
}

/**
 * WSL 方式读取剪贴板图片 (PowerShell + wslpath)。
 *
 * 逆向: EN0() in amp-cli-reversed/chunk-004.js:32058
 */
async function readWSL(): Promise<string | null> {
  const windowsPath = await readPowerShellTempPath();
  if (!windowsPath) return null;
  try {
    if (!(await commandExists("wslpath"))) {
      return null;
    }
    const unixPath = await wslpathToUnix(windowsPath);
    if (!unixPath) return null;
    const info = await stat(unixPath);
    if (info.size === 0) {
      return null;
    }
    const tempFile = makeTempPath("png");
    await copyFile(unixPath, tempFile);
    return tempFile;
  } catch {
    return null;
  } finally {
    await removePowerShellTempFile(windowsPath);
  }
}

/**
 * 根据平台和环境变量检测最佳剪贴板图片读取方法。
 *
 * 优先级:
 * 1. macOS → "osascript"
 * 2. win32 → "powershell"
 * 3. linux + WSL_DISTRO_NAME → "wsl"
 * 4. linux + WAYLAND_DISPLAY → "wl-paste"
 * 5. linux + DISPLAY → "xclip"
 * 6. 其他 → null
 *
 * 注意: 检测 WSL 优先于 Wayland/X11，因为 WSL 同样可能设置这些变量。
 *
 * @param platform - `process.platform` 值 (darwin / linux / win32 / ...)
 * @param env - 环境变量字典 (通常为 `process.env`)
 * @returns 最佳读取方法名称，或 null 表示不支持
 */
export function detectImageClipboardMethod(
  platform: string,
  env: Record<string, string | undefined>,
): ClipboardImageMethod | null {
  if (platform === "darwin") return "osascript";
  if (platform === "win32") return "powershell";
  if (platform === "linux") {
    // WSL takes priority over Wayland/X11
    if (env.WSL_DISTRO_NAME) return "wsl";
    if (env.WAYLAND_DISPLAY) return "wl-paste";
    if (env.DISPLAY) return "xclip";
  }
  return null;
}

/**
 * 从系统剪贴板读取图片，返回临时文件路径和 MIME 类型，或 null。
 *
 * 按平台分发到对应实现，失败则返回 null。
 * 调用方负责在使用完毕后删除临时文件。
 *
 * 逆向: VTR() in amp-cli-reversed/chunk-004.js:32086
 *
 * @returns `{ path: string; mimeType: string }` 或 null
 */
export async function readClipboardImage(): Promise<{ path: string; mimeType: string } | null> {
  const platform = process.platform;

  if (platform === "darwin") {
    const path = await readOsascript();
    if (path) return { path, mimeType: inferMimeType(path) };
    return null;
  }

  if (platform === "win32") {
    const path = await readPowerShell();
    if (path) return { path, mimeType: "image/png" };
    return null;
  }

  if (platform === "linux") {
    // WSL: check first — may also have WAYLAND_DISPLAY/DISPLAY set
    if (process.env.WSL_DISTRO_NAME) {
      const path = await readWSL();
      if (path !== null) return { path, mimeType: "image/png" };
    }

    const hasWlPaste = process.env.WAYLAND_DISPLAY && (await commandExists("wl-paste"));
    const hasXclip = process.env.DISPLAY && (await commandExists("xclip"));

    if (hasWlPaste) {
      const path = await readWlPaste();
      if (path !== null) return { path, mimeType: inferMimeType(path) };
    }

    if (hasXclip) {
      const path = await readXclip();
      if (path !== null) return { path, mimeType: inferMimeType(path) };
    }
  }

  return null;
}

/**
 * 从文件扩展名推断 MIME 类型。
 */
function inferMimeType(filePath: string): string {
  const ext = filePath.split(".").at(-1)?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    default:
      return "image/png";
  }
}
