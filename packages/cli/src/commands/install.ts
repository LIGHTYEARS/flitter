/**
 * install 命令处理器 — 安装 ripgrep 到 $FLITTER_HOME/bin
 *
 * 隐藏命令，供 flitter 初始化脚本调用。
 * 从 amp-public-assets GCS bucket 下载 ripgrep 二进制，
 * 校验 SHA-256 后安装到目标目录。
 *
 * 逆向参考:
 *   - 0473_unknown__m0.js  — install 命令注册 (hidden, force/verbose options)
 *   - 0437_unknown_gb0.js  — gb0() 主安装流程
 *   - 0433_unknown_kb0.js  — kb0() ripgrep 安装逻辑
 *   - 0432_unknown_Pb0.js  — Pb0() 解析 AMP_HOME / FLITTER_HOME
 *   - 1288_unknown_KHR.js  — KHR() 下载 + SHA-256 校验 + 原子写入
 *   - 1289_unknown_XHR.js  — XHR() 平台/架构 → ripgrep target triple
 *   - 1287_unknown_faT.js  — faT() ripgrepExecutable() 优先级查找
 *
 * 与 amp 的关键差异:
 *   - 使用 FLITTER_HOME 代替 AMP_HOME
 *   - 默认目录为 ~/.config/flitter，而非 ~/.amp
 *   - 不处理 installLocalBin / checkVersion (amp 的 postinstall 步骤，flitter 不需要)
 *   - GCS 路径复用 amp 的公共 CDN (ripgrep 二进制共享)
 *
 * @example
 * ```bash
 * flitter install             # 安装 ripgrep (跳过已有)
 * flitter install --force     # 强制重装
 * flitter install --verbose   # 显示进度
 * ```
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { chmod, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { createLogger } from "@flitter/util";

const log = createLogger("install");

// 逆向: HU = "rg" (the ripgrep executable name on unix; amp uses "rg")
const RG_EXECUTABLE = process.platform === "win32" ? "rg.exe" : "rg";

// 逆向: GCS base URL for ripgrep binaries (1288_unknown_KHR.js:14)
const RIPGREP_CDN_BASE =
  "https://storage.googleapis.com/amp-public-assets-prod-0/ripgrep/ripgrep-binaries";

/**
 * install 命令依赖 (最小化; 无需 ServiceContainer)
 */
export type InstallCommandDeps = {};

/** install 命令选项 */
export interface InstallOptions {
  /** 强制重装即使已存在 */
  force?: boolean;
  /** 显示安装进度 */
  verbose?: boolean;
}

/**
 * 处理 `flitter install` 命令
 *
 * 逆向: gb0(force, verbose, version) in 0437_unknown_gb0.js
 * 简化版: 只安装 ripgrep (无 installLocalBin / checkVersion)
 */
export async function handleInstall(
  _deps: InstallCommandDeps,
  options: InstallOptions,
): Promise<void> {
  const force = options.force ?? false;
  const verbose = options.verbose ?? false;

  // 逆向: Pb0() in 0432_unknown_Pb0.js — 解析目标目录
  const targetDir = resolveRipgrepTargetDir();

  if (verbose) {
    process.stdout.write(`[INFO] Target directory: ${targetDir}\n`);
  }

  // 逆向: kb0(targetDir, force, verbose) in 0433_unknown_kb0.js
  const ok = await installRipgrep(targetDir, force, verbose);

  if (ok) {
    if (verbose) {
      process.stdout.write("\u2713 ripgrep installed successfully\n");
    }
  } else {
    process.stdout.write("\u2717 Failed to install ripgrep\n");
    process.exitCode = 1;
  }
}

/**
 * 解析 ripgrep 安装目录
 *
 * 逆向: Pb0() in 0432_unknown_Pb0.js
 *   - AMP_HOME env → $AMP_HOME/bin
 *   - default → ~/.amp/bin
 * Flitter 映射:
 *   - FLITTER_HOME env → $FLITTER_HOME/bin
 *   - default → ~/.config/flitter/bin
 */
