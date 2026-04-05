// Contextual status message utility (I13).
//
// Produces a human-readable status string based on the current session
// lifecycle and active tool calls. Used by the status bar widget.

import type { SessionLifecycle } from '../state/types';

/** Session-like object accepted by getStatusMessage. */
export interface StatusSession {
  lifecycle: SessionLifecycle;
  activeToolCalls?: string[];
  /** The name of the currently active tool (e.g. "Bash", "Task"). */
  activeToolName?: string;
  /** Current context window usage as a percentage (0-100). */
  contextUsagePercent?: number;
  /** Whether the session is currently auto-compacting context. */
  isCompacting?: boolean;
}

/**
 * Return a contextual status message for the current session state.
 *
 * Mapping:
 *   idle                              → "Ready"
 *   streaming                         → "Thinking..."
 *   processing (no active tools)      → "Processing..."
 *   processing (with active tools)    → "Running tool: <toolName>"
 *   tool_execution (no active tools)  → "Running tools..."
 *   tool_execution (with active tools)→ "Running tool: <toolName>"
 *   complete                          → "Done"
 *   error                             → "Error"
 *   cancelled                         → "Cancelled"
 *
 * AMP sub-state overrides (checked first during processing/tool_execution):
 *   isCompacting                      → "Compacting context..."
 *   activeToolName === "Bash"         → "Executing command..."
 *   activeToolName === "Task"         → "Running sub-agent..."
 *
 * Context usage warning:
 *   contextUsagePercent > 80          → appends " (high context usage)"
 */
export function getStatusMessage(session: StatusSession): string {
  // Auto-compacting takes priority over everything except terminal states.
  if (session.isCompacting) {
    return 'Compacting context...';
  }

  switch (session.lifecycle) {
    case 'idle':
      return 'Ready';

    case 'streaming':
      return appendContextWarning('Thinking...', session);

    case 'processing':
    case 'tool_execution': {
      const base = getToolStatusMessage(session);
      return appendContextWarning(base, session);
    }

    case 'complete':
      return 'Done';

    case 'error':
      return 'Error';

    case 'cancelled':
      return 'Cancelled';

    default:
      return 'Ready';
  }
}

/**
 * Derive the tool-specific status message during processing/tool_execution.
 *
 * Priority:
 *   1. activeToolName === "Bash"  → "Executing command..."
 *   2. activeToolName === "Task"  → "Running sub-agent..."
 *   3. activeToolCalls present    → "Running tool: <first>"
 *   4. Fallback per lifecycle
 */
function getToolStatusMessage(session: StatusSession): string {
  const toolName = session.activeToolName;
  if (toolName === 'Bash') return 'Executing command...';
  if (toolName === 'Task') return 'Running sub-agent...';

  const tools = session.activeToolCalls;
  if (tools && tools.length > 0) {
    return `Running tool: ${tools[0]}`;
  }
  return session.lifecycle === 'tool_execution'
    ? 'Running tools...'
    : 'Processing...';
}

/**
 * Append a high-context-usage warning when contextUsagePercent > 80.
 */
function appendContextWarning(message: string, session: StatusSession): string {
  const pct = session.contextUsagePercent;
  if (pct !== undefined && pct > 80) {
    return `${message} (high context usage)`;
  }
  return message;
}
