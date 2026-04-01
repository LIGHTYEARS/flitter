/**
 * Semantic icon names.
 *
 * Keep this list small and semantic. Avoid embedding glyph decisions in code.
 */
export type IconName =
  | 'status.warning'
  | 'status.processing'
  | 'disclosure.collapsed'
  | 'disclosure.expanded'
  | 'tool.status.done'
  | 'tool.status.error'
  | 'tool.status.pending'
  | 'plan.status.completed'
  | 'plan.status.in_progress'
  | 'plan.status.pending'
  | 'todo.status.pending'
  | 'todo.status.in_progress'
  | 'todo.status.completed'
  | 'todo.status.cancelled'
  | 'arrow.right';

export type IconMap = Record<IconName, string>;
