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
 *   ampURL: 'https://api.example.com',
 *   settings: mySettings,
 *   secrets: mySecrets,
 *   workspaceRoot: process.cwd(),
 * });
 * ```
 */

// ─── Container ────────────────────────────────────────────
export { createContainer } from "./container";
export type {
  ContainerOptions,
  ServiceContainer,
  SecretStorage,
  GuidanceLoader,
} from "./container";

// ─── Factory (供高级用户直接组装) ──────────────────────────
export {
  createConfigService,
  createToolRegistry,
  registerBuiltinTools,
  createPermissionEngine,
  createMCPServerManager,
  createSkillService,
  createGuidanceLoader,
  createThreadStore,
  createThreadPersistence,
  createContextManager,
} from "./factory";
