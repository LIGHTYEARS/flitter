/**
 * Secret 管理命令处理器
 *
 * 处理 `flitter secret` 子命令: set/get/delete/list。
 * 直接操作 SecretStorage (不需要完整的 ServiceContainer)。
 *
 * 逆向: amp doesn't have a CLI secret command — secrets are managed via
 * server-side auth flow. Flitter adds this as a convenience for self-hosted
 * setups where users need to store sync tokens, API keys, etc.
 */
import type { SecretStorage } from "@flitter/flitter";
import { SecretKeySchema } from "@flitter/schemas";

const VALID_KEYS = SecretKeySchema.options;

function validateKey(key: string): boolean {
  return VALID_KEYS.includes(key as (typeof VALID_KEYS)[number]);
}

/**
 * Handle `flitter secret set <key> <value>`
 */
export async function handleSecretSet(
  secrets: SecretStorage,
  key: string,
  value: string,
): Promise<void> {
  if (!validateKey(key)) {
    process.stderr.write(
      `Error: Unknown secret key "${key}"\nValid keys: ${VALID_KEYS.join(", ")}\n`,
    );
    process.exitCode = 1;
    return;
  }
  await secrets.set(key, value);
  process.stdout.write(`Secret "${key}" saved.\n`);
}

/**
 * Handle `flitter secret get <key>`
 */
export async function handleSecretGet(secrets: SecretStorage, key: string): Promise<void> {
  if (!validateKey(key)) {
    process.stderr.write(
      `Error: Unknown secret key "${key}"\nValid keys: ${VALID_KEYS.join(", ")}\n`,
    );
    process.exitCode = 1;
    return;
  }
  const value = await secrets.get(key);
  if (value === undefined) {
    process.stdout.write(`${key}: (not set)\n`);
  } else {
    // Mask the value for security — show first 8 chars + asterisks
    const masked = value.length > 8 ? `${value.slice(0, 8)}${"*".repeat(value.length - 8)}` : value;
    process.stdout.write(`${key}: ${masked}\n`);
  }
}

/**
 * Handle `flitter secret delete <key>`
 */
export async function handleSecretDelete(secrets: SecretStorage, key: string): Promise<void> {
  if (!validateKey(key)) {
    process.stderr.write(
      `Error: Unknown secret key "${key}"\nValid keys: ${VALID_KEYS.join(", ")}\n`,
    );
    process.exitCode = 1;
    return;
  }
  await secrets.delete(key);
  process.stdout.write(`Secret "${key}" deleted.\n`);
}

/**
 * Handle `flitter secret list`
 */
export async function handleSecretList(secrets: SecretStorage): Promise<void> {
  let found = 0;
  for (const key of VALID_KEYS) {
    const value = await secrets.get(key);
    if (value !== undefined) {
      const masked =
        value.length > 8 ? `${value.slice(0, 8)}${"*".repeat(value.length - 8)}` : value;
      process.stdout.write(`${key}: ${masked}\n`);
      found++;
    }
  }
  if (found === 0) {
    process.stdout.write("No secrets stored.\n");
  }
}
