// Flutter-TUI: A Flutter-faithful TUI framework for TypeScript
// Public API — re-exports all user-facing types and functions

// Phase 1: Core Primitives
export { Offset, Size, Rect } from './core/types';
export { Color } from './core/color';
export type { ColorMode } from './core/color';
export { TextStyle } from './core/text-style';
export { TextSpan } from './core/text-span';
export type { TextSpanHyperlink } from './core/text-span';
export { wcwidth, stringWidth } from './core/wcwidth';
export { BoxConstraints } from './core/box-constraints';
export { Key, ValueKey, UniqueKey, GlobalKey } from './core/key';

// Phase 10: Infrastructure Layer
export { MediaQueryData, MediaQuery } from './widgets/media-query';
export type { TerminalCapabilities } from './widgets/media-query';
export { Theme } from './widgets/theme';
export type { ThemeData } from './widgets/theme';
export { HoverContext } from './widgets/hover-context';
