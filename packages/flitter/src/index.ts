/**
 * @flitter/flitter — Main application assembly layer
 *
 * DI 容器: 组装 @flitter/data + @flitter/agent-core + @flitter/llm 的服务实例
 * 为 CLI 命令和 TUI 提供统一入口
 *
 * @example
 * ```ts
 * import { createContainer, type ContainerOptions, type ServiceContainer } from 'flitter';
 *
 * const container = await createContainer({
 *   settings: mySettings,
 *   secrets: mySecrets,
 *   workspaceRoot: process.cwd(),
 * });
 * ```
 */

export type {
  ContainerOptions,
  GuidanceLoader,
  SecretStorage,
  ServiceContainer,
} from "./container";
// ─── Container ────────────────────────────────────────────
export { createContainer } from "./container";

// ─── Factory (供高级用户直接组装) ──────────────────────────
export {
  createConfigService,
  createContextManager,
  createGuidanceLoader,
  createMCPServerManager,
  createPermissionEngine,
  createSkillService,
  createThreadPersistence,
  createThreadStore,
  createToolRegistry,
  registerBuiltinTools,
} from "./factory";
