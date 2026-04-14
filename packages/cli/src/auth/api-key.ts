/**
 * API Key 认证模块
 *
 * 提供 API Key 验证、环境变量读取、交互式输入、存储与检查功能。
 * 支持 'sk-' 和 'flitter-' 两种前缀格式的 API Key。
 *
 * 逆向参考: zz0 (交互式登录提示) in claude-config-system.js:~1140
 *
 * @example
 * ```ts
 * import { validateApiKey, getApiKeyFromEnv, hasApiKey, storeApiKey } from "./api-key";
 *
 * // 验证格式
 * validateApiKey("sk-abc123"); // true
 * validateApiKey("invalid");   // false
 *
 * // 环境变量
 * const envKey = getApiKeyFromEnv(); // process.env.FLITTER_API_KEY
 *
 * // 存储与检查
 * await storeApiKey(secrets, ampURL, "sk-abc123");
 * await hasApiKey(secrets, ampURL); // true
 * ```
 */
import type { SecretStorage } from "@flitter/flitter";
import { createInterface } from "node:readline/promises";

/** 允许的 API Key 前缀列表 */
const API_KEY_PREFIXES = ["sk-", "flitter-"];

/**
 * 检查是否已有存储的 API Key
 *
 * @param secrets - 秘密存储接口
 * @param ampURL - API 服务器 URL (用于按服务器分存)
 * @returns 是否已存储 API Key
 */
export async function hasApiKey(secrets: SecretStorage, ampURL: string): Promise<boolean> {
  const key = await secrets.get("apiKey", ampURL);
  return Boolean(key);
}

/**
 * 验证 API Key 格式
 *
 * 规则:
 * - 非空字符串 (去除首尾空白后)
 * - 以 'sk-' 或 'flitter-' 前缀开头
 *
 * @param key - 待验证的 API Key
 * @returns 是否为有效格式
 */
export function validateApiKey(key: string): boolean {
  if (!key || key.trim().length === 0) return false;
  return API_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
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
 * 存储 API Key 到秘密存储
 *
 * 按 ampURL 分存, 不同服务器的 key 互不干扰。
 *
 * @param secrets - 秘密存储接口
 * @param ampURL - API 服务器 URL (用于按服务器分存)
 * @param key - 要存储的 API Key
 */
export async function storeApiKey(
  secrets: SecretStorage,
  ampURL: string,
  key: string,
): Promise<void> {
  await secrets.set("apiKey", key, ampURL);
}
