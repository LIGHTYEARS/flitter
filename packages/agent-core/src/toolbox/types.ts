/**
 * @flitter/agent-core — Toolbox system types
 *
 * Types for user-provided shell-script tools registered via the TOOLBOX_ACTION protocol.
 *
 * 逆向: S5R (modules/1371_Toolbox_S5R.js) — status/tool info types
 *       chunk-002.js:30464-30546 (C5R) — describe result shape
 */

// ─── Describe output ──────────────────────────────────────

/**
 * JSON shape returned by a toolbox script when TOOLBOX_ACTION=describe.
 *
 * 逆向: chunk-002.js:30498-30527 — the parsed JSON from C5R()
 */
export interface ToolboxToolSpec {
  /** Tool name (will be prefixed with tb__) */
  name: string;
  /** Human-readable description */
  description: string;
  /** JSON Schema for tool input (optional — defaults to empty object) */
  inputSchema?: Record<string, unknown>;
  /** Legacy "args" map (converted to inputSchema by describe probe) */
  args?: Record<string, unknown>;
  /** Optional metadata */
  meta?: Record<string, unknown>;
}

// ─── Legacy text format ──────────────────────────────────

/**
 * Parsed legacy text-format describe output (line-based key:value).
 *
 * 逆向: chunk-002.js:30120-30172 ($5R)
 */
export interface LegacyTextSpec {
  name: string;
  description: string;
  parameters: Record<
    string,
    { type: string; description: string; optional: boolean }
  >;
}

// ─── Registration status ──────────────────────────────────

/** Status of a single toolbox tool during scanning */
export type ToolboxToolStatus = "pending" | "registered" | "failed" | "duplicate";

/**
 * Info about a discovered toolbox tool.
 *
 * 逆向: S5R status tracking — `k` array pushed into `n[P].tools`
 */
export interface ToolboxToolInfo {
  name: string;
  description: string;
  status: ToolboxToolStatus;
  error?: string;
}

// ─── Service status ───────────────────────────────────────

/** Overall toolbox service status */
export interface ToolboxStatus {
  type: "initializing" | "ready";
  toolCount?: number;
}

// ─── Describe result ──────────────────────────────────────

/** Result from probing a single script (includes the detected format) */
export interface DescribeResult {
  spec: ToolboxToolSpec;
  format: "json" | "text";
}

// ─── Execute result ───────────────────────────────────────

/** Result of executing a toolbox script */
export interface ToolboxExecuteResult {
  output: string;
  exitCode: number;
  truncated: boolean;
}
