// Flitter: A Flutter-faithful TUI framework for TypeScript
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
export { DialogOverlay } from './widgets/dialog-overlay';
export type { DialogOverlayStyle } from './widgets/dialog-overlay';
export { SelectionList, SelectionListState } from './widgets/selection-list';
export type { SelectionItem } from './widgets/selection-list';
export { DiffView } from './widgets/diff-view';
export type { DiffLine, DiffHunk, WordDiff } from './widgets/diff-view';
export { Markdown } from './widgets/markdown';
export type { MarkdownBlockType, MarkdownBlock, InlineSegment } from './widgets/markdown';
export { CollapsibleDrawer, CollapsibleDrawerState } from './widgets/collapsible-drawer';
export { AnimatedExpandSection, AnimatedExpandSectionState } from './widgets/animated-expand-section';
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

// Pipeline debug sink redirection
export { setPipelineLogSink, resetPipelineLogSink } from './diagnostics/pipeline-debug';

// Phase 22: Minor Fidelity Fixes
export { estimateIntrinsicWidth } from './layout/layout-helpers';

// Phase 9: Core TUI Capability Strengthening
// Painting utilities
export {
  BOX_DRAWING,
  drawHorizontalDivider,
  drawVerticalDivider,
  drawGridBorder,
} from './painting/border-painter';
export type { BoxDrawingChars, BoxDrawingStyle, BorderPaintStyle } from './painting/border-painter';
// Backward-compatible alias: BorderStyle -> BoxDrawingStyle (Gap 31 consolidation)
export type { BoxDrawingStyle as BorderStyle } from './painting/border-painter';
export {
  paintTreeConnectors,
  treeConnectorWidth,
  TREE_CHARS_SOLID,
  TREE_CHARS_ROUNDED,
} from './painting/tree-connector';
export type { TreeChars, TreeConnectorOpts } from './painting/tree-connector';

// Grid border widget (multi-pane bordered container)
export { GridBorder } from './widgets/grid-border';
export { RenderGridBorder } from './layout/render-grid-border';
export type { GridBorderConfig } from './layout/render-grid-border';

// N-column data table
export { DataTable, TableColumnWidth } from './widgets/table';
export { RenderTable } from './layout/render-table';
export type { TableConfig, TableCellParentData } from './layout/render-table';

// BrailleSpinner utility
export { BrailleSpinner } from './utilities/braille-spinner';

// WaveSpinner widget (animated wave character cycling)
export { WaveSpinner, WaveSpinnerState } from './widgets/wave-spinner';

// ForceDim inherited widget
export { ForceDim } from './widgets/force-dim';

// Autocomplete
export { Autocomplete } from './widgets/autocomplete';
export type { AutocompleteOption, AutocompleteTrigger } from './widgets/autocomplete';

// StickyHeader widget (header pinned to viewport top on scroll)
export { StickyHeader } from './widgets/sticky-header';
export { RenderStickyHeader } from './layout/render-sticky-header';

// Framework: ProxyWidget and ProxyElement (Gap F06)
export { ProxyWidget } from './framework/widget';
export { ProxyElement } from './framework/element';

// Framework: InheritedModel and InheritedModelElement (Gap F08)
export { InheritedModel } from './framework/widget';
export { InheritedModelElement } from './framework/element';

// Framework: ErrorWidget (Gap F05)
export { ErrorWidget, RenderErrorBox } from './framework/error-widget';
export type { FlutterErrorDetails, ErrorWidgetBuilder } from './framework/error-widget';

// Gap R02: RepaintBoundary -- cached subtree painting
export { RepaintBoundary } from './widgets/repaint-boundary';
export { RenderRepaintBoundary } from './rendering/render-repaint-boundary';
export { CellLayer } from './rendering/cell-layer';

// Builder and LayoutBuilder (Gap 18)
export { Builder, LayoutBuilder, LayoutBuilderElement, RenderLayoutBuilder } from './widgets/builder';

// Gap 32: Standalone ConstrainedBox widget
export { ConstrainedBox } from './widgets/constrained-box';

// Gap R09: Responsive Breakpoints
export {
  Breakpoints,
  BreakpointTheme,
  ResponsiveBuilder,
  ResponsiveSwitch,
  responsiveValue,
} from './widgets/breakpoints';
export type {
  WidthBreakpoint,
  HeightBreakpoint,
  TerminalOrientation,
  BreakpointState,
  WidthBreakpointConfig,
  HeightBreakpointConfig,
  BreakpointConfig,
} from './widgets/breakpoints';

// Gap #65: Animation framework (ANIM-01, ANIM-02)
export { Ticker } from './animation/ticker';
export type { TickerCallback } from './animation/ticker';
export { AnimationController } from './animation/animation-controller';
export type { AnimationStatus, AnimationStatusListener } from './animation/animation-controller';
export { Curve, Curves, Interval } from './animation/curves';
