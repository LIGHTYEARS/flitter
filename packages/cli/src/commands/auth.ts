/**
 * 认证命令处理器
 *
 * 处理 `flitter login` 和 `flitter logout` 命令。
 * login 优先级: 环境变量 FLITTER_API_KEY > 交互式 API Key 输入 > OAuth PKCE 流程。
 * logout 清除本地存储的所有凭据。
 *
 * 逆向参考: eF0() (login) / tF0() (logout) in cli-entrypoint.js:1032-1052
 *
 * @example
 * ```typescript
 * import { handleLogin, handleLogout } from "./auth";
 *
 * // 在 Commander action 中调用
 * program.command("login").action(() => handleLogin(deps, context));
 * program.command("logout").action(() => handleLogout(deps, context));
 * ```
 */
import type { CliContext } from "../context";
import type { SecretStorage } from "@flitter/flitter";
import {
  getApiKeyFromEnv,
  validateApiKey,
  storeApiKey,
  promptApiKey,
} from "../auth/api-key";
import { performOAuth } from "../auth/oauth";

/**
 * 服务容器接口 (login/logout 所需的最小子集)
 *
 * 实际类型定义在 @flitter/flitter 的 container.ts
 */
export interface AuthCommandDeps {
  /** 秘密存储服务 */
  secrets: SecretStorage;
  /** API 服务器 URL */
  ampURL: string;
}

/**
 * 处理 login 命令
 *
 * 认证优先级 (逆向 eF0):
 * 1. 环境变量 FLITTER_API_KEY → 直接存储
 * 2. 交互式 API Key 输入 → 验证格式 → 存储
 * 3. OAuth PKCE 浏览器流程 → 存储 token
 *
 * @param deps - 认证所需的依赖服务
 * @param context - CLI 运行上下文
 */
export async function handleLogin(
  deps: AuthCommandDeps,
  context: CliContext,
): Promise<void> {
  const { secrets, ampURL } = deps;

  // 1. 检查环境变量
  const envKey = getApiKeyFromEnv();
  if (envKey) {
    if (validateApiKey(envKey)) {
      await storeApiKey(secrets, ampURL, envKey);
      process.stderr.write("Logged in using FLITTER_API_KEY environment variable.\n");
      return;
    }
    process.stderr.write("Warning: FLITTER_API_KEY has invalid format, ignoring.\n");
  }

  // 2. 交互式输入 (仅 TTY 模式)
  if (context.isTTY) {
    const key = await promptApiKey();
    if (key) {
      if (validateApiKey(key)) {
        await storeApiKey(secrets, ampURL, key);
        process.stderr.write("API key saved successfully.\n");
        return;
      }
      process.stderr.write("Invalid API key format. Expected 'sk-' or 'flitter-' prefix.\n");
    }
  }

  // 3. OAuth PKCE 流程
  process.stderr.write("Starting OAuth authentication...\n");
  const result = await performOAuth(ampURL);
  if (result.success && result.token) {
    await secrets.set("oauthToken", result.token, ampURL);
    process.stderr.write("OAuth authentication successful.\n");
  } else {
    process.stderr.write(`Authentication failed: ${result.error ?? "unknown error"}\n`);
    process.exitCode = 1;
  }
}

/**
 * 处理 logout 命令
 *
 * 清除所有已存储的凭据 (API Key + OAuth tokens)。
 * 逆向参考: tF0() in cli-entrypoint.js:~1052
 *
 * @param deps - 认证所需的依赖服务
 * @param context - CLI 运行上下文
 */
export async function handleLogout(
  deps: AuthCommandDeps,
  context: CliContext,
): Promise<void> {
  const { secrets, ampURL } = deps;
  void context;

  // 删除所有认证凭据
  await secrets.delete("apiKey", ampURL);
  await secrets.delete("oauthToken", ampURL);
  process.stderr.write("Logged out. All credentials have been removed.\n");
}
