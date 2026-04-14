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

// ─── 核心 API ─────────────────────────────────────────────
export { createProgram } from "./program";
export { resolveCliContext } from "./context";
export type { CliContext } from "./context";

// ─── 命令处理器 ───────────────────────────────────────────
export { handleLogin, handleLogout } from "./commands/auth";
export type { AuthCommandDeps } from "./commands/auth";

export {
  handleThreadsList,
  handleThreadsNew,
  handleThreadsContinue,
  handleThreadsArchive,
  handleThreadsDelete,
} from "./commands/threads";
export type {
  ThreadsCommandDeps,
  ThreadsListOptions,
  ThreadsNewOptions,
} from "./commands/threads";

export {
  handleConfigGet,
  handleConfigSet,
  handleConfigList,
} from "./commands/config";
export type { ConfigCommandDeps } from "./commands/config";

export { handleUpdate } from "./commands/update";
export type { UpdateCommandDeps, UpdateOptions } from "./commands/update";

// ─── 模式入口 ────────────────────────────────────────────
export { launchInteractiveMode } from "./modes/interactive";
export type { RunAppOptions } from "./modes/interactive";

export { runHeadlessMode } from "./modes/headless";
export type { HeadlessIO } from "./modes/headless";

export { runExecuteMode } from "./modes/execute";
export type { ExecuteIO } from "./modes/execute";
