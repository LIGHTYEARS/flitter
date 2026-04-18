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
  /** 非交互式执行模式 (--execute 或 非 TTY 或 --headless 或 --print 或 --pipe) */
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
  /** 仅输出最终 assistant 文本 (--print/-p, 隐含 executeMode) */
  print: boolean;
  /** 从 stdin 读取, 结果输出到 stdout (--pipe, 隐含 executeMode) */
  pipe: boolean;
  /**
   * 最大推理轮次 (--max-turns)
   * undefined = 无限制 (0 或 NaN 或负数均视为无限制)
   * 逆向: amp 无直接对应, Flitter 自定义扩展
   */
  maxTurns?: number;
  /** LLM 模型覆盖 (--model) — 逆向: amp 通过 --mode 间接选择模型 */
  model?: string;
  /**
   * 自定义系统提示文本或文件路径 (--system-prompt)
   * 逆向: i$T sp/systemPrompt flags (chunk-006.js:38269-38279)
   *        R3R() extraction (1983_unknown_R3R.js:1-4)
   */
  systemPrompt?: string;
  /** API Key 覆盖 (--api-key) — 逆向: i$T apiKey (chunk-006.js:38263-38267) */
  apiKey?: string;
}

/**
 * 从 Commander 解析结果构建 CLI 上下文
 *
 * 模式判定逻辑 (逆向 S8):
 * - --execute 或 stdout 非 TTY → execute mode
 * - --headless → headless mode (隐含 execute + streamJson)
 * - --print 或 --pipe → 隐含 execute mode
 * - 默认 (TTY) → interactive mode
 *
 * --max-turns 解析逻辑:
 * - 正整数 → 保留
 * - 0, NaN, 负数 → undefined (无限制)
 *
 * 逆向: S8() in 2002_unknown_S8.js
 *        R3R() system prompt override in 1983_unknown_R3R.js
 *
 * @param program - 已解析的 Commander.js Command 实例
 * @returns 构建的 CLI 上下文对象
 */
export function resolveCliContext(program: Command): CliContext {
  const opts = program.opts();
  const isTTY = Boolean(process.stdout.isTTY && process.stderr.isTTY);

  // --print and --pipe each imply executeMode
  // 逆向: amp's --execute resolves similarly in S8 (2002_unknown_S8.js:10)
  const printFlag = Boolean(opts.print);
  const pipeFlag = Boolean(opts.pipe);
  const executeMode =
    Boolean(opts.execute) || printFlag || pipeFlag || (!process.stdout.isTTY && !opts.streamJson);

  // Parse --max-turns: positive integer only, else undefined (unlimited)
  let maxTurns: number | undefined;
  if (opts.maxTurns !== undefined) {
    const parsed = Number.parseInt(opts.maxTurns as string, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      maxTurns = parsed;
    }
  }

  return {
    executeMode,
    isTTY,
    headless: Boolean(opts.headless),
    streamJson: Boolean(opts.streamJson) || Boolean(opts.headless),
    verbose: Boolean(opts.verbose),
    userMessage: program.args.length > 0 ? program.args.join(" ") : undefined,
    print: printFlag,
    pipe: pipeFlag,
    maxTurns,
    model: opts.model as string | undefined,
    systemPrompt: opts.systemPrompt as string | undefined,
    apiKey: opts.apiKey as string | undefined,
  };
}
