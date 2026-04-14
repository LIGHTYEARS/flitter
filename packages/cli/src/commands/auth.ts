/**
 * 认证命令处理器
 *
 * 处理 `flitter login` 和 `flitter logout` 命令。
 * login 触发 API Key 输入或 OAuth PKCE 浏览器流程。
 * logout 清除本地存储的所有凭据。
 *
 * 逆向参考: eF0() (login) / tF0() (logout) in cli-entrypoint.js:1032-1052
 *
 * @example
 * ```typescript
 * import { handleLogin, handleLogout } from "./auth";
 *
 * // 在 Commander action 中调用
 * program.command("login").action(() => handleLogin(container, context));
 * program.command("logout").action(() => handleLogout(container, context));
 * ```
 */
import type { CliContext } from "../context";

/**
 * 服务容器接口 (login/logout 所需的最小子集)
 *
 * 实际类型定义在 @flitter/flitter 的 container.ts
 */
export interface AuthCommandDeps {
  /** 凭据管理服务 */
  keyring?: {
    deleteCredential(key: string): Promise<void>;
  };
}

/**
 * 处理 login 命令
 *
 * 具体认证流程 (API Key / OAuth) 将在 Plan 11-04 中实现。
 *
 * @param deps - 认证所需的依赖服务
 * @param context - CLI 运行上下文
 */
export async function handleLogin(
  deps: AuthCommandDeps,
  context: CliContext,
): Promise<void> {
  // TODO: Plan 11-04 实现 API Key 输入 + OAuth PKCE 流程
  void deps;
  void context;
}

/**
 * 处理 logout 命令
 *
 * 清除所有已存储的凭据 (API Key + OAuth tokens)。
 *
 * @param deps - 认证所需的依赖服务
 * @param context - CLI 运行上下文
 */
export async function handleLogout(
  deps: AuthCommandDeps,
  context: CliContext,
): Promise<void> {
  // TODO: Plan 11-04 实现凭据清除
  void deps;
  void context;
}
