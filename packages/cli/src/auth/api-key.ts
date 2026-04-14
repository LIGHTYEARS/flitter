/**
 * API Key 认证模块
 *
 * 提供 API Key 验证、环境变量读取、交互式输入、存储与检查功能。
 * 支持标准前缀 ('sk-', 'flitter-') 和非标准 key (如 ARK 端点 key)。
 *
 * 逆向参考: zz0 (交互式登录提示) in claude-config-system.js:~1140
 *
 * @example
 * ```ts
 * import { validateApiKey, getApiKeyFromEnv, hasApiKey, storeApiKey } from "./api-key";
 *
 * // 验证格式
 * validateApiKey("sk-abc123"); // true
 * validateApiKey("any-non-empty"); // true (放宽验证)
 *
 * // 环境变量
 * const envKey = getApiKeyFromEnv(); // process.env.FLITTER_API_KEY
 *
 * // 存储与检查 (按 providerId 分存)
 * await storeApiKey(secrets, "default", "sk-abc123");
 * await hasApiKey(secrets, "default"); // true
 * ```
 */

import { createInterface } from "node:readline/promises";
import type { SecretStorage } from "@flitter/flitter";

/**
 * 检查是否已有存储的 API Key
 *
 * @param secrets - 秘密存储接口
 * @param providerId - Provider 标识 (如 "default", "anthropic", "openai-codex")
 * @returns 是否已存储 API Key
 */
export async function hasApiKey(secrets: SecretStorage, providerId: string): Promise<boolean> {
  const key = await secrets.get("apiKey", providerId);
  return Boolean(key);
}

/**
 * 验证 API Key 格式
 *
 * 规则:
 * - 非空字符串 (去除首尾空白后) 即视为有效
 * - 放宽验证: 允许非标准前缀的 key (如 ARK 端点 key)
 *
 * @param key - 待验证的 API Key
 * @returns 是否为有效格式 (非空即有效)
 */
export function validateApiKey(key: string): boolean {
  if (!key || key.trim().length === 0) return false;
  return true;
}

/**
 * 从环境变量获取 API Key
 *
 * 读取 FLITTER_API_KEY 环境变量。优先级最高的认证方式。
 *
 * @returns API Key 字符串, 未设置时返回 undefined
 */
export function getApiKeyFromEnv(): string | undefined {
  return process.env.FLITTER_API_KEY;
}

/**
 * 交互式提示用户输入 API Key
 *
 * 通过 readline 在 stderr 上提示, 读取用户输入并返回 trim 后的值。
 * 逆向参考: zz0 (claude-config-system.js:~1140)
 *
 * @returns 用户输入的 API Key, 空输入返回 undefined
 */
export async function promptApiKey(): Promise<string | undefined> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try {
    const key = await rl.question("Enter your API key: ");
    return key.trim() || undefined;
  } finally {
    rl.close();
  }
}

/**
 * 交互式选择认证方式
 *
 * @param methods - 可选的认证方式列表
 * @returns 选择的 method id, 空输入返回 undefined
 */
export async function promptProviderSelection(
  methods: ReadonlyArray<{ id: string; name: string }>,
): Promise<string | undefined> {
  process.stderr.write("\nSelect authentication method:\n");
  methods.forEach((m, i) => {
    process.stderr.write(`  ${i + 1}. ${m.name}\n`);
  });
  process.stderr.write("\n");

  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try {
    const answer = await rl.question("Enter number (or press Enter to cancel): ");
    const idx = parseInt(answer.trim(), 10) - 1;
    if (idx >= 0 && idx < methods.length) {
      return methods[idx].id;
    }
    return undefined;
  } finally {
    rl.close();
  }
}

/**
 * 存储 API Key 到秘密存储
 *
 * 按 providerId 分存, 不同 provider 的 key 互不干扰。
 *
 * @param secrets - 秘密存储接口
 * @param providerId - Provider 标识 (如 "default", "anthropic")
 * @param key - 要存储的 API Key
 */
export async function storeApiKey(
  secrets: SecretStorage,
  providerId: string,
  key: string,
): Promise<void> {
  await secrets.set("apiKey", key, providerId);
}
