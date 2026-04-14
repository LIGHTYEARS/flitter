/**
 * @flitter/cli — CLI 入口与命令系统
 *
 * 提供 Commander.js 命令树、CLI 上下文解析、以及所有子命令处理器的公共 API。
 *
 * @example
 * ```typescript
 * import { createProgram, resolveCliContext } from "@flitter/cli";
 *
 * const program = createProgram("1.0.0");
 * program.parse(process.argv);
 * const ctx = resolveCliContext(program);
 * ```
 */

// ─── 认证模块 ────────────────────────────────────────────
export {
  getApiKeyFromEnv,
  hasApiKey,
  promptApiKey,
  promptProviderSelection,
  storeApiKey,
  validateApiKey,
} from "./auth/api-key";
export type { AuthCommandDeps } from "./commands/auth";
// ─── 命令处理器 ───────────────────────────────────────────
export { handleLogin, handleLogout } from "./commands/auth";
export type { ConfigCommandDeps } from "./commands/config";
export {
  handleConfigGet,
  handleConfigList,
  handleConfigSet,
} from "./commands/config";
export type {
  ThreadsCommandDeps,
  ThreadsListOptions,
  ThreadsNewOptions,
} from "./commands/threads";
export {
  handleThreadsArchive,
  handleThreadsContinue,
  handleThreadsDelete,
  handleThreadsList,
  handleThreadsNew,
} from "./commands/threads";
export type { UpdateCommandDeps, UpdateOptions } from "./commands/update";
export { handleUpdate } from "./commands/update";
export type { CliContext } from "./context";
export { resolveCliContext } from "./context";
export type { MainOptions } from "./main";
// ─── 核心 API ─────────────────────────────────────────────
export { getVersion, main } from "./main";
export type { ExecuteIO } from "./modes/execute";
export { runExecuteMode } from "./modes/execute";
export type { HeadlessIO } from "./modes/headless";
export { runHeadlessMode } from "./modes/headless";
export type { RunAppOptions } from "./modes/interactive";

// ─── 模式入口 ────────────────────────────────────────────
export { launchInteractiveMode } from "./modes/interactive";
export { createProgram } from "./program";
export type { InstallMethod, UpdateInfo } from "./update/checker";
// ─── 更新模块 ────────────────────────────────────────────
export {
  checkForUpdate,
  compareVersions,
  computeSHA256,
  detectInstallMethod,
} from "./update/checker";
export type { InstallOptions } from "./update/installer";
export {
  installBinaryUpdate,
  installWithPackageManager,
  UpdateVerificationError,
} from "./update/installer";
