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
  // TODO: 实现配置值获取和输出
  void deps;
  void context;
  void key;
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
  // TODO: 实现配置值设置
  void deps;
  void context;
  void key;
  void value;
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
  // TODO: 实现配置列表输出 (table/json 格式)
  void deps;
  void context;
}
