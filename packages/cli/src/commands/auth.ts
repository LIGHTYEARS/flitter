/**
 * 认证命令处理器
 *
 * 处理 `flitter login` 和 `flitter logout` 命令。
 * login 支持多 Provider: API Key 直接输入 / OAuth 浏览器流程。
 * logout 清除指定 Provider 或所有凭据。
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

import type { SecretStorage } from "@flitter/flitter";
import {
  AnthropicOAuthProvider,
  GitHubCopilotOAuthProvider,
  getOAuthProviders,
  OpenAICodexOAuthProvider,
  registerOAuthProvider,
} from "@flitter/llm";
import {
  getApiKeyFromEnv,
  promptApiKey,
  promptProviderSelection,
  storeApiKey,
  validateApiKey,
} from "../auth/api-key";
import type { CliContext } from "../context";

let providersRegistered = false;

function ensureOAuthProviders(): void {
  if (providersRegistered) return;
  registerOAuthProvider(new AnthropicOAuthProvider());
  registerOAuthProvider(new OpenAICodexOAuthProvider());
  registerOAuthProvider(new GitHubCopilotOAuthProvider());
  providersRegistered = true;
}

export interface AuthCommandDeps {
  secrets: SecretStorage;
}

const AUTH_METHODS = [
  { id: "api-key", name: "API Key (直接输入)" },
  { id: "anthropic", name: "Anthropic (Claude Pro/Max OAuth)" },
  { id: "openai-codex", name: "OpenAI (ChatGPT Plus/Pro OAuth)" },
  { id: "github-copilot", name: "GitHub Copilot (Device Code)" },
] as const;

/**
 * 处理 login 命令
 *
 * 认证流程:
 * 1. 环境变量 FLITTER_API_KEY → 直接存储
 * 2. 交互式选择认证方式:
 *    a. API Key 直接输入 → 验证格式 → 存储
 *    b. OAuth Provider → 浏览器/设备码认证 → 存储 credentials
 *
 * @param deps - 认证所需的依赖服务
 * @param context - CLI 运行上下文
 */
export async function handleLogin(deps: AuthCommandDeps, context: CliContext): Promise<void> {
  const { secrets } = deps;
  ensureOAuthProviders();

  const envKey = getApiKeyFromEnv();
  if (envKey) {
    if (validateApiKey(envKey)) {
      await storeApiKey(secrets, "default", envKey);
      process.stderr.write("Logged in using FLITTER_API_KEY environment variable.\n");
      return;
    }
    process.stderr.write("Warning: FLITTER_API_KEY has invalid format, ignoring.\n");
  }

  if (!context.isTTY) {
    process.stderr.write("No API key found. Set FLITTER_API_KEY or run in a TTY terminal.\n");
    process.exitCode = 1;
    return;
  }

  const method = await promptProviderSelection(AUTH_METHODS);
  if (!method) {
    process.stderr.write("Login cancelled.\n");
    return;
  }

  if (method === "api-key") {
    const key = await promptApiKey();
    if (key) {
      await storeApiKey(secrets, "default", key);
      process.stderr.write("API key saved successfully.\n");
      return;
    }
    process.stderr.write("No key entered.\n");
    return;
  }

  const provider = getOAuthProviders().find((p) => p.id === method);
  if (!provider) {
    process.stderr.write(`Unknown auth method: ${method}\n`);
    process.exitCode = 1;
    return;
  }

  process.stderr.write(`Starting ${provider.name} authentication...\n`);
  try {
    const credentials = await provider.login({
      onAuth: (info) => {
        defaultOpenBrowser(info.url);
        process.stderr.write("Opening browser for authentication...\n");
        if (info.instructions) {
          process.stderr.write(`${info.instructions}\n`);
        }
        process.stderr.write(`If browser doesn't open, visit: ${info.url}\n`);
      },
      onPrompt: async (prompt) => {
        const { createInterface } = await import("node:readline/promises");
        const rl = createInterface({ input: process.stdin, output: process.stderr });
        try {
          const answer = await rl.question(`${prompt.message} `);
          return answer.trim();
        } finally {
          rl.close();
        }
      },
      onProgress: (msg) => {
        process.stderr.write(`${msg}\n`);
      },
      onManualCodeInput: async () => {
        const { createInterface } = await import("node:readline/promises");
        const rl = createInterface({ input: process.stdin, output: process.stderr });
        try {
          const code = await rl.question("Enter authorization code: ");
          return code.trim();
        } finally {
          rl.close();
        }
      },
    });

    await secrets.set("oauthCredentials", JSON.stringify(credentials), provider.id);
    const apiKey = provider.getApiKey(credentials);
    await storeApiKey(secrets, provider.id, apiKey);
    process.stderr.write(`${provider.name} authentication successful.\n`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Authentication failed: ${message}\n`);
    process.exitCode = 1;
  }
}

/**
 * 处理 logout 命令
 *
 * 清除所有已存储的凭据 (API Key + OAuth tokens)。
 */
export async function handleLogout(deps: AuthCommandDeps, _context: CliContext): Promise<void> {
  const { secrets } = deps;
  ensureOAuthProviders();

  await secrets.delete("apiKey", "default");
  const providers = getOAuthProviders();
  for (const provider of providers) {
    await secrets.delete("oauthCredentials", provider.id);
    await secrets.delete("apiKey", provider.id);
  }
  process.stderr.write("Logged out. All credentials have been removed.\n");
}

async function defaultOpenBrowser(url: string): Promise<void> {
  const { execFile } = await import("node:child_process");
  const cmd =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";

  if (process.platform === "win32") {
    execFile(cmd, ["/c", "start", "", url]);
  } else {
    execFile(cmd, [url]);
  }
}
