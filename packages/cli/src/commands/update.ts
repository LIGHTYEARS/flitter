/**
 * 自动更新命令处理器
 *
 * 处理 `flitter update` 命令: 检查新版本、下载二进制、SHA-256 校验、原子替换。
 * 支持 CDN 二进制下载和 npm/pnpm/bun/brew 包管理器 fallback。
 *
 * 逆向参考: mm0() in process-runner.js:2938-2988
 *
 * @example
 * ```typescript
 * import { handleUpdate } from "./update";
 *
 * program.command("update").action((opts) =>
 *   handleUpdate(container, context, opts)
 * );
 * ```
 */
import type { CliContext } from "../context";
import {
  checkForUpdate,
  detectInstallMethod,
  type UpdateInfo,
  type InstallMethod,
} from "../update/checker";
import {
  installBinaryUpdate,
  installWithPackageManager,
} from "../update/installer";

/**
 * 服务容器接口 (update 命令所需的最小子集)
 *
 * 实际类型定义在 @flitter/flitter 的 container.ts
 */
export interface UpdateCommandDeps {
  /** 配置服务 — 提供更新设置 */
  configService?: {
    get(): Record<string, unknown>;
  };
}

/** update 命令选项 */
export interface UpdateOptions {
  /** 指定安装的目标版本 */
  targetVersion?: string;
}

/**
 * 处理 update 命令
 *
 * 完整流程:
 * 1. 检测安装方式 (binary/npm/pnpm/bun/brew)
 * 2. 检查远程是否有新版本
 * 3. 根据安装方式选择更新策略
 * 4. 执行更新 (CDN 下载 + SHA-256 校验 + 原子替换, 或包管理器)
 *
 * 逆向参考: mm0() in process-runner.js:2938-2988
 *
 * @param deps - 更新所需的依赖服务
 * @param context - CLI 运行上下文
 * @param options - 命令选项 (targetVersion)
 */
export async function handleUpdate(
  deps: UpdateCommandDeps,
  context: CliContext,
  options: UpdateOptions,
): Promise<void> {
  // 获取更新模式设置
  const config = deps.configService?.get() ?? {};
  const updateMode = (config as Record<string, unknown>)["updates.mode"] as string | undefined;

  // 获取当前版本 (从 package.json 或环境变量)
  const currentVersion = process.env.FLITTER_VERSION ?? "0.0.0";

  // 检测安装方式
  const method = detectInstallMethod();

  if (context.verbose) {
    process.stderr.write(`Install method: ${method}\n`);
    process.stderr.write(`Current version: ${currentVersion}\n`);
  }

  // 检查是否有新版本
  const info = await checkForUpdate(currentVersion, { updateMode });
  if (!info) {
    process.stderr.write("Already up to date.\n");
    return;
  }

  process.stderr.write(`New version available: ${info.version}\n`);
  if (info.releaseNotes) {
    process.stderr.write(`Release notes: ${info.releaseNotes}\n`);
  }

  // 根据安装方式选择更新策略
  if (method === "binary") {
    process.stderr.write("Downloading update...\n");
    await installBinaryUpdate(info, {
      onProgress: (downloaded, total) => {
        if (total > 0) {
          const pct = Math.round((downloaded / total) * 100);
          process.stderr.write(`\rProgress: ${pct}%`);
        }
      },
    });
    process.stderr.write("\nUpdate installed successfully.\n");
  } else {
    process.stderr.write(`Updating via ${method}...\n`);
    await installWithPackageManager(method, options.targetVersion ?? info.version);
    process.stderr.write("Update installed successfully.\n");
  }
}
