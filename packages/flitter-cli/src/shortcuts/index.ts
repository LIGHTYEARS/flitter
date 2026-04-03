// shortcuts/index.ts -- Re-exports for the shortcut system
//
// Barrel module for convenient imports from flitter-cli/src/shortcuts.

export { ShortcutRegistry } from './registry';
export type {
  ShortcutContext,
  ShortcutHooks,
  ShortcutCategory,
  ShortcutEntry,
} from './registry';
export { registerDefaultShortcuts } from './defaults';
