/**
 * CLI 上下文解析
 *
 * 从 Commander.js 解析结果构建 CLI 运行上下文，包括模式判定
 * (interactive/execute/headless)、TTY 检测、详细日志标志等。
 *
 * 逆向参考: S8() in cli-entrypoint.js:913-990
 *
 * @example
 * ```typescript
 * import { resolveCliContext } from "./context";
 * import { createProgram } from "./program";
 *
 * const program = createProgram("1.0.0");
 * program.parse(process.argv);
 * const ctx = resolveCliContext(program);
 *
 * if (ctx.executeMode) {
 *   // 非交互式执行模式
 * } else {
 *   // 交互式 TUI 模式
 * }
 * ```
 */
import type { Command } from "commander";

/**
 * CLI 运行上下文
 *
 * 包含所有影响 CLI 行为的环境和选项信息。
 * 由 resolveCliContext() 从 Commander 解析结果构建。
 */
export interface CliContext {
  /** 非交互式执行模式 (--execute 或 非 TTY 或 --headless) */
  executeMode: boolean;
  /** stdout 和 stderr 是否均为 TTY */
  isTTY: boolean;
  /** Headless JSON 流模式 (--headless) */
  headless: boolean;
  /** 输出 JSON 事件流 (--stream-json 或 --headless) */
  streamJson: boolean;
  /** 详细日志 (--verbose/-v) */
  verbose: boolean;
  /** 用户消息 (execute 模式下由命令行参数拼接) */
  userMessage?: string;
}

/**
 * 从 Commander 解析结果构建 CLI 上下文
 *
 * 模式判定逻辑 (逆向 S8):
 * - --execute 或 stdout 非 TTY → execute mode
 * - --headless → headless mode (隐含 execute + streamJson)
 * - 默认 (TTY) → interactive mode
 *
 * @param program - 已解析的 Commander.js Command 实例
 * @returns 构建的 CLI 上下文对象
 */
export function resolveCliContext(program: Command): CliContext {
  const opts = program.opts();
  const isTTY = Boolean(process.stdout.isTTY && process.stderr.isTTY);
  const executeMode = Boolean(opts.execute) || !isTTY || Boolean(opts.headless);

  return {
    executeMode,
    isTTY,
    headless: Boolean(opts.headless),
    streamJson: Boolean(opts.streamJson) || Boolean(opts.headless),
    verbose: Boolean(opts.verbose),
    userMessage: program.args.length > 0 ? program.args.join(" ") : undefined,
  };
}
