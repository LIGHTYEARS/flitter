// BaseToolProps — shared props interface for all tool renderers
// Ensures onToggle (and any future common props) propagate uniformly
// to all specialized renderers, preventing silent omission bugs.

import type { ToolCallItem } from '../../acp/types';

// Re-export so renderers can import ToolCallItem from the same module
export type { ToolCallItem };

/**
 * Base props shared by all tool renderers.
 * Any new common prop added here will automatically be required
 * in all specialized renderer constructors via TypeScript extends.
 */
export interface BaseToolProps {
  toolCall: ToolCallItem;
  isExpanded: boolean;
  onToggle?: () => void;
}
