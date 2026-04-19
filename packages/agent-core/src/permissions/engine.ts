/**
 * PermissionEngine — 四级决策权限引擎
 *
 * 决策层级 (按优先级):
 * 1. 受保护文件检查: 文件在 guardedFiles 中且不在 allowlist → ask
 * 2. 用户规则: config.permissions 按顺序评估, 第一个匹配生效
 * 3. 默认规则: DEFAULT_PERMISSION_RULES 按顺序评估
 * 4. Fallback: ask (未匹配任何规则时)
 *
 * 逆向: tool-permissions.js 的 ToolPermissionsService (171-283)
 */
import type {
  Config,
  PermissionCheckResult,
  PermissionContext,
  PermissionEntry,
  PermissionMatcher,
  Settings,
  ToolApprovalRequest,
} from "@flitter/schemas";
import type { Subject } from "@flitter/util";
import { checkGuardedFile, getToolFilePaths } from "./guarded-files";
import { matchPermissionEntry } from "./matcher";

// ─── 默认权限规则 ──────────────────────────────────────

/**
 * 内置默认权限规则
 * 逆向: permission-rule-defs.js
 *
 * 规则按优先级排列, 第一个匹配的生效:
 * 1. 只读工具: 始终允许
 * 2. 写工具: workspace 内允许 (通过 ${workspaceRoot}/** 匹配)
 * 3. Bash: 始终需要确认
 * 4. MCP 工具: 默认需要确认
 * 5. Task (子代理): 允许
 *
 * 注意: ${workspaceRoot} 是占位符, 在评估时由 PermissionEngine 替换为实际路径
 */
export const DEFAULT_PERMISSION_RULES: PermissionEntry[] = [
  // 只读工具: 始终允许
  { tool: "Read", action: "allow" },
  { tool: "Grep", action: "allow" },
  { tool: "Glob", action: "allow" },
  { tool: "FuzzyFind", action: "allow" },
  { tool: "TodoWrite", action: "allow" },

  // 写工具: workspace 内允许
  { tool: "Write", action: "allow", matches: { file_path: "${workspaceRoot}/**" } },
  { tool: "Edit", action: "allow", matches: { file_path: "${workspaceRoot}/**" } },

  // Bash: 始终需要确认
  { tool: "Bash", action: "ask" },

  // MCP 工具: 默认需要确认
  { tool: "mcp__*", action: "ask" },

  // Task (子代理): 允许
  { tool: "Task", action: "allow" },
];

// ─── 权限引擎选项 ──────────────────────────────────────

export interface PermissionEngineOpts {
  /** 获取当前配置 */
  getConfig: () => Config;
  /** 审批请求推送管道 */
  pendingApprovals$: Subject<ToolApprovalRequest[]>;
  /** 工作区根目录 (用于替换 ${workspaceRoot}) */
  workspaceRoot: string;
}

// ─── PermissionEngine 类 ───────────────────────────────

/**
 * 权限执行引擎: 四级决策引擎
 * 逆向: ToolPermissionsService (tool-permissions.js 171-283)
 */
export class PermissionEngine {
  private readonly getConfig: () => Config;
  private readonly pendingApprovals$: Subject<ToolApprovalRequest[]>;
  private readonly workspaceRoot: string;

  constructor(opts: PermissionEngineOpts) {
    this.getConfig = opts.getConfig;
    this.pendingApprovals$ = opts.pendingApprovals$;
    this.workspaceRoot = opts.workspaceRoot;
  }

