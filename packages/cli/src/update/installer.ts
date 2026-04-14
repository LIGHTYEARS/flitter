/**
 * 更新安装模块
 *
 * 提供二进制下载 + SHA-256 校验 + 原子文件替换功能,
 * 以及通过包管理器 (npm/pnpm/bun/brew) 安装更新。
 *
 * 安装流程: 下载到临时文件 → SHA-256 校验 → chmod +x → 原子 rename 替换
 * SHA-256 校验失败时抛出 UpdateVerificationError,不执行替换。
 *
 * 逆向参考: qVT in process-runner.js (~2800)
 *
 * @example
 * ```typescript
 * import { installBinaryUpdate, installWithPackageManager } from "./installer";
 *
 * // 二进制模式
 * await installBinaryUpdate(info, {
 *   onProgress: (downloaded, total) => {
 *     console.log(`${downloaded}/${total}`);
 *   },
 * });
 *
 * // 包管理器模式
 * await installWithPackageManager("npm", "2.0.0");
 * ```
 */
import { createWriteStream } from "node:fs";
import { rename, chmod, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { computeSHA256 } from "./checker";
import type { UpdateInfo, InstallMethod } from "./checker";

const execFileAsync = promisify(execFile);

/**
 * SHA-256 校验失败错误
 *
 * 当下载文件的哈希与预期不匹配时抛出。
 * 包含预期和实际的哈希值用于调试。
 */
export class UpdateVerificationError extends Error {
  constructor(expected: string, actual: string) {
    super(`SHA-256 verification failed: expected ${expected}, got ${actual}`);
    this.name = "UpdateVerificationError";
  }
}

/**
 * 安装选项
 */
export interface InstallOptions {
  /** 下载进度回调 */
  onProgress?: (downloaded: number, total: number) => void;
  /** 目标文件路径 (默认 process.execPath) */
  targetPath?: string;
}

/**
 * 下载并安装二进制更新
 *
 * 完整流程:
 * 1. 下载到临时文件 (支持进度回调)
 * 2. SHA-256 校验 (失败则删除临时文件并抛错)
 * 3. 设置执行权限 (chmod +x)
 * 4. 原子替换 (rename 覆盖目标路径)
 *
 * 逆向参考: qVT in process-runner.js (~2800)
 *
 * @param info - 更新信息 (版本号、下载 URL、SHA-256)
 * @param opts - 安装选项 (进度回调、目标路径)
 * @throws {UpdateVerificationError} SHA-256 校验失败
 * @throws {Error} 下载失败 (非 2xx 状态码)
 *
 * @example
 * ```typescript
 * await installBinaryUpdate(info, {
 *   targetPath: "/usr/local/bin/flitter",
 *   onProgress: (dl, total) => bar.update(dl / total),
 * });
 * ```
 */
export async function installBinaryUpdate(
  info: UpdateInfo,
  opts?: InstallOptions,
): Promise<void> {
  const targetPath = opts?.targetPath ?? process.execPath;
  const tempPath = join(tmpdir(), `flitter-update-${Date.now()}`);

  try {
    // 1. 下载到临时文件
    const resp = await fetch(info.downloadUrl);
    if (!resp.ok || !resp.body) throw new Error(`Download failed: ${resp.status}`);

    const total = Number(resp.headers.get("content-length") || 0);
    let downloaded = 0;
    const writer = createWriteStream(tempPath);

    const reader = resp.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      writer.write(value);
      downloaded += value.byteLength;
      opts?.onProgress?.(downloaded, total);
    }
    writer.end();
    await new Promise<void>((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    // 2. SHA-256 校验
    const actual = await computeSHA256(tempPath);
    if (actual !== info.sha256) {
      throw new UpdateVerificationError(info.sha256, actual);
    }

    // 3. 设置执行权限
    await chmod(tempPath, 0o755);

    // 4. 原子替换
    await rename(tempPath, targetPath);
  } catch (err) {
    // 清理临时文件
    await unlink(tempPath).catch(() => {});
    throw err;
  }
}

/**
 * 使用包管理器安装更新
 *
 * 根据安装方式调用对应的包管理器全局安装命令:
 * - npm: npm install -g @flitter/cli@{version}
 * - pnpm: pnpm install -g @flitter/cli@{version}
 * - bun: bun install -g @flitter/cli@{version}
 * - brew: brew upgrade flitter
 *
 * @param method - 安装方式 (npm/pnpm/bun/brew)
 * @param version - 目标版本号 (不指定则安装 latest)
 * @throws {Error} 不支持的安装方式
 *
 * @example
 * ```typescript
 * await installWithPackageManager("npm", "2.0.0");
 * ```
 */
export async function installWithPackageManager(
  method: InstallMethod,
  version?: string,
): Promise<void> {
  const pkg = version ? `@flitter/cli@${version}` : "@flitter/cli@latest";

  switch (method) {
    case "npm":
      await execFileAsync("npm", ["install", "-g", pkg]);
      break;
    case "pnpm":
      await execFileAsync("pnpm", ["install", "-g", pkg]);
      break;
    case "bun":
      await execFileAsync("bun", ["install", "-g", pkg]);
      break;
    case "brew":
      await execFileAsync("brew", ["upgrade", "flitter"]);
      break;
    default:
      throw new Error(`Unsupported install method: ${method as string}`);
  }
}
