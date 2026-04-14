/**
 * 版本检测模块
 *
 * 提供语义版本比较、SHA-256 哈希计算、安装方式检测、
 * 以及远程版本检查功能。
 *
 * 逆向参考: FVT/zVT in process-runner.js (~2600-2800)
 *
 * @example
 * ```typescript
 * import { checkForUpdate, compareVersions, computeSHA256 } from "./checker";
 *
 * const info = await checkForUpdate("1.0.0");
 * if (info) {
 *   console.log(`新版本 ${info.version} 可用`);
 * }
 * ```
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

/**
 * 更新信息
 *
 * 从版本检查端点返回的最新版本信息。
 */
export interface UpdateInfo {
  /** 最新版本号 */
  version: string;
  /** 二进制下载 URL */
  downloadUrl: string;
  /** 二进制文件的 SHA-256 校验和 (十六进制) */
  sha256: string;
  /** 版本发布说明 */
  releaseNotes: string;
}

/**
 * 安装方式
 *
 * 检测当前 CLI 的安装方式,决定更新策略。
 */
export type InstallMethod = "binary" | "npm" | "pnpm" | "bun" | "brew";

/**
 * 比较两个语义版本号
 *
 * 支持 "v" 前缀 (如 "v1.0.0") 和不等长版本号 (如 "1.0" vs "1.0.0")。
 * 按主版本 → 次版本 → 修订版本的顺序依次比较。
 *
 * 逆向参考: process-runner.js 版本比较逻辑
 *
 * @param a - 第一个版本号
 * @param b - 第二个版本号
 * @returns -1 (a < b), 0 (a === b), 1 (a > b)
 *
 * @example
 * ```typescript
 * compareVersions("1.0.0", "1.0.1"); // -1
 * compareVersions("2.0.0", "1.9.9"); // 1
 * compareVersions("v1.0", "1.0.0");  // 0
 * ```
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const pa = a.replace(/^v/, "").split(".").map(Number);
  const pb = b.replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
}

/**
 * 计算文件的 SHA-256 哈希
 *
 * 读取整个文件内容并计算 SHA-256 校验和。
 * 用于二进制更新文件的完整性验证。
 *
 * @param filePath - 要计算哈希的文件路径
 * @returns 十六进制编码的 SHA-256 哈希字符串 (64 字符)
 *
 * @example
 * ```typescript
 * const hash = await computeSHA256("/path/to/binary");
 * console.log(hash); // "a948904f2f0f479b..."
 * ```
 */
export async function computeSHA256(filePath: string): Promise<string> {
  const data = await readFile(filePath);
  return createHash("sha256").update(data).digest("hex");
}

/**
 * 检测当前 CLI 的安装方式
 *
 * 根据 process.execPath 和环境变量判断安装方式:
 * - bun: execPath 包含 "/.bun/"
 * - brew: execPath 包含 "/homebrew/" 或 "/Cellar/"
 * - npm: execPath 在 npm_config_prefix 目录下
 * - binary: 以上均不匹配时的默认值
 *
 * 逆向参考: process-runner.js 安装方式检测
 *
 * @returns 安装方式标识
 *
 * @example
 * ```typescript
 * const method = detectInstallMethod();
 * if (method === "binary") {
 *   // CDN 下载更新
 * } else {
 *   // 使用包管理器更新
 * }
 * ```
 */
export function detectInstallMethod(): InstallMethod {
  const execPath = process.execPath;
  if (execPath.includes("/.bun/")) return "bun";
  if (execPath.includes("/homebrew/") || execPath.includes("/Cellar/")) return "brew";
  // 检查全局 npm/pnpm 路径
  const npmGlobal = process.env.npm_config_prefix;
  if (npmGlobal && execPath.startsWith(npmGlobal)) return "npm";
  return "binary";
}

/**
 * 检查是否有新版本可用
 *
 * 向版本检查端点发送 HTTP GET 请求,返回最新版本信息。
 * 如果当前版本已是最新或更新被禁用,返回 null。
 *
 * 逆向参考: FVT/zVT in process-runner.js (~2600-2800)
 *
 * @param currentVersion - 当前版本号
 * @param opts - 可选配置
 * @param opts.checkUrl - 自定义版本检查端点 URL
 * @param opts.updateMode - 更新模式 ("auto" | "warn" | "disabled")
 * @returns 更新信息对象,或 null (无更新/已禁用)
 *
 * @example
 * ```typescript
 * const info = await checkForUpdate("1.0.0");
 * if (info) {
 *   console.log(`${info.version} 可用: ${info.releaseNotes}`);
 * }
 * ```
 */
export async function checkForUpdate(
  currentVersion: string,
  opts?: { checkUrl?: string; updateMode?: string },
): Promise<UpdateInfo | null> {
  if (opts?.updateMode === "disabled") return null;

  const url = opts?.checkUrl ?? process.env.FLITTER_UPDATE_URL;
  if (!url) return null;

  try {
    const resp = await fetch(url, {
      headers: { "X-Current-Version": currentVersion },
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return null;

    const info = (await resp.json()) as UpdateInfo;
    if (compareVersions(currentVersion, info.version) >= 0) return null;

    return info;
  } catch {
    return null;
  }
}
