// Permission types — native type definitions for tool permission dialogs
//
// Defines the request/option/result types used by the PermissionDialog overlay
// and AppState's promise-based permission flow. These are native flitter-cli types
// with zero ACP SDK dependency. When tool execution is implemented (Phase 18),
// the tool dispatch layer constructs PermissionRequests from its own metadata.

/**
 * A permission request for a tool call that needs user approval.
 * Shown in the PermissionDialog overlay; the caller awaits the result.
 */
export interface PermissionRequest {
  /** Unique identifier for this request (for matching response). */
  readonly requestId: string;
  /** The tool call requiring approval. */
  readonly toolCall: {
    readonly title: string;
    readonly kind: string;
  };
  /** The available response options. */
  readonly options: readonly PermissionOption[];
}

/**
 * A single option in a permission dialog.
 */
export interface PermissionOption {
  readonly optionId: string;
  readonly name: string;
  /** Display description derived from the option kind. */
  readonly description: string;
}

/**
 * Result of a permission dialog interaction.
 * A string optionId when the user selects an option,
 * or null when the user dismisses without selecting (Escape).
 */
export type PermissionResult = string | null;
