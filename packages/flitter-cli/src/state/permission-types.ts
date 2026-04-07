// Permission types -- native type definitions for tool permission dialogs
//
// Defines the request/option/result types used by the PermissionDialog overlay
// and AppState's promise-based permission flow. These are native flitter-cli
// types aligned with ACP SDK's RequestPermissionRequest structure. The tool
// dispatch layer constructs PermissionRequests from its own metadata.

/**
 * The kind of permission option presented to the user.
 * Matches ACP's PermissionOptionKind enum.
 */
export type PermissionOptionKind =
  | 'allow_once'
  | 'allow_always'
  | 'reject_once'
  | 'reject_always'
  | 'reject_with_feedback';

/**
 * A single option in a permission dialog.
 * Aligned with ACP SDK's PermissionOption type.
 */
export interface PermissionOption {
  /** Unique identifier for this permission option. */
  readonly optionId: string;
  /** Human-readable label to display to the user. */
  readonly name: string;
  /** Hint about the nature of this permission option. */
  readonly kind: PermissionOptionKind;
}

/**
 * The tool call context included in a permission request.
 * Aligned with the relevant fields of ACP SDK's ToolCallUpdate.
 */
export interface PermissionToolCall {
  /** Unique identifier for this tool call within the session. */
  readonly toolCallId: string;
  /** Human-readable title describing what the tool is doing. */
  readonly title: string;
  /** The category of tool being invoked (e.g. 'tool', 'bash', 'edit'). */
  readonly kind: string;
  /** The raw input passed to the tool (for display in the permission dialog). */
  readonly rawInput?: Readonly<Record<string, unknown>>;
}

/**
 * A permission request for a tool call that needs user approval.
 * Shown in the PermissionDialog overlay; the caller awaits the result.
 *
 * Aligned with ACP SDK's RequestPermissionRequest type:
 * - `requestId` maps to ACP's internal correlation ID
 * - `toolCall` carries the relevant ToolCallUpdate fields
 * - `options` carries PermissionOption[] with kind-based semantics
 */
export interface PermissionRequest {
  /** Unique identifier for this request (for matching response). */
  readonly requestId: string;
  /** The tool call requiring approval. */
  readonly toolCall: PermissionToolCall;
  /** The available response options. */
  readonly options: ReadonlyArray<PermissionOption>;
  /** Structured content preview for AMP-style HITL dialog (Phase 33). */
  readonly contentPreview?: PermissionContentPreview;
}

/**
 * Structured content preview displayed above options in the HITL dialog.
 * Matches AMP's formatConfirmationContent() output shape.
 */
export interface PermissionContentPreview {
  /** Title line (e.g., "Run this command?", "Allow editing file:"). */
  readonly header: string;
  /** Command string for bash tool calls (e.g., "sleep 60"). */
  readonly command?: string;
  /** Working directory for bash tool calls. */
  readonly cwd?: string;
  /** File path for edit/create tool calls. */
  readonly filePath?: string;
  /** Reason/rule text (e.g., "Matches built-in permissions rule 25: ask Bash"). */
  readonly reason?: string;
  /** Hint text (e.g., "Press ? for full command"). */
  readonly hint?: string;
  /** JSON preview for generic tool calls. */
  readonly json?: string;
}

/**
 * Result of a permission dialog interaction.
 * - String optionId for simple selection (backward-compatible)
 * - Compound object with feedback text for deny-with-feedback
 * - null when the user dismisses without selecting (Escape)
 */
export type PermissionResult =
  | string
  | { type: 'deny-with-feedback'; feedback: string }
  | null;
