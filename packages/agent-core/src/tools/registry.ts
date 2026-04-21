/**
 * @flitter/agent-core — 工具注册表
 *
 * 管理所有已注册工具的 CRUD + 过滤 + 名称规范化
 * 逆向: FWT (工具查找部分) + yy (enable/disable 逻辑) + Xf (normalizeToolName)
 *
 * @example
 * ```ts
 * import { ToolRegistry } from '@flitter/agent-core';
 * const registry = new ToolRegistry();
 * registry.register(myTool);
 * const tool = registry.get('read');
 * const enabled = registry.listEnabled(config.settings);
 * ```
 */

import type { ToolDefinition } from "@flitter/llm";
import type { Settings } from "@flitter/schemas";
import type { ToolSpec } from "./types";

// ─── Glob pattern matching ──────────────────────────────
// 逆向: Xf / Vf (1740_unknown_Xf.js / 1739_unknown_Vf.js)
// Uses picomatch (g9T.default) with { dot: true }. We implement a lightweight
// glob-to-regex converter instead of adding a dependency, supporting the
// exact same patterns: *, ?, [...], {a,b}.

/**
 * Convert a simple glob pattern to a RegExp.
 * Matches picomatch behavior with { dot: true } for the subset of patterns
 * used in tool enable/disable lists.
 *
 * 逆向: amp's Xf activates glob only when pattern contains *, ?, [, or {
 */
function globToRegex(pattern: string): RegExp {
  let regex = "";
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i]!;
    switch (ch) {
      case "*":
        // ** is same as * for non-path matching (tool names have no slashes)
        while (pattern[i + 1] === "*") i++;
        regex += ".*";
        break;
      case "?":
        regex += ".";
        break;
      case "[": {
        // Character class — find closing ]
        const start = i;
        i++;
        let classContent = "";
        if (pattern[i] === "!" || pattern[i] === "^") {
          classContent += "^";
          i++;
        }
        while (i < pattern.length && pattern[i] !== "]") {
          classContent += pattern[i] === "\\" ? "\\\\" : pattern[i];
          i++;
        }
        if (pattern[i] === "]") {
          regex += `[${classContent}]`;
        } else {
          // No closing ] — treat the [ as literal
          regex += `\\[${classContent}`;
          i = start; // rewind; the while loop's i++ will advance
        }
        break;
      }
      case "{": {
        // Brace expansion {a,b,c}
        const braceStart = i;
        i++;
        const alternatives: string[] = [];
        let current = "";
        let depth = 1;
        while (i < pattern.length && depth > 0) {
          if (pattern[i] === "{") depth++;
          else if (pattern[i] === "}") {
            depth--;
            if (depth === 0) {
              alternatives.push(current);
              break;
            }
          } else if (pattern[i] === "," && depth === 1) {
            alternatives.push(current);
            current = "";
            i++;
            continue;
          }
          if (depth > 0) current += pattern[i];
          i++;
        }
        if (depth === 0 && alternatives.length > 1) {
          regex += `(?:${alternatives.map(escapeRegexStr).join("|")})`;
        } else {
          // Invalid brace pattern — treat as literal
          regex += escapeRegexStr(pattern.slice(braceStart, i + 1));
        }
        break;
      }
      default:
        // Escape regex-special characters
        regex += escapeRegexStr(ch);
        break;
    }
    i++;
  }
  return new RegExp(`^${regex}$`);
}

