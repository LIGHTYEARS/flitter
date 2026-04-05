// Interrupted thinking indicator (N11).
//
// Returns a text indicator for the current thinking state.

/** Thinking process states. */
export type ThinkingState = 'thinking' | 'interrupted' | 'done';

/**
 * Get a text indicator for the current thinking state.
 *
 * thinking    -> "[ thinking ]"
 * interrupted -> "[ interrupted ]"
 * done        -> "" (empty string)
 */
export function getThinkingIndicator(state: ThinkingState): string {
  switch (state) {
    case 'thinking':
      return '[ thinking ]';
    case 'interrupted':
      return '[ interrupted ]';
    case 'done':
      return '';
  }
}