  /**
   * 检查工具调用权限
   */
  checkPermission(
    toolName: string,
    args: Record<string, unknown>,
    context: PermissionContext = "thread",
  ): PermissionCheckResult {
    const config = this.getConfig();
    const settings = config.settings;

    // ─── Level 1: 受保护文件检查 ─────────────────────
    const guardedResult = this.checkGuardedFiles(toolName, args, settings);
    if (guardedResult) return guardedResult;

    // ─── Level 2: 用户规则 ───────────────────────────
    const userRules = settings.permissions ?? [];
    const userResult = this.evaluateRules(userRules, toolName, args, context, "user-settings");
    if (userResult) return userResult;

    // ─── Level 3: 默认规则 ───────────────────────────
    const resolvedDefaults = this.resolveWorkspaceRoot(DEFAULT_PERMISSION_RULES);
    const defaultResult = this.evaluateRules(resolvedDefaults, toolName, args, context, "default");
    if (defaultResult) return defaultResult;

    // ─── Level 4: Fallback ───────────────────────────
    return {
      permitted: false,
      reason: "No matching permission rule found",
      action: "ask",
    };
  }

  /**
   * 推送审批请求
   */
  requestApproval(request: ToolApprovalRequest): void {
    this.pendingApprovals$.next([request]);
  }

  // ─── 内部方法 ────────────────────────────────────────

  /**
   * Level 1: 受保护文件检查
   */
  private checkGuardedFiles(
    toolName: string,
    args: Record<string, unknown>,
    settings: Settings,
  ): PermissionCheckResult | null {
    const allowlist = settings["guardedFiles.allowlist"];

    // guardedFiles 未配置 → 跳过
    if (!allowlist) return null;

    const filePaths = getToolFilePaths(toolName, args);
    if (filePaths.length === 0) return null;

    // 检查是否有任何文件受保护
    for (const filePath of filePaths) {
      if (checkGuardedFile(filePath, allowlist)) {
        return {
          permitted: false,
          reason: `Guarded file: ${filePath}`,
          action: "ask",
        };
      }
    }

    return null;
  }

  /**
   * 按顺序评估规则列表, 返回第一个匹配规则的结果
   */
  private evaluateRules(
    rules: PermissionEntry[],
    toolName: string,
    args: Record<string, unknown>,
    context: PermissionContext,
    source: string,
  ): PermissionCheckResult | null {
    for (const rule of rules) {
      // 上下文过滤: 如果规则指定了 context, 仅在匹配时生效
      if (rule.context && rule.context !== context) {
        continue;
      }

      if (matchPermissionEntry(rule, toolName, args)) {
        return this.ruleToResult(rule, source);
      }
    }
    return null;
  }

  /**
   * 将匹配的规则转换为 PermissionCheckResult
   */
  private ruleToResult(rule: PermissionEntry, source: string): PermissionCheckResult {
    if (rule.action === "allow") {
      return {
        permitted: true,
        reason: `Allowed by ${source} rule: ${rule.tool}`,
        action: "ask", // schema requires action field; irrelevant when permitted=true
        matchedEntry: rule,
        source,
      };
    }

    if (rule.action === "reject") {
      return {
        permitted: false,
        reason: rule.message ?? `Rejected by ${source} rule: ${rule.tool}`,
        action: "reject",
        matchedEntry: rule,
        source,
      };
    }

    if (rule.action === "delegate") {
      return {
        permitted: false,
        reason: `Delegated by ${source} rule: ${rule.tool} → ${rule.to}`,
        action: "delegate",
        matchedEntry: rule,
        source,
      };
    }

    // action === "ask"
    return {
      permitted: false,
      reason: `Requires approval by ${source} rule: ${rule.tool}`,
      action: "ask",
      matchedEntry: rule,
      source,
    };
  }

  /**
   * 替换默认规则中的 ${workspaceRoot} 占位符
   */
  private resolveWorkspaceRoot(rules: PermissionEntry[]): PermissionEntry[] {
    return rules.map((rule) => {
      if (!rule.matches) return rule;

      const resolvedMatches: Record<string, PermissionMatcher> = {};
      for (const [key, value] of Object.entries(rule.matches)) {
        if (typeof value === "string" && value.includes("${workspaceRoot}")) {
          resolvedMatches[key] = value.replace(/\$\{workspaceRoot\}/g, this.workspaceRoot);
        } else {
          resolvedMatches[key] = value;
        }
      }

      return { ...rule, matches: resolvedMatches };
    });
  }
}
