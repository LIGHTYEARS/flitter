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
  | 'reject_always';

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
}

/**
 * Result of a permission dialog interaction.
 * A string optionId when the user selects an option,
 * or null when the user dismisses without selecting (Escape).
 */
export type PermissionResult = string | null;
