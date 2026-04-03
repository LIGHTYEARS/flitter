// Barrel export for tool-call infrastructure modules and widgets.
//
// Re-exports all utility types, constants, functions, and widget classes
// used by tool-call renderers. Additional widget exports are added in
// Plans 18-03 and 18-04 as specialized renderers are created.

export type { BaseToolProps } from './base-tool-props';
export * from './truncation-limits';
export * from './tool-output-utils';
export {
  TOOL_NAME_MAP,
  resolveToolName,
  resolveToolDisplayName,
  setCwd,
  shortenPath,
  extractTitleDetail,
} from './resolve-tool-name';

// Widget exports (Plan 18-02)
export { ToolHeader } from './tool-header';
export { GenericToolCard } from './generic-tool-card';
export { ToolCallWidget } from './tool-call-widget';
export { toolStatusIcon, todoStatusIcon, arrowIcon } from './tool-icons';
