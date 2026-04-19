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
   */
  private _isToolEnabled(spec: ToolSpec, config: Settings): boolean {
    // Dynamic enable check
    if (spec.isEnabled && !spec.isEnabled(config)) {
      return false;
    }

    // Config disable list
    const disabled = config["tools.disable"];
    if (disabled?.includes(spec.name)) {
      return false;
    }

    // Config enable whitelist (if present, only allow whitelisted tools)
    const enabled = config["tools.enable"];
    if (enabled && !enabled.includes(spec.name)) {
      return false;
    }

    return true;
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
}
