/**
 * Config 管理命令处理器
 *
 * 处理 `flitter config` 子命令: get/set/list。
 * 通过 ServiceContainer.configService 进行配置读写。
 *
 * @example
 * ```typescript
 * import { handleConfigGet, handleConfigSet, handleConfigList } from "./config";
 *
 * configCmd.command("get <key>").action((key) =>
 *   handleConfigGet(container, context, key)
 * );
 * ```
 */
import type { ConfigService } from "@flitter/data";
import type { CliContext } from "../context";

/**
 * 服务容器接口 (config 命令所需的最小子集)
 *
 * 实际类型定义在 @flitter/flitter 的 container.ts
 */
export interface ConfigCommandDeps {
  /** 配置服务 */
  configService?: ConfigService;
}

/**
 * 处理 config get 命令
 *
 * @param deps - Config 管理所需的依赖服务
 * @param context - CLI 运行上下文
 * @param key - 配置键名
 */
export async function handleConfigGet(
  deps: ConfigCommandDeps,
  context: CliContext,
  key: string,
): Promise<void> {
  void context;
  const configService = deps.configService;
  if (!configService) {
    process.stderr.write("Error: ConfigService not available\n");
    process.exitCode = 1;
    return;
  }
  const value = (configService.get().settings as Record<string, unknown>)[key];
  if (value === undefined) {
    process.stdout.write(`${key}: (not set)\n`);
  } else if (typeof value === "object") {
    process.stdout.write(`${key}: ${JSON.stringify(value, null, 2)}\n`);
  } else {
    process.stdout.write(`${key}: ${String(value)}\n`);
  }
}

/**
 * 处理 config set 命令
 *
 * @param deps - Config 管理所需的依赖服务
 * @param context - CLI 运行上下文
 * @param key - 配置键名
 * @param value - 配置值
 */
export async function handleConfigSet(
  deps: ConfigCommandDeps,
  context: CliContext,
  key: string,
  value: string,
): Promise<void> {
  void context;
  const configService = deps.configService;
  if (!configService) {
    process.stderr.write("Error: ConfigService not available\n");
    process.exitCode = 1;
    return;
  }
  let parsed: unknown = value;
  try {
    parsed = JSON.parse(value);
  } catch {
    /* keep as string */
  }
  if (value === "true") parsed = true;
  if (value === "false") parsed = false;
  configService.updateSettings("workspace", key, parsed);
  process.stdout.write(
    `Set ${key} = ${typeof parsed === "object" ? JSON.stringify(parsed) : String(parsed)}\n`,
  );
}

/**
 * 处理 config list 命令
 *
 * @param deps - Config 管理所需的依赖服务
 * @param context - CLI 运行上下文
 */
export async function handleConfigList(
  deps: ConfigCommandDeps,
  context: CliContext,
): Promise<void> {
  void context;
  const configService = deps.configService;
  if (!configService) {
    process.stderr.write("Error: ConfigService not available\n");
    process.exitCode = 1;
    return;
  }
  const settings = configService.get().settings as Record<string, unknown>;
  const entries = Object.entries(settings).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) {
    process.stdout.write("No settings configured.\n");
    return;
  }
  for (const [key, value] of entries) {
    const display = typeof value === "object" ? JSON.stringify(value) : String(value);
    process.stdout.write(`${key}: ${display}\n`);
  }
}
