// Barrel export for tool-call infrastructure modules.
//
// Re-exports all utility types, constants, and functions used by
// tool-call renderers. Tool widget exports will be added in Plans
// 18-02, 18-03, and 18-04 as they are created.

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
