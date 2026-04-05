// Central tool registry for flitter-cli.
//
// Maps tool names to their definitions and executors.
// The agentic loop queries this registry to:
// 1. Get all ToolDefinitions to send to the LLM
// 2. Look up executors when the LLM returns tool_use blocks
// 3. Check permission requirements before execution

import type { ToolDefinition } from '../state/types';
import type { RegisteredTool, ToolExecutor, PermissionLevel } from './executor';
import { log } from '../utils/logger';

/**
 * ToolRegistry is the single source of truth for available tools.
 *
 * Tools are registered at startup and remain fixed for the session.
 * The registry provides:
 * - Tool definitions for the LLM (getDefinitions)
 * - Executor lookup by name (getExecutor)
 * - Permission checks (requiresPermission)
 */
export class ToolRegistry {
  private _tools: Map<string, RegisteredTool> = new Map();

  /** Register a tool with its definition and executor. */
  register(tool: RegisteredTool): void {
    const name = tool.definition.name;
    if (this._tools.has(name)) {
      log.warn(`ToolRegistry: overwriting existing tool '${name}'`);
    }
    this._tools.set(name, tool);
    log.info(`ToolRegistry: registered tool '${name}'`);
  }

  /** Get a registered tool by name, or undefined if not found. */
  get(name: string): RegisteredTool | undefined {
    return this._tools.get(name);
  }

  /** Get the executor for a tool by name, or undefined if not found. */
  getExecutor(name: string): ToolExecutor | undefined {
    return this._tools.get(name)?.executor;
  }

  /** Check whether a tool requires permission before execution. */
  requiresPermission(name: string): boolean {
    return this._tools.get(name)?.requiresPermission ?? true;
  }

  /**
   * Get the fine-grained permission level for a tool.
   *
   * Resolution order:
   * 1. Explicit `permissionLevel` on the RegisteredTool (if set)
   * 2. Legacy `requiresPermission` boolean (true -> 'confirm', false -> 'auto')
   * 3. Default: 'confirm' (conservative — unknown tools require confirmation)
   */
  getPermissionLevel(name: string): PermissionLevel {
    const tool = this._tools.get(name);
    if (!tool) return 'confirm';  // Unknown tools default to confirm
    if (tool.permissionLevel !== undefined) return tool.permissionLevel;
    return tool.requiresPermission ? 'confirm' : 'auto';
  }

  /**
   * Set the permission level for an already-registered tool.
   * Throws if the tool is not registered.
   */
  setPermissionLevel(name: string, level: PermissionLevel): void {
    const existing = this._tools.get(name);
    if (!existing) {
      throw new Error(`Cannot set permission level for unknown tool: ${name}`);
    }
    this._tools.set(name, {
      ...existing,
      permissionLevel: level,
      requiresPermission: level === 'confirm',
    });
    log.info(`ToolRegistry: set permission level for '${name}' to '${level}'`);
  }

  /** Get all tool definitions for sending to the LLM. */
  getDefinitions(): ToolDefinition[] {
    const defs: ToolDefinition[] = [];
    for (const tool of this._tools.values()) {
      defs.push(tool.definition);
    }
    return defs;
  }

  /** Get all registered tool names. */
  getNames(): string[] {
    return Array.from(this._tools.keys());
  }

  /** Number of registered tools. */
  get size(): number {
    return this._tools.size;
  }

  /** Check if a tool is registered. */
  has(name: string): boolean {
    return this._tools.has(name);
  }

  /**
   * Replace the executor for an already-registered tool.
   * Throws if the tool is not registered.
   */
  replaceExecutor(name: string, executor: ToolExecutor): void {
    const existing = this._tools.get(name);
    if (!existing) {
      throw new Error(`Cannot replace executor for unknown tool: ${name}`);
    }
    this._tools.set(name, { ...existing, executor });
    log.info(`ToolRegistry: replaced executor for '${name}'`);
  }
}
