/**
 * Hook 系统: PreToolUse / PostToolUse / Notification 钩子
 * 逆向: u7R, y7R (tool-execution-engine.js ~1450-1680)
 *
 * 职责:
 * 1. 从 Settings.hooks 解析 Hook 配置
 * 2. 匹配 Hook 到工具 (glob 模式)
 * 3. 执行 Hook 命令 (子进程, 环境变量传递, 超时处理)
 * 4. 解析 stdout JSON 控制指令 (abort, modifiedArgs)
 */

import { spawn } from "node:child_process";
import { matchToolPattern } from "../permissions/matcher";
import type { ToolResult } from "../tools/types";

// ─── Hook 类型 ──────────────────────────────────────────

/**
 * Hook 类型
 * - PreToolUse: 工具执行前触发, 可中止或修改参数
 * - PostToolUse: 工具执行后触发, 可观察结果
 * - Notification: 通知类 hook (如工具完成通知)
 */
export type HookType = "PreToolUse" | "PostToolUse" | "Notification";

// ─── Hook 配置 ──────────────────────────────────────────

/**
 * 单个 Hook 配置项
 * 从 Settings.hooks 解析而来
 */
export interface HookConfig {
  /** Hook 类型 */
  type: HookType;
  /** Glob 模式匹配工具名 (无 matcher → 匹配所有工具) */
  matcher?: string;
  /** 要执行的 Shell 命令 */
  command: string;
  /** 超时时间 (ms), 默认 60000 */
  timeout?: number;
}

// ─── Hook 结果 ──────────────────────────────────────────

/**
 * Hook 执行结果
 */
export interface HookResult {
  /** 是否中止工具调用 (仅 PreToolUse 有效) */
  abort?: boolean;
  /** 修改后的工具参数 (仅 PreToolUse 有效) */
  modifiedArgs?: Record<string, unknown>;
  /** 显示给用户的消息 */
  message?: string;
  /** Hook 命令的退出码 */
  exitCode: number;
  /** Hook 命令的 stdout */
  stdout: string;
  /** Hook 命令的 stderr */
  stderr: string;
}

// ─── Pre-hook 执行上下文 ────────────────────────────────

export interface PreHookContext {
  threadId: string;
  toolUse: {
    name: string;
    input: Record<string, unknown>;
  };
}

// ─── Post-hook 执行上下文 ───────────────────────────────

export interface PostHookContext {
  threadId: string;
  toolUse: {
    name: string;
    input: Record<string, unknown>;
  };
  result: ToolResult;
}

// ─── 默认超时 ───────────────────────────────────────────

const DEFAULT_HOOK_TIMEOUT = 60_000;

// ─── 有效 Hook 类型集合 ────────────────────────────────

const VALID_HOOK_TYPES = new Set<string>(["PreToolUse", "PostToolUse", "Notification"]);

// ─── parseHooksConfig ───────────────────────────────────

/**
 * 从 Settings.hooks 解析 Hook 配置列表
 * 逆向: tool-execution-engine.js ~1640-1680
 *
 * Settings.hooks 格式:
 * {
 *   "PreToolUse": [{ matcher: "Bash", command: "echo pre" }],
 *   "PostToolUse": [{ command: "echo post" }],
 *   "Notification": [{ command: "notify-send done" }]
 * }
 *
 * 跳过无效条目 (缺少 command, 未知 type 等), 不抛出错误
 *
 * @param hooks - Settings.hooks 的原始值
 * @returns 解析后的 HookConfig[]
 */
export function parseHooksConfig(hooks: Record<string, unknown>): HookConfig[] {
  if (!hooks || typeof hooks !== "object") return [];

  const result: HookConfig[] = [];

  for (const [type, entries] of Object.entries(hooks)) {
    if (!VALID_HOOK_TYPES.has(type)) continue;
    if (!Array.isArray(entries)) continue;

    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue;

      const raw = entry as Record<string, unknown>;
      const command = raw.command;
      if (typeof command !== "string" || command.trim() === "") continue;

      const config: HookConfig = {
        type: type as HookType,
        command,
      };

      if (typeof raw.matcher === "string" && raw.matcher.trim() !== "") {
        config.matcher = raw.matcher;
      }

      if (typeof raw.timeout === "number" && raw.timeout > 0) {
        config.timeout = raw.timeout;
      }

      result.push(config);
    }
  }

  return result;
}

// ─── matchHookToTool ────────────────────────────────────

/**
 * 检查 hook 是否匹配指定工具
 * 逆向: tool-execution-engine.js ~1450-1490
 *
 * - 无 matcher → 匹配所有工具
 * - 有 matcher → 复用 matchToolPattern (glob 匹配)
 *
 * @param hook - Hook 配置
 * @param toolName - 工具名
 * @returns true 如果匹配
 */
