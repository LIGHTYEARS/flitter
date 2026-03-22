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

// Phase 16: AppTheme & Syntax Highlighting
export { AppTheme } from './widgets/app-theme';
export type { AppThemeData, SyntaxHighlightConfig } from './widgets/app-theme';
export { syntaxHighlight, detectLanguage } from './widgets/syntax-highlight';

// Phase 12: Core Missing Widgets
export { FocusScope } from './widgets/focus-scope';
export { ClipRect, RenderClipRect } from './widgets/clip-rect';
export { Scrollbar, RenderScrollbar } from './widgets/scrollbar';
export type { ScrollInfo } from './widgets/scrollbar';
export { IntrinsicHeight, RenderIntrinsicHeight } from './widgets/intrinsic-height';

// Phase 13: Advanced Widgets
export { Dialog } from './widgets/dialog';
export type { DialogType, FooterStyle, DialogButton, DialogDimensions } from './widgets/dialog';
export { SelectionList, SelectionListState } from './widgets/selection-list';
export type { SelectionItem } from './widgets/selection-list';
export { DiffView } from './widgets/diff-view';
export { Markdown } from './widgets/markdown';
export { ContainerWithOverlays } from './widgets/container-with-overlays';
export type { OverlayPosition, OverlayAlignment, OverlaySpec } from './widgets/container-with-overlays';

// Phase 14: RenderText Advanced
export { Text, RenderText } from './widgets/text';
export type { TextSelectionRange, CharacterPosition, VisualLine, CharacterInteraction, TextPaintContext } from './widgets/text';

// Phase 19: Image Protocol
export { ImagePreview, ImagePreviewState, ImagePreviewProvider, KittyImageWidget, RenderKittyImage } from './widgets/image-preview';
export type { ImagePreviewData } from './widgets/image-preview';
export { encodeKittyGraphics, buildKittyGraphicsPayload, uint8ArrayToBase64, splitIntoChunks, KITTY_CHUNK_SIZE } from './widgets/image-preview';

// Phase 15: Debug Inspector
export { DebugInspector, serializeElementTree, serializeFocusTree, findElementById, buildRenderObjectToElementMap, resetStableIds } from './diagnostics/debug-inspector';
export type { ElementNodeJson, RenderObjectJson, FocusNodeJson, KeystrokeEntry } from './diagnostics/debug-inspector';

// Phase 22: Minor Fidelity Fixes
export { estimateIntrinsicWidth } from './layout/layout-helpers';