export function resolveRipgrepTargetDir(): string {
  const flitterHome = process.env.FLITTER_HOME;
  if (flitterHome) {
    return path.join(flitterHome, "bin");
  }
  // 逆向: Jb0() in 0453_unknown_Jb0.js — fallback to homedir/.amp
  // Flitter: use XDG-style ~/.config/flitter/bin
  return path.join(os.homedir(), ".config", "flitter", "bin");
}

/**
 * 解析当前平台/架构对应的 ripgrep target triple
 *
 * 逆向: XHR() in 1289_unknown_XHR.js
 * 完整映射: darwin arm64/x64, win32 x64/arm64/ia32, linux x64/arm/arm64/ppc64/riscv64/s390x
 */
export function getRipgrepTargetTriple(): string {
  // 逆向: process.env.npm_config_arch || iz.arch()
  const arch = process.env.npm_config_arch ?? os.arch();
  const platform = os.platform();

  switch (platform) {
    case "darwin":
      return arch === "arm64" ? "aarch64-apple-darwin" : "x86_64-apple-darwin";
    case "win32":
      if (arch === "x64") return "x86_64-pc-windows-msvc";
      if (arch === "arm64") return "aarch64-pc-windows-msvc";
      return "i686-pc-windows-msvc";
    case "linux":
      if (arch === "x64") return "x86_64-unknown-linux-musl";
      if (arch === "arm") return "arm-unknown-linux-gnueabihf";
      if (arch === "armv7l") return "arm-unknown-linux-gnueabihf";
      if (arch === "arm64") return "aarch64-unknown-linux-musl";
      if (arch === "ppc64") return "powerpc64le-unknown-linux-gnu";
      if (arch === "riscv64") return "riscv64gc-unknown-linux-gnu";
      if (arch === "s390x") return "s390x-unknown-linux-gnu";
      return "i686-unknown-linux-musl";
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * 安装 ripgrep 到目标目录
 *
 * 逆向: kb0(targetDir, force, verbose) in 0433_unknown_kb0.js
 *   1. mkdir -p targetDir
 *   2. GHR(targetDir, force) → 检查已有 / 触发 N5T(path)
 *
 * @returns true = 成功, false = 失败
 */
export async function installRipgrep(
  targetDir: string,
  force: boolean,
  verbose: boolean,
): Promise<boolean> {
  // 逆向: lb0(T, { recursive: true }) in 0433_unknown_kb0.js:2
  await mkdir(targetDir, { recursive: true });

  const rgPath = path.join(targetDir, RG_EXECUTABLE);

  // 逆向: GHR(T, R) in 1288_unknown_KHR.js:5-10
  //   if (!force && existsSync(rgPath)) return path (already installed)
  if (!force && existsSync(rgPath)) {
    log.info("ripgrep already installed", { path: rgPath });
    if (verbose) {
      process.stdout.write(`[INFO] ripgrep already installed at ${rgPath}\n`);
    }
    return true;
  }

  // 逆向: N5T(path) = downloadRipgrepWithRetry(path) in 2026_tail_anonymous.js:138960-138978
  //   Retries 3 times with exponential backoff (500ms * 2^(attempt-1))
  const result = await downloadRipgrepWithRetry(rgPath, verbose);
  return result !== undefined;
}

/**
 * 带重试的 ripgrep 下载
 *
 * 逆向: N5T = zHR(async T => { ... retry loop ... }) in 2026_tail_anonymous.js:138960
 *   - 最多 3 次重试
 *   - 指数退避: 500ms * 2^(attempt-1)
 *
 * @returns 安装路径, 或 undefined (全部失败)
 */
async function downloadRipgrepWithRetry(
  rgPath: string,
  verbose: boolean,
): Promise<string | undefined> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await downloadRipgrep(rgPath, verbose);
      log.info("ripgrep binary downloaded successfully", { path: rgPath });
      return rgPath;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt === maxAttempts) {
        log.error("ripgrep download failed after all attempts", { error: msg });
        return undefined;
      }
      // 逆向: 500 * 2^(attempt-1) backoff
      log.warn(`ripgrep download attempt ${attempt}/${maxAttempts} failed: ${msg}`);
      if (verbose) {
        process.stdout.write(`[WARN] Download attempt ${attempt}/${maxAttempts} failed: ${msg}\n`);
      }
      await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 1)));
    }
  }

  return undefined;
}

