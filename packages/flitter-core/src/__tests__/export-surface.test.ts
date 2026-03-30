// Export Surface Guard — prevents accidental removal of public API surface
//
// This test imports from the flitter-core barrel (index.ts) and asserts that
// every key export exists. If a refactoring accidentally removes or renames a
// public API symbol, this test will catch it immediately.
//
// Gap #71: Comprehensive test coverage plan — test guardrails

import { describe, it, expect } from 'bun:test';
import * as FlitterCore from '../index';

describe('Export Surface Guard — flitter-core public API', () => {
  // -------------------------------------------------------------------------
  // Phase 1: Core Primitives
  // -------------------------------------------------------------------------

  describe('core primitives', () => {
    it('exports Offset, Size, Rect', () => {
      expect(FlitterCore.Offset).toBeDefined();
      expect(FlitterCore.Size).toBeDefined();
      expect(FlitterCore.Rect).toBeDefined();
    });

    it('exports Color', () => {
      expect(FlitterCore.Color).toBeDefined();
    });

    it('exports TextStyle', () => {
      expect(FlitterCore.TextStyle).toBeDefined();
    });

    it('exports TextSpan', () => {
      expect(FlitterCore.TextSpan).toBeDefined();
    });

    it('exports wcwidth and stringWidth', () => {
      expect(FlitterCore.wcwidth).toBeDefined();
      expect(typeof FlitterCore.wcwidth).toBe('function');
      expect(FlitterCore.stringWidth).toBeDefined();
      expect(typeof FlitterCore.stringWidth).toBe('function');
    });

    it('exports BoxConstraints', () => {
      expect(FlitterCore.BoxConstraints).toBeDefined();
    });

    it('exports Key, ValueKey, UniqueKey, GlobalKey', () => {
      expect(FlitterCore.Key).toBeDefined();
      expect(FlitterCore.ValueKey).toBeDefined();
      expect(FlitterCore.UniqueKey).toBeDefined();
      expect(FlitterCore.GlobalKey).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Framework: Widget hierarchy
  // -------------------------------------------------------------------------

  describe('framework widgets', () => {
    it('exports ProxyWidget', () => {
      expect(FlitterCore.ProxyWidget).toBeDefined();
    });

    it('exports InheritedModel', () => {
      expect(FlitterCore.InheritedModel).toBeDefined();
    });

    it('exports ErrorWidget and RenderErrorBox', () => {
      expect(FlitterCore.ErrorWidget).toBeDefined();
      expect(FlitterCore.RenderErrorBox).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Framework: Element hierarchy
  // -------------------------------------------------------------------------

  describe('framework elements', () => {
    it('exports ProxyElement', () => {
      expect(FlitterCore.ProxyElement).toBeDefined();
    });

    it('exports InheritedModelElement', () => {
      expect(FlitterCore.InheritedModelElement).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  describe('rendering', () => {
    it('exports RepaintBoundary widget', () => {
      expect(FlitterCore.RepaintBoundary).toBeDefined();
    });

    it('exports RenderRepaintBoundary', () => {
      expect(FlitterCore.RenderRepaintBoundary).toBeDefined();
    });

    it('exports CellLayer', () => {
      expect(FlitterCore.CellLayer).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Animation framework
  // -------------------------------------------------------------------------

  describe('animation', () => {
    it('exports AnimationController', () => {
      expect(FlitterCore.AnimationController).toBeDefined();
    });

    it('exports Ticker', () => {
      expect(FlitterCore.Ticker).toBeDefined();
    });

    it('exports Curves and Curve', () => {
      expect(FlitterCore.Curves).toBeDefined();
      expect(FlitterCore.Curve).toBeDefined();
    });

    it('exports Interval', () => {
      expect(FlitterCore.Interval).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Widgets: Layout and structure
  // -------------------------------------------------------------------------

  describe('widgets — layout and structure', () => {
    it('exports ConstrainedBox', () => {
      expect(FlitterCore.ConstrainedBox).toBeDefined();
    });

    it('exports Builder and LayoutBuilder', () => {
      expect(FlitterCore.Builder).toBeDefined();
      expect(FlitterCore.LayoutBuilder).toBeDefined();
    });

    it('exports LayoutBuilderElement and RenderLayoutBuilder', () => {
      expect(FlitterCore.LayoutBuilderElement).toBeDefined();
      expect(FlitterCore.RenderLayoutBuilder).toBeDefined();
    });

    it('exports AnimatedExpandSection and AnimatedExpandSectionState', () => {
      expect(FlitterCore.AnimatedExpandSection).toBeDefined();
      expect(FlitterCore.AnimatedExpandSectionState).toBeDefined();
    });

    it('exports ContainerWithOverlays', () => {
      expect(FlitterCore.ContainerWithOverlays).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Widgets: Responsive / Breakpoints
  // -------------------------------------------------------------------------

  describe('widgets — responsive breakpoints', () => {
    it('exports Breakpoints', () => {
      expect(FlitterCore.Breakpoints).toBeDefined();
    });

    it('exports BreakpointTheme', () => {
      expect(FlitterCore.BreakpointTheme).toBeDefined();
    });

    it('exports ResponsiveBuilder and ResponsiveSwitch', () => {
      expect(FlitterCore.ResponsiveBuilder).toBeDefined();
      expect(FlitterCore.ResponsiveSwitch).toBeDefined();
    });

    it('exports responsiveValue function', () => {
      expect(FlitterCore.responsiveValue).toBeDefined();
      expect(typeof FlitterCore.responsiveValue).toBe('function');
    });
  });

  // -------------------------------------------------------------------------
  // Widgets: Infrastructure Layer (MediaQuery, Theme, etc.)
  // -------------------------------------------------------------------------

  describe('widgets — infrastructure layer', () => {
    it('exports MediaQueryData and MediaQuery', () => {
      expect(FlitterCore.MediaQueryData).toBeDefined();
      expect(FlitterCore.MediaQuery).toBeDefined();
    });

    it('exports Theme', () => {
      expect(FlitterCore.Theme).toBeDefined();
    });

    it('exports HoverContext', () => {
      expect(FlitterCore.HoverContext).toBeDefined();
    });

    it('exports AppTheme', () => {
      expect(FlitterCore.AppTheme).toBeDefined();
    });

    it('exports syntaxHighlight and detectLanguage', () => {
      expect(FlitterCore.syntaxHighlight).toBeDefined();
      expect(typeof FlitterCore.syntaxHighlight).toBe('function');
      expect(FlitterCore.detectLanguage).toBeDefined();
      expect(typeof FlitterCore.detectLanguage).toBe('function');
    });
  });

  // -------------------------------------------------------------------------
  // Widgets: Core missing widgets (Phase 12)
  // -------------------------------------------------------------------------

  describe('widgets — core missing widgets', () => {
    it('exports FocusScope', () => {
      expect(FlitterCore.FocusScope).toBeDefined();
    });

    it('exports ClipRect and RenderClipRect', () => {
      expect(FlitterCore.ClipRect).toBeDefined();
      expect(FlitterCore.RenderClipRect).toBeDefined();
    });

    it('exports Scrollbar and RenderScrollbar', () => {
      expect(FlitterCore.Scrollbar).toBeDefined();
      expect(FlitterCore.RenderScrollbar).toBeDefined();
    });

    it('exports IntrinsicHeight and RenderIntrinsicHeight', () => {
      expect(FlitterCore.IntrinsicHeight).toBeDefined();
      expect(FlitterCore.RenderIntrinsicHeight).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Widgets: Advanced (Phase 13)
  // -------------------------------------------------------------------------

  describe('widgets — advanced', () => {
    it('exports Dialog', () => {
      expect(FlitterCore.Dialog).toBeDefined();
    });

    it('exports DialogOverlay', () => {
      expect(FlitterCore.DialogOverlay).toBeDefined();
    });

    it('exports SelectionList and SelectionListState', () => {
      expect(FlitterCore.SelectionList).toBeDefined();
      expect(FlitterCore.SelectionListState).toBeDefined();
    });

    it('exports DiffView', () => {
      expect(FlitterCore.DiffView).toBeDefined();
    });

    it('exports Markdown', () => {
      expect(FlitterCore.Markdown).toBeDefined();
    });

    it('exports CollapsibleDrawer and CollapsibleDrawerState', () => {
      expect(FlitterCore.CollapsibleDrawer).toBeDefined();
      expect(FlitterCore.CollapsibleDrawerState).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Text and RenderText
  // -------------------------------------------------------------------------

  describe('text', () => {
    it('exports Text and RenderText', () => {
      expect(FlitterCore.Text).toBeDefined();
      expect(FlitterCore.RenderText).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Image Preview
  // -------------------------------------------------------------------------

  describe('image preview', () => {
    it('exports ImagePreview and ImagePreviewState', () => {
      expect(FlitterCore.ImagePreview).toBeDefined();
      expect(FlitterCore.ImagePreviewState).toBeDefined();
    });

    it('exports ImagePreviewProvider', () => {
      expect(FlitterCore.ImagePreviewProvider).toBeDefined();
    });

    it('exports KittyImageWidget and RenderKittyImage', () => {
      expect(FlitterCore.KittyImageWidget).toBeDefined();
      expect(FlitterCore.RenderKittyImage).toBeDefined();
    });

    it('exports Kitty graphics helpers', () => {
      expect(FlitterCore.encodeKittyGraphics).toBeDefined();
      expect(FlitterCore.buildKittyGraphicsPayload).toBeDefined();
      expect(FlitterCore.uint8ArrayToBase64).toBeDefined();
      expect(FlitterCore.splitIntoChunks).toBeDefined();
      expect(FlitterCore.KITTY_CHUNK_SIZE).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Painting
  // -------------------------------------------------------------------------

  describe('painting', () => {
    it('exports BOX_DRAWING and drawing helpers', () => {
      expect(FlitterCore.BOX_DRAWING).toBeDefined();
      expect(FlitterCore.drawHorizontalDivider).toBeDefined();
      expect(FlitterCore.drawVerticalDivider).toBeDefined();
      expect(FlitterCore.drawGridBorder).toBeDefined();
    });

    it('exports tree connector utilities', () => {
      expect(FlitterCore.paintTreeConnectors).toBeDefined();
      expect(FlitterCore.treeConnectorWidth).toBeDefined();
      expect(FlitterCore.TREE_CHARS_SOLID).toBeDefined();
      expect(FlitterCore.TREE_CHARS_ROUNDED).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Layout: Grid border, Table, StickyHeader
  // -------------------------------------------------------------------------

  describe('layout exports', () => {
    it('exports GridBorder widget and RenderGridBorder', () => {
      expect(FlitterCore.GridBorder).toBeDefined();
      expect(FlitterCore.RenderGridBorder).toBeDefined();
    });

    it('exports DataTable, TableColumnWidth, RenderTable', () => {
      expect(FlitterCore.DataTable).toBeDefined();
      expect(FlitterCore.TableColumnWidth).toBeDefined();
      expect(FlitterCore.RenderTable).toBeDefined();
    });

    it('exports StickyHeader and RenderStickyHeader', () => {
      expect(FlitterCore.StickyHeader).toBeDefined();
      expect(FlitterCore.RenderStickyHeader).toBeDefined();
    });

    it('exports estimateIntrinsicWidth', () => {
      expect(FlitterCore.estimateIntrinsicWidth).toBeDefined();
      expect(typeof FlitterCore.estimateIntrinsicWidth).toBe('function');
    });
  });

  // -------------------------------------------------------------------------
  // Utilities
  // -------------------------------------------------------------------------

  describe('utilities', () => {
    it('exports BrailleSpinner', () => {
      expect(FlitterCore.BrailleSpinner).toBeDefined();
    });

    it('exports ForceDim', () => {
      expect(FlitterCore.ForceDim).toBeDefined();
    });

    it('exports Autocomplete', () => {
      expect(FlitterCore.Autocomplete).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Diagnostics
  // -------------------------------------------------------------------------

  describe('diagnostics', () => {
    it('exports DebugInspector and helpers', () => {
      expect(FlitterCore.DebugInspector).toBeDefined();
      expect(FlitterCore.serializeElementTree).toBeDefined();
      expect(FlitterCore.serializeFocusTree).toBeDefined();
      expect(FlitterCore.findElementById).toBeDefined();
      expect(FlitterCore.buildRenderObjectToElementMap).toBeDefined();
      expect(FlitterCore.resetStableIds).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Aggregate export count guard
  // -------------------------------------------------------------------------

  describe('aggregate export count', () => {
    it('has at least 50 named exports (prevents wholesale removal)', () => {
      const exportCount = Object.keys(FlitterCore).length;
      expect(exportCount).toBeGreaterThanOrEqual(50);
    });
  });
});
