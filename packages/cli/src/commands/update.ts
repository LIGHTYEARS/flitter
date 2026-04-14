/**
 * 自动更新命令处理器
 *
 * 处理 `flitter update` 命令: 检查新版本、下载二进制、SHA-256 校验、原子替换。
 * 支持 CDN 二进制下载和 npm/pnpm 包管理器 fallback。
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

/**
 * 服务容器接口 (update 命令所需的最小子集)
 *
 * 实际类型定义在 @flitter/flitter 的 container.ts
 */
export interface UpdateCommandDeps {
  /** 更新服务 (由 Plan 11-05 实现) */
  updateService?: {
    checkForUpdate(): Promise<{ available: boolean; version?: string }>;
    performUpdate(targetVersion?: string): Promise<void>;
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
 * 具体更新逻辑 (版本检测 + CDN 下载 + SHA-256 + 原子替换) 将在 Plan 11-05 中实现。
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
  // TODO: Plan 11-05 实现自动更新流程
  void deps;
  void context;
  void options;
}