export function matchHookToTool(hook: HookConfig, toolName: string): boolean {
  if (!hook.matcher) return true;
  return matchToolPattern(hook.matcher, toolName);
}

// ─── executePreHook ─────────────────────────────────────

/**
 * 执行 PreToolUse Hook
 * 逆向: u7R (tool-execution-engine.js ~1500-1560)
 *
 * 流程:
 * 1. 通过环境变量传递工具信息: TOOL_NAME, TOOL_INPUT (JSON)
 * 2. 执行 hook 命令为子进程 (sh -c)
 * 3. 解析 stdout 为 JSON, 提取控制指令 (abort, modifiedArgs)
 * 4. 超时时杀死子进程, 返回非零 exitCode
 *
 * @param hookConfig - Hook 配置
 * @param context - Pre-hook 执行上下文
 * @returns HookResult
 */
export async function executePreHook(
  hookConfig: HookConfig,
  context: PreHookContext,
): Promise<HookResult> {
  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    TOOL_NAME: context.toolUse.name,
    TOOL_INPUT: JSON.stringify(context.toolUse.input),
  };

  const timeout = hookConfig.timeout ?? DEFAULT_HOOK_TIMEOUT;
  const { exitCode, stdout, stderr } = await runCommand(hookConfig.command, env, timeout);

  // 解析 stdout 中的 JSON 控制指令
  const directives = parseDirectives(stdout);

  return {
    abort: directives.abort,
    modifiedArgs: directives.modifiedArgs,
    message: directives.message,
    exitCode,
    stdout,
    stderr,
  };
}

// ─── executePostHook ────────────────────────────────────

/**
 * 执行 PostToolUse Hook
 * 逆向: y7R (tool-execution-engine.js ~1570-1630)
 *
 * 流程:
 * 1. 通过环境变量传递: TOOL_NAME, TOOL_INPUT (JSON), TOOL_RESULT (JSON)
 * 2. 执行 hook 命令为子进程
 * 3. 超时时杀死子进程
 *
 * @param hookConfig - Hook 配置
 * @param context - Post-hook 执行上下文
 * @returns HookResult
 */
export async function executePostHook(
  hookConfig: HookConfig,
  context: PostHookContext,
): Promise<HookResult> {
  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    TOOL_NAME: context.toolUse.name,
    TOOL_INPUT: JSON.stringify(context.toolUse.input),
    TOOL_RESULT: JSON.stringify(context.result),
  };

  const timeout = hookConfig.timeout ?? DEFAULT_HOOK_TIMEOUT;
  const { exitCode, stdout, stderr } = await runCommand(hookConfig.command, env, timeout);

  // Post-hooks 也可能输出消息
  const directives = parseDirectives(stdout);

  return {
    message: directives.message,
    exitCode,
    stdout,
    stderr,
  };
}

// ─── 内部: runCommand ───────────────────────────────────

/**
 * 执行 shell 命令, 收集 stdout/stderr, 支持超时
 */
function runCommand(
  command: string,
  env: Record<string, string>,
  timeout: number,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn("sh", ["-c", command], {
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let killed = false;

    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGKILL");
    }, timeout);

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        exitCode: killed ? 124 : (code ?? 1),
        stdout,
        stderr,
      });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        exitCode: 1,
        stdout,
        stderr: stderr + (stderr ? "\n" : "") + err.message,
      });
    });
  });
}

// ─── 内部: parseDirectives ──────────────────────────────

/**
 * 从 stdout 解析 JSON 控制指令
 * 尝试将整个 stdout 解析为 JSON, 提取已知字段
 * 解析失败时返回空指令 (不抛出错误)
 */
function parseDirectives(stdout: string): {
  abort?: boolean;
  modifiedArgs?: Record<string, unknown>;
  message?: string;
} {
  const trimmed = stdout.trim();
  if (!trimmed) return {};

  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed !== "object" || parsed === null) return {};

    const result: {
      abort?: boolean;
      modifiedArgs?: Record<string, unknown>;
      message?: string;
    } = {};

    if (typeof parsed.abort === "boolean") {
      result.abort = parsed.abort;
    }

    if (
      parsed.modifiedArgs &&
      typeof parsed.modifiedArgs === "object" &&
      !Array.isArray(parsed.modifiedArgs)
    ) {
      result.modifiedArgs = parsed.modifiedArgs;
    }

    if (typeof parsed.message === "string") {
      result.message = parsed.message;
    }

    return result;
  } catch {
    return {};
  }
}
