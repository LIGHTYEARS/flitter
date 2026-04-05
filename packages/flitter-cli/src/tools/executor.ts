// Tool executor interface and result types for flitter-cli.
//
// Each tool implements ToolExecutor to handle invocations from the agentic loop.
// The executor receives parsed input, runs the operation, and returns a result
// that is serialized back into a tool_result content block.

import type { ToolDefinition } from '../state/types';

/**
 * Permission level controlling how a tool is approved before execution.
 *
 * - 'auto': The tool is safe to run without user interaction (read-only ops).
 * - 'confirm': The tool requires explicit user confirmation before running (writes, shell).
 * - 'deny': The tool is blocked from execution entirely.
 */
export type PermissionLevel = 'auto' | 'confirm' | 'deny';

/**
 * Result of executing a tool.
 * The agentic loop converts this into a tool_result content block.
 */
export interface ToolResult {
  /** The text content to return to the model. */
  content: string;
  /** Whether the execution failed (maps to is_error in tool_result). */
  isError?: boolean;
}

/**
 * Context provided to tool executors during execution.
 * Contains session-level information needed by most tools.
 */
export interface ToolContext {
  /** Current working directory for the session. */
  cwd: string;
  /** AbortSignal for cooperative cancellation. */
  abortSignal?: AbortSignal;
  /**
   * Request user permission before executing a potentially destructive operation.
   * Returns true if approved, false if denied.
   */
  requestPermission?: (description: string) => Promise<boolean>;
  /** Callback to update the session's plan entries (used by TodoWrite). */
  onPlanUpdate?: (entries: Array<{content: string; status: string; priority: string}>) => void;
}

/**
 * A tool executor handles the actual execution of a specific tool.
 *
 * Executors are registered in the ToolRegistry and invoked by the agentic loop
 * when the model emits a tool_use content block.
 *
 * Each executor:
 * - Validates and parses tool input
 * - Performs the operation (file I/O, shell exec, search, etc.)
 * - Returns a ToolResult with the output text
 * - Handles errors gracefully (returns isError: true instead of throwing)
 */
export interface ToolExecutor {
  /** Execute the tool with the given input and context. */
  execute(input: Record<string, unknown>, context: ToolContext): Promise<ToolResult>;
}

/**
 * A tool definition bundled with its executor.
 * This is what gets registered in the ToolRegistry.
 */
export interface RegisteredTool {
  /** The tool definition sent to the LLM (name, description, schema). */
  definition: ToolDefinition;
  /** The executor that handles invocations. */
  executor: ToolExecutor;
  /**
   * Whether this tool requires user permission before execution.
   * When true, the agentic loop must call requestPermission() before running.
   * @deprecated Use `permissionLevel` instead. Kept for backward compatibility.
   */
  requiresPermission: boolean;
  /**
   * Fine-grained permission level for this tool.
   *
   * - 'auto': run without user interaction
   * - 'confirm': require explicit user confirmation
   * - 'deny': block execution entirely
   *
   * When not specified, falls back to `requiresPermission` (true -> 'confirm', false -> 'auto').
   */
  permissionLevel?: PermissionLevel;
}