/** Escape a string for use in a RegExp */
function escapeRegexStr(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Check if a tool name matches any pattern in the list.
 *
 * 逆向: Xf (1740_unknown_Xf.js) / Vf (1739_unknown_Vf.js) — identical logic:
 *   1. Skip empty strings
 *   2. Single-char "*" matches everything; single-char exact match
 *   3. Exact string match (fast path before glob)
 *   4. If pattern has glob chars, use picomatch({dot:true}) — we use globToRegex
 *   5. Silently swallow invalid patterns
 */
export function matchToolPattern(name: string, patterns: readonly string[]): boolean {
  for (const pattern of patterns) {
    if (pattern === "") continue;
    if (pattern.length === 1) {
      if (pattern === "*") return true;
      if (pattern === name) return true;
      continue;
    }
    if (name === pattern) return true;
    if (
      pattern.includes("*") ||
      pattern.includes("?") ||
      pattern.includes("[") ||
      pattern.includes("{")
    ) {
      try {
        if (globToRegex(pattern).test(name)) return true;
      } catch {
        // 逆向: amp silently catches picomatch errors
      }
    }
  }
  return false;
}

/**
 * ToolRegistry: 管理所有已注册工具
 * 逆向: FWT 中的工具查找部分 + yy 的 enable/disable 逻辑
 */
export class ToolRegistry {
  /** 内部工具存储 */
  private readonly tools: Map<string, ToolSpec> = new Map();

  /**
   * 注册工具
   * @throws Error 如果同名工具已注册
   */
  register(spec: ToolSpec): void {
    if (this.tools.has(spec.name)) {
      throw new Error(`Tool "${spec.name}" is already registered`);
    }
    this.tools.set(spec.name, spec);
  }

  /**
   * 移除工具
   * @returns true 如果成功移除, false 如果不存在
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /** 按名称获取工具 */
  get(name: string): ToolSpec | undefined {
    return this.tools.get(name);
  }

  /** 检查工具是否已注册 */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /** 返回所有已注册工具 */
  list(): ToolSpec[] {
    return Array.from(this.tools.values());
  }

  /**
   * 返回当前启用的工具列表
   * 过滤逻辑 (逆向 yy):
   * 1. 如果 spec.isEnabled 存在且返回 false → 排除
   * 2. 如果 config.tools?.disable 包含匹配名称 → 排除
   * 3. 如果 config.tools?.enable 存在且不包含匹配名称 → 排除
   */
  listEnabled(config: Settings): ToolSpec[] {
    return this.list().filter((spec) => this._isToolEnabled(spec, config));
  }

  /**
   * 返回供 LLM 使用的已启用工具列表, 额外应用 CLI 过滤器
   * 逆向: amp applies CLI --allowed-tools / --disallowed-tools on top of config
   */
  listEnabledWithCliFilters(config: Settings): ToolSpec[] {
    let tools = this.listEnabled(config);
    if (this.cliFilters?.allowedTools?.length) {
      const allow = new Set(this.cliFilters.allowedTools);
      tools = tools.filter((t) => allow.has(t.name));
    }
    if (this.cliFilters?.disallowedTools?.length) {
      const block = new Set(this.cliFilters.disallowedTools);
      tools = tools.filter((t) => !block.has(t.name));
    }
    return tools;
  }

  /**
   * 查找与给定名称匹配的、已启用的工具（优先精确匹配，其次大小写不敏感）
   *
   * 逆向: amp-cli-reversed/modules/1737_EarliestNonDisabledTool_$mR.js:66-77
   *   function A(o, n) {
   *     if (!o) { J.warn("findEarliestNonDisabledTool called with empty tool name"); return; }
   *     let p = R.filter(_ => _.spec.name === o);
   *     if (p.length === 0) { let _ = o.toLowerCase(); p = R.filter(m => m.spec.name.toLowerCase() === _); }
   *     for (let _ of p) if (yy(_.spec, n).enabled) return _;
   *     return;
   *   }
   *
   * @param name Tool name to look up
   * @param config Current settings (for enabled/disabled filtering via yy logic)
   * @returns The first enabled tool matching the name, or undefined
   */
  findEarliestNonDisabledTool(name: string, config: Settings): ToolSpec | undefined {
    // 逆向: empty name guard
    if (!name) return undefined;

    // 逆向: exact name match first
    let candidates = this.list().filter((t) => t.name === name);

    // 逆向: case-insensitive fallback if no exact match
    if (candidates.length === 0) {
      const lower = name.toLowerCase();
      candidates = this.list().filter((t) => t.name.toLowerCase() === lower);
    }

    // 逆向: iterate candidates, return first that passes yy (enabled check)
    for (const spec of candidates) {
      if (this._isToolEnabled(spec, config)) {
        return spec;
      }
    }

    return undefined;
  }

  /**
   * Check if a single tool is enabled (matches amp's yy logic).
   * Extracted from listEnabled for reuse by findEarliestNonDisabledTool.
   *
   * 逆向: amp-cli-reversed/modules/1741_unknown_yy.js
   * yy checks:
   * 1. tools.enable whitelist (if present) — vmR checks name + mcp + prefix variants
   * 2. tools.disable blocklist — Xf checks name + mcp + prefix variants
   *
   * Name variants checked (逆向: yy lines 14-37):
   * - Bare spec.name
   * - For MCP tools: bare tool part + full "mcp__server__tool" form
   * - For builtin tools: "builtin:name"
   * - For toolbox tools: "toolbox:name"
   */
  private _isToolEnabled(spec: ToolSpec, config: Settings): boolean {
    // Dynamic enable check
    if (spec.isEnabled && !spec.isEnabled(config)) {
      return false;
    }

    // Config enable whitelist (if present, only allow whitelisted tools)
    // 逆向: vmR (1738_unknown_vmR.js)
    const enabled = config["tools.enable"];
    if (enabled !== undefined && enabled.length > 0) {
      if (!this._matchToolAgainstPatterns(spec, enabled)) {
        return false;
      }
    }

    // Config disable list
    // 逆向: yy (1741_unknown_yy.js) lines 10-37
    const disabled = config["tools.disable"];
    if (disabled && disabled.length > 0) {
      if (this._matchToolAgainstPatterns(spec, disabled)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a tool matches any pattern in the list, checking all name variants.
   *
   * 逆向: yy/vmR check bare name, MCP variants (bare tool + mcp__server__tool),
   * and source-prefixed variants (builtin:name, toolbox:name).
   */
  private _matchToolAgainstPatterns(spec: ToolSpec, patterns: readonly string[]): boolean {
    // Check bare name
    if (matchToolPattern(spec.name, patterns)) return true;

    // 逆向: yy lines 14-26 — MCP tool name expansion
    if (typeof spec.source === "object" && "mcp" in spec.source) {
      const parsed = this._parseMcpToolName(spec.name);
      if (parsed) {
        // Check bare tool part
        if (matchToolPattern(parsed.tool, patterns)) return true;
        // Check canonical mcp__server__tool form
        const canonical = `mcp__${(spec.source as { mcp: string }).mcp}__${parsed.tool}`;
        if (matchToolPattern(canonical, patterns)) return true;
      }
    }

    // 逆向: yy line 30 — builtin prefix
    if (spec.source === "builtin") {
      if (matchToolPattern(`builtin:${spec.name}`, patterns)) return true;
    }

    // 逆向: yy line 34 — toolbox prefix
    if (typeof spec.source === "object" && "toolbox" in spec.source) {
      if (matchToolPattern(`toolbox:${spec.name}`, patterns)) return true;
    }

    return false;
  }

  /**
   * Parse MCP tool name to extract server and tool parts.
   * 逆向: zLT — parses "mcp__server__tool" → { server, tool }
   */
  private _parseMcpToolName(name: string): { server: string; tool: string } | undefined {
    if (!name.startsWith("mcp__")) return undefined;
    const parts = name.split("__");
    if (parts.length >= 3) {
      return {
        server: parts[1]!,
        tool: parts.slice(2).join("__"),
      };
    }
    return undefined;
  }

  /**
   * 生成 LLM 工具定义列表
   * 仅包含 name/description/inputSchema
   */
  getToolDefinitions(config: Settings): ToolDefinition[] {
    return this.listEnabled(config).map((spec) => ({
      name: spec.name,
      description: spec.description,
      inputSchema: spec.inputSchema,
    }));
  }

  /**
   * 规范化工具名: 剥离 mcp__ 前缀用于查找
   * "mcp__server__tool" → "tool"
   * "mcp__server__multi__part" → "multi__part"
   * 逆向: Xf
   */
  normalizeToolName(name: string): string {
    if (name.startsWith("mcp__")) {
      const parts = name.split("__");
      if (parts.length >= 3) {
        return parts.slice(2).join("__");
      }
    }
    return name;
  }

  // ─── CLI Tool Filters ──────────────────────────────────
  // 逆向: amp's --allowed-tools / --disallowed-tools CLI flags
  // (chunk-002.js:29927 — `let p = o.tools || o["allowed-tools"]`)
  // Applied on top of config-based enable/disable in listEnabled().

  private cliFilters?: CliToolFilters;

  /** Set CLI-level tool filters (from --allowed-tools / --disallowed-tools flags) */
  setCliFilters(opts: CliToolFilters): void {
    this.cliFilters = opts;
  }

  /** Get current CLI-level tool filters */
  getCliFilters(): CliToolFilters | undefined {
    return this.cliFilters;
  }

  /**
   * Create a filtered view of this registry that only contains tools
   * matching the given patterns. Used for subagent tool isolation.
   *
   * 逆向: _5R (modules/1362_unknown__5R.js) — creates a filtered tool service
   *   wrapper that proxies the real service, blocking tools outside the patterns.
   *   Uses izT (modules/1361_unknown_izT.js) for glob-style matching.
   *
   * The returned registry is a snapshot — tools registered later on the parent
   * registry are NOT visible. This matches amp's behavior where the filtered
   * service is created once per subagent spawn and never updated.
   *
   * @param patterns - Glob patterns for allowed tool names (e.g., ["Grep", "Read", "Bash"])
   *                   ["*"] means all tools (no filtering).
   */
  createFilteredRegistry(patterns: string[]): ToolRegistry {
    // ["*"] means no filtering — return a clone with all tools
    if (patterns.length === 1 && patterns[0] === "*") {
      const clone = new ToolRegistry();
      for (const tool of this.tools.values()) {
        clone.register(tool);
      }
      return clone;
    }

    const filtered = new ToolRegistry();
    for (const tool of this.tools.values()) {
      if (matchToolPattern(tool.name, patterns)) {
        filtered.register(tool);
      }
    }
    return filtered;
  }
}

/**
 * CLI-level tool filters: applied from --allowed-tools / --disallowed-tools CLI flags.
 * These are applied in addition to config-based tools.enable / tools.disable.
 *
 * 逆向: amp-cli-reversed/chunk-002.js:29927
 *   `let p = o.tools || o["allowed-tools"]`
 */
export interface CliToolFilters {
  /** If set, only these tools are allowed (allowlist) */
  allowedTools?: string[];
  /** If set, these tools are blocked (blocklist) */
  disallowedTools?: string[];
}