/**
 * 下载 ripgrep 二进制，校验 SHA-256，原子写入目标路径
 *
 * 逆向: KHR(T) in 1288_unknown_KHR.js
 *   1. 确定 CDN base URL: RIPGREP_CDN_BASE/{triple}/{basename}
 *   2. 下载 .sha256 校验文件
 *   3. 下载二进制 → 写入临时文件 (T.{pid}.{now}.tmp)
 *   4. 计算 SHA-256 → 对比校验和
 *   5. chmod 755 (0o755 = 493)
 *   6. rename 临时文件到目标 (原子替换, EEXIST 视为成功)
 *   7. finally: 清理临时文件
 */
export async function downloadRipgrep(rgPath: string, verbose: boolean = false): Promise<void> {
  // 逆向: rw.basename(T) → binary name (e.g., "rg" or "rg-aarch64-apple-darwin")
  // amp stores plain "rg" in bin/rg; the CDN path uses the triple subfolder
  const triple = getRipgrepTargetTriple();
  const basename = RG_EXECUTABLE;
  const cdnBase = `${RIPGREP_CDN_BASE}/${triple}`;
  const binUrl = `${cdnBase}/${basename}`;
  const checksumUrl = `${cdnBase}/${basename}.sha256`;

  if (verbose) {
    process.stdout.write(`[INFO] Downloading ripgrep from ${binUrl}\n`);
  }

  // 逆向: fetch(checksumUrl) → text → split whitespace → [0]
  const checksumResp = await fetch(checksumUrl);
  if (!checksumResp.ok) {
    throw new Error(
      `failed to download ripgrep checksum: ${checksumResp.status} ${checksumResp.statusText}`,
    );
  }
  const expectedChecksum = (await checksumResp.text()).trim().split(/\s+/)[0]!;

  // 逆向: fetch(binUrl) → stream write to tmp file
  const binResp = await fetch(binUrl);
  if (!binResp.ok || !binResp.body) {
    const body = await binResp.text().catch(() => "");
    throw new Error(
      `failed to download ripgrep binary: ${binResp.status} ${binResp.statusText}\n${body}`,
    );
  }

  // 逆向: tmpPath = T + "." + process.pid + "." + Date.now() + ".tmp"
  const tmpPath = `${rgPath}.${process.pid}.${Date.now()}.tmp`;

  try {
    // 逆向: mkdir(dirname(T), { recursive: true })
    await mkdir(path.dirname(rgPath), { recursive: true });

    // 逆向: createWriteStream(tmpPath), pipeline(Readable.fromWeb(body), stream)
    const readable = Readable.fromWeb(binResp.body as import("stream/web").ReadableStream);
    const chunks: Buffer[] = [];
    for await (const chunk of readable) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
    }
    const content = Buffer.concat(chunks);
    await writeFile(tmpPath, content);

    // 逆向: VHR(tmpPath) = sha256 checksum of file
    const actualChecksum = createHash("sha256")
      .update(await readFile(tmpPath))
      .digest("hex");

    if (actualChecksum !== expectedChecksum) {
      throw new Error(
        `ripgrep checksum validation failed: expected ${expectedChecksum}, got ${actualChecksum}`,
      );
    }

    // 逆向: DHR(tmpPath, 493) = chmod(tmpPath, 0o755)
    await chmod(tmpPath, 0o755);

    // 逆向: NHR(tmpPath, T) = rename(tmpPath, T); EEXIST → treat as success
    try {
      await rename(tmpPath, rgPath);
    } catch (err) {
      if (
        err instanceof Error &&
        "code" in err &&
        (err as NodeJS.ErrnoException).code === "EEXIST"
      ) {
        // Another process installed it concurrently — that's fine
        return;
      }
      throw err;
    }
  } finally {
    // 逆向: UHR(tmpPath).catch(() => {}) = unlink(tmpPath, silent)
    await unlink(tmpPath).catch(() => {});
  }
}
