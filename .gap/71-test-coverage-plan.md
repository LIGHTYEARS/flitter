# Gap TS-Final (Gap #71): Comprehensive Test Coverage Plan

## Problem

The flitter monorepo -- a Flutter-inspired TUI framework and ACP client -- has significant
test coverage gaps across both `flitter-core` and `flitter-amp`. While the project has an
established test infrastructure (bun:test runner, `__tests__/` directories, headless capture
utilities), many core framework modules, layout render objects, painting utilities, and
application-layer components remain untested or only partially tested.

A Flutter-class framework demands comprehensive test coverage at multiple levels:
- **Unit tests**: Every public class and function has isolated tests
- **Integration tests**: Widget-to-render-object pipelines are validated end-to-end
- **Regression tests**: Layout edge cases, constraint propagation, and lifecycle ordering
- **Visual snapshot tests**: Rendered output matches expected pixel grids

The current test count is approximately 80 test files across both packages, but critical
subsystems (reconciliation edge cases, several RenderObject subclasses, the painting module,
widget lifecycle integration, and most AMP-layer components) have zero or minimal coverage.

---

## Current Test Coverage Audit

### flitter-core: Source Files vs Test Coverage

#### core/ (7 source files)

| Source File | Has Test? | Coverage Notes |
|---|---|---|
| `box-constraints.ts` | YES | `box-constraints.test.ts` -- thorough |
| `color.ts` | YES | `color.test.ts` + `color-alpha.test.ts` |
| `key.ts` | YES | `key.test.ts` |
| `text-span.ts` | YES | `text-span.test.ts` |
| `text-style.ts` | YES | `text-style.test.ts` |
| `types.ts` | YES | `types.test.ts` (Offset, Size, Rect) |
| `wcwidth.ts` | **NO** | Zero tests for Unicode width calculation |

**Gap**: `wcwidth.ts` is untested. This module determines character display widths for CJK,
emoji, and combining characters -- critical for correct TUI layout.

#### framework/ (8 source files)

| Source File | Has Test? | Coverage Notes |
|---|---|---|
| `widget.ts` | YES | Widget, StatelessWidget, StatefulWidget, State, canUpdate |
| `element.ts` | YES | Element base, StatelessElement, StatefulElement, updateChild |
| `render-object.ts` | YES | RenderBox, ContainerRenderBox, layout, ParentData |
| `binding.ts` | YES | WidgetsBinding + `binding-enhancements.test.ts` |
| `build-owner.ts` | YES | BuildOwner.scheduleBuildFor, buildScopes |
| `pipeline-owner.ts` | YES | PipelineOwner + `pipeline-integration.test.ts` |
| `listenable.ts` | YES | ChangeNotifier, ValueNotifier |
| `error-widget.ts` | **NO** | ErrorWidget has zero dedicated tests |

**Gaps**:
- `error-widget.ts`: No tests for ErrorWidget construction, fromError factory, or build behavior.
- Element reconciliation: The existing `element.test.ts` covers basic updateChild but lacks
  tests for multi-child reconciliation edge cases (key reordering, insertions at boundaries,
  duplicate key detection).
- RenderObject: Missing tests for `attach()`/`detach()` lifecycle, `visitChildren()` traversal,
  and `markNeedsLayout()` propagation through deep trees.

#### input/ (11 source files)

| Source File | Has Test? | Coverage Notes |
|---|---|---|
| `events.ts` | YES | `events.test.ts` |
| `event-dispatcher.ts` | YES | `event-dispatcher.test.ts` |
| `input-parser.ts` | YES | `input-parser.test.ts` |
| `keyboard.ts` | YES | `keyboard.test.ts` |
| `mouse.ts` | YES | `mouse.test.ts` |
| `mouse-manager.ts` | YES | `mouse-manager.test.ts` |
| `mouse-cursors.ts` | YES | `mouse-cursors.test.ts` |
| `focus.ts` | YES | `focus.test.ts` |
| `shortcuts.ts` | YES | `shortcuts.test.ts` |
| `hit-test.ts` | **NO** | Zero tests for hit-test tree walk |
| `input-bridge.ts` | **NO** | Zero tests for InputParser-to-EventDispatcher wiring |

**Gaps**: `hit-test.ts` (render tree point query) and `input-bridge.ts` (stdin pipeline wiring)
are both untested. Hit-testing is critical for mouse event dispatch accuracy.

#### layout/ (10 source files)

| Source File | Has Test? | Coverage Notes |
|---|---|---|
| `edge-insets.ts` | YES | `edge-insets.test.ts` |
| `layout-helpers.ts` | YES | `layout-helpers.test.ts` |
| `parent-data.ts` | YES | `parent-data.test.ts` |
| `render-constrained.ts` | YES | `render-constrained.test.ts` |
| `render-decorated.ts` | YES | `render-decorated.test.ts` |
| `render-flex.ts` | YES | `render-flex.test.ts` |
| `render-padded.ts` | YES | `render-padded.test.ts` |
| `render-grid-border.ts` | **NO** | Zero tests |
| `render-sticky-header.ts` | **NO** | Zero tests |
| `render-table.ts` | **NO** | Zero tests |

**Gaps**: Three RenderObject subclasses (`render-grid-border.ts`, `render-sticky-header.ts`,
`render-table.ts`) have zero test coverage. Table layout is complex (column width distribution,
row height calculation, cell positioning) and a high-risk area for regressions.

#### scheduler/ (4 source files)

| Source File | Has Test? | Coverage Notes |
|---|---|---|
| `frame-scheduler.ts` | YES | `frame-scheduler.test.ts` |
| `paint-context.ts` | YES | `paint-context.test.ts` |
| `clip-canvas.ts` | YES | `clip-canvas.test.ts` |
| `paint.ts` | **NO** | Zero tests for paint traversal functions |

**Gap**: `paint.ts` (the `paintRenderObject` and `paintRenderTree` functions) is untested.
These are the DFS paint traversal entry points called by the frame scheduler.

#### terminal/ (7 source files)

| Source File | Has Test? | Coverage Notes |
|---|---|---|
| `screen-buffer.ts` | YES | `screen-buffer.test.ts` + `screen-buffer-enhancements.test.ts` |
| `renderer.ts` | YES | `renderer.test.ts` + `renderer-fallback.test.ts` |
| `cell.ts` | YES | `cell.test.ts` |
| `ansi-parser.ts` | YES | `ansi-parser.test.ts` |
| `platform.ts` | YES | `platform.test.ts` |
| `terminal-manager.ts` | YES | `terminal-manager.test.ts` + `terminal-protocols.test.ts` |
| `terminal-cleanup.ts` | **NO** | Zero tests for cleanup/restore logic |

**Gap**: `terminal-cleanup.ts` (terminal state restoration on exit) is untested.

#### painting/ (2 source files)

| Source File | Has Test? | Coverage Notes |
|---|---|---|
| `border-painter.ts` | **NO** | Zero tests |
| `tree-connector.ts` | **NO** | Zero tests |

**Gap**: The entire `painting/` module has zero tests. `border-painter.ts` provides box-drawing
character sets and junction painting -- essential for TUI visual fidelity. `tree-connector.ts`
renders tree-structure visual connectors.

#### utilities/ (1 source file)

| Source File | Has Test? | Coverage Notes |
|---|---|---|
| `braille-spinner.ts` | **NO** | Zero tests |

**Gap**: Braille spinner animation logic is untested.

#### widgets/ (39 source files)

| Source File | Has Test? | Coverage Notes |
|---|---|---|
| `app-theme.ts` | YES | `app-theme.test.ts` |
| `clip-rect.ts` | YES | `clip-rect.test.ts` |
| `collapsible-drawer.ts` | YES | `collapsible-drawer.test.ts` |
| `container-with-overlays.ts` | YES | `container-with-overlays.test.ts` |
| `dialog.ts` | YES | `dialog.test.ts` |
| `diff-view.ts` | YES | `diff-view.test.ts` |
| `flex.ts` | YES | `flex-widgets.test.ts` (Column, Row) |
| `focus-scope.ts` | YES | `focus-scope.test.ts` |
| `hover-context.ts` | YES | `hover-context.test.ts` |
| `image-preview.ts` | YES | `image-preview.test.ts` |
| `intrinsic-height.ts` | YES | `intrinsic-height.test.ts` |
| `markdown.ts` | YES | `markdown.test.ts` |
| `media-query.ts` | YES | `media-query.test.ts` |
| `scrollbar.ts` | YES | `scrollbar.test.ts` |
| `selection-list.ts` | YES | `selection-list.test.ts` |
| `syntax-highlight.ts` | YES | `syntax-highlight.test.ts` |
| `text-field.ts` | YES | `text-field.test.ts` |
| `theme.ts` | YES | `theme.test.ts` |
| `text.ts` | PARTIAL | Covered in `leaf-widgets.test.ts`, `render-text-interaction.test.ts`, `render-text-selection.test.ts` |
| `autocomplete.ts` | **NO** | Zero tests |
| `builder.ts` | **NO** | Zero tests |
| `button.ts` | **NO** | Zero tests |
| `center.ts` | **NO** | Zero tests |
| `container.ts` | **NO** | Zero tests |
| `decorated-box.ts` | **NO** | Zero tests |
| `default-text-style.ts` | **NO** | Zero tests |
| `divider.ts` | **NO** | Zero tests |
| `flexible.ts` | **NO** | Zero tests (Expanded/Flexible widgets) |
| `force-dim.ts` | **NO** | Zero tests |
| `grid-border.ts` | **NO** | Zero tests |
| `mouse-region.ts` | **NO** | Zero tests |
| `padding.ts` | **NO** | Zero tests |
| `parent-data-widget.ts` | **NO** | Zero tests |
| `scroll-controller.ts` | PARTIAL | `scroll-controller-enhancements.test.ts` only |
| `scroll-view.ts` | **NO** | Zero tests |
| `sized-box.ts` | **NO** | Zero tests |
| `spacer.ts` | **NO** | Zero tests |
| `stack.ts` | **NO** | Zero tests |
| `sticky-header.ts` | **NO** | Zero tests |
| `table.ts` | **NO** | Zero tests |

**Gaps**: 20 widget source files have zero dedicated tests. Several of these (Container,
ScrollView, Stack, Table, Padding, SizedBox) are high-traffic widgets that form the backbone
of any TUI layout.

#### diagnostics/ (4 source files)

| Source File | Has Test? | Coverage Notes |
|---|---|---|
| `debug-inspector.ts` | YES | `debug-inspector.test.ts` |
| `debug-flags.ts` | **NO** | Zero tests |
| `frame-stats.ts` | **NO** | Zero tests |
| `perf-overlay.ts` | **NO** | Zero tests |

**Gap**: 3 of 4 diagnostics files are untested.

### flitter-amp: Source Files vs Test Coverage

#### Existing Tests

| Test File | What It Covers |
|---|---|
| `app-layout.test.ts` | Full constraint chain simulation |
| `chat-view.test.ts` | Chat view widget rendering |
| `layout-guardrails.test.ts` | Layout constraint guardrails |
| `markdown-rendering.test.ts` | Markdown widget rendering |
| `tool-card-layout.test.ts` | Tool card layout constraints |
| `visual-snapshot.test.ts` | SVG snapshot regression tests |
| `visual-cell-assertions.test.ts` | Cell-level rendering assertions |
| `logger-process.test.ts` | Logger/process utilities |

#### Untested AMP Source Files

| Source File | Risk Level | Notes |
|---|---|---|
| `acp/client.ts` | HIGH | ACP WebSocket client -- zero tests |
| `acp/connection.ts` | HIGH | Connection management -- zero tests |
| `acp/session.ts` | HIGH | Session lifecycle -- zero tests |
| `acp/types.ts` | LOW | Pure type definitions |
| `app.ts` | MEDIUM | App root widget -- partially covered by layout tests |
| `state/app-state.ts` | HIGH | Application state management -- zero tests |
| `state/config.ts` | MEDIUM | Configuration parsing -- zero tests |
| `state/conversation.ts` | HIGH | Conversation model -- zero tests |
| `state/history.ts` | YES | Covered by Gap #56 |
| `themes/amp-theme-data.ts` | LOW | Theme data structure |
| `themes/*.ts` (7 files) | LOW | Theme definitions (pure data) |
| `utils/editor.ts` | MEDIUM | Editor integration -- zero tests |
| `utils/logger.ts` | PARTIAL | `logger-process.test.ts` |
| `utils/process.ts` | PARTIAL | `logger-process.test.ts` |
| `widgets/bottom-grid.ts` | MEDIUM | Input area container -- zero tests |
| `widgets/chat-view.ts` | PARTIAL | `chat-view.test.ts` |
| `widgets/command-palette.ts` | MEDIUM | Command palette -- zero tests |
| `widgets/density-orb-widget.ts` | LOW | Density orb animation -- zero tests |
| `widgets/diff-card.ts` | MEDIUM | Diff card rendering -- zero tests |
| `widgets/file-picker.ts` | MEDIUM | File picker dialog -- zero tests |
| `widgets/glow-text.ts` | LOW | Animated glow text -- zero tests |
| `widgets/header-bar.ts` | LOW | Header bar -- zero tests |
| `widgets/input-area.ts` | HIGH | Text input handling -- zero tests |
| `widgets/orb-widget.ts` | LOW | Orb animation -- zero tests |
| `widgets/permission-dialog.ts` | MEDIUM | Permission dialog -- zero tests |
| `widgets/plan-view.ts` | MEDIUM | Plan view rendering -- zero tests |
| `widgets/status-bar.ts` | LOW | Status bar -- zero tests |
| `widgets/thinking-block.ts` | MEDIUM | Thinking indicator -- zero tests |
| `widgets/tool-call-block.ts` | PARTIAL | `tool-card-layout.test.ts` |
| `widgets/tool-call/*.ts` (13 files) | LOW-MED | Individual tool cards -- zero dedicated tests |

**Summary**: The ACP layer (`acp/client.ts`, `acp/connection.ts`, `acp/session.ts`) and core
state management (`app-state.ts`, `conversation.ts`) have zero test coverage despite being the
highest-risk application components.

---

## Coverage Summary

| Module | Source Files | With Tests | Without Tests | Coverage % |
|---|---|---|---|---|
| core/ | 7 | 6 | 1 | 86% |
| framework/ | 8 | 7 | 1 | 88% |
| input/ | 11 | 9 | 2 | 82% |
| layout/ | 10 | 7 | 3 | 70% |
| scheduler/ | 4 | 3 | 1 | 75% |
| terminal/ | 7 | 6 | 1 | 86% |
| painting/ | 2 | 0 | 2 | 0% |
| utilities/ | 1 | 0 | 1 | 0% |
| widgets/ | 39 | 19 | 20 | 49% |
| diagnostics/ | 4 | 1 | 3 | 25% |
| **flitter-core total** | **93** | **58** | **35** | **62%** |
| **flitter-amp total** | **~43** | **~10** | **~33** | **23%** |
| **Combined** | **~136** | **~68** | **~68** | **50%** |

---

## Priority Test Targets

### Tier 1: Framework Core (CRITICAL)

These are the architectural foundation. Bugs here cascade into every consumer.

#### 1.1 Element Reconciliation Deep Tests

**File**: `packages/flitter-core/src/framework/__tests__/element-reconciliation.test.ts`

The existing `element.test.ts` covers basic `updateChild` but lacks multi-child reconciliation
scenarios. Flutter's `updateChildren()` algorithm is the most complex piece of the framework.

**Key test scenarios needed**:
- Multi-child reorder with keys (swap first and last)
- Insert at beginning, middle, end of keyed list
- Remove from beginning, middle, end of keyed list
- Mixed keyed and unkeyed children
- Duplicate key detection and error handling
- Move element to different position (key-based matching)
- Complete list replacement (all new widgets)
- Empty-to-populated and populated-to-empty transitions
- Performance: reconciliation of large lists (100+ children)

```typescript
// Example test snippet
import { describe, it, expect } from 'bun:test';
import {
  Element,
  MultiChildRenderObjectElement,
} from '../element';
import { Widget, StatelessWidget, type BuildContext } from '../widget';
import {
  MultiChildRenderObjectWidget,
  RenderBox,
  ContainerRenderBox,
} from '../render-object';
import { ValueKey } from '../../core/key';
import { BoxConstraints } from '../../core/box-constraints';
import { Size, Offset } from '../../core/types';

class TestContainerWidget extends MultiChildRenderObjectWidget {
  constructor(children: Widget[]) {
    super({ children });
  }
  createRenderObject() {
    return new TestContainerRenderBox();
  }
}

class TestContainerRenderBox extends ContainerRenderBox {
  performLayout(): void {
    this.size = this.constraints!.biggest;
  }
  paint(): void {}
}

describe('Element Reconciliation — updateChildren', () => {
  it('reorders keyed children without recreating elements', () => {
    const keyA = new ValueKey('a');
    const keyB = new ValueKey('b');
    const keyC = new ValueKey('c');

    // Build initial tree: [A, B, C]
    const container = new TestContainerWidget([
      new TestLeafWidget({ key: keyA, text: 'a' }),
      new TestLeafWidget({ key: keyB, text: 'b' }),
      new TestLeafWidget({ key: keyC, text: 'c' }),
    ]);

    const element = container.createElement();
    element.mount(undefined);

    const originalChildren = [...element.children];
    expect(originalChildren).toHaveLength(3);

    // Update tree: [C, A, B] -- reorder
    const newContainer = new TestContainerWidget([
      new TestLeafWidget({ key: keyC, text: 'c' }),
      new TestLeafWidget({ key: keyA, text: 'a' }),
      new TestLeafWidget({ key: keyB, text: 'b' }),
    ]);

    element.update(newContainer);
    element.performRebuild();

    // Elements should be reused (same identity), not recreated
    const newChildren = element.children;
    expect(newChildren).toHaveLength(3);
    // The element that was at index 2 (key C) should now be at index 0
    expect(newChildren[0]).toBe(originalChildren[2]);
    expect(newChildren[1]).toBe(originalChildren[0]);
    expect(newChildren[2]).toBe(originalChildren[1]);
  });

  it('handles insert at beginning of keyed list', () => {
    // ... insert new keyed child at position 0
  });

  it('detects and reports duplicate keys', () => {
    // ... two children with same ValueKey should throw/warn
  });
});
```

#### 1.2 RenderObject Layout Propagation

**File**: `packages/flitter-core/src/framework/__tests__/render-object-lifecycle.test.ts`

**Key test scenarios needed**:
- `markNeedsLayout()` propagation up parent chain
- `markNeedsPaint()` propagation
- `attach()` / `detach()` lifecycle with owner wiring
- `visitChildren()` traversal correctness
- `adoptChild()` / `dropChild()` parent data management
- Layout with changing constraints (relayout on constraint change)
- Layout skip when constraints unchanged and not dirty

```typescript
// Example test snippet
describe('RenderObject Lifecycle', () => {
  it('markNeedsLayout propagates to owner via requestLayout', () => {
    const mockOwner: PipelineOwner = {
      layoutRequested: false,
      paintRequested: false,
      requestLayout() { this.layoutRequested = true; },
      requestPaint() { this.paintRequested = true; },
    };

    const parent = new TestContainerRenderBox();
    const child = new TestRenderBox();
    parent.addChild(child);
    parent.attach(mockOwner);

    child.markNeedsLayout();
    expect(mockOwner.layoutRequested).toBe(true);
  });

  it('attach propagates to all descendants', () => {
    const mockOwner = new MockPipelineOwner();
    const root = new TestContainerRenderBox();
    const child1 = new TestRenderBox();
    const child2 = new TestRenderBox();
    root.addChild(child1);
    root.addChild(child2);

    root.attach(mockOwner);

    expect(root.owner).toBe(mockOwner);
    expect(child1.owner).toBe(mockOwner);
    expect(child2.owner).toBe(mockOwner);
  });

  it('detach removes owner from all descendants', () => {
    const mockOwner = new MockPipelineOwner();
    const root = new TestContainerRenderBox();
    const child = new TestRenderBox();
    root.addChild(child);
    root.attach(mockOwner);
    root.detach();

    expect(root.owner).toBeNull();
    expect(child.owner).toBeNull();
  });
});
```

#### 1.3 Widget Lifecycle Integration

**File**: `packages/flitter-core/src/framework/__tests__/widget-lifecycle-integration.test.ts`

Tests the full Widget -> Element -> RenderObject lifecycle wiring:

**Key test scenarios needed**:
- StatefulWidget: `createState()` -> `initState()` -> `build()` -> `didUpdateWidget()` -> `dispose()`
- `setState()` triggers rebuild via BuildOwner -> FrameScheduler chain
- Hot-swap: same-type widget update reuses Element and calls `didUpdateWidget()`
- Different-type widget swap unmounts old Element, creates new one
- InheritedWidget change propagates to dependent descendants
- Error recovery: build() throwing replaces subtree with ErrorWidget

```typescript
// Example test snippet
describe('Widget Lifecycle Integration', () => {
  it('setState triggers rebuild through BuildOwner', () => {
    // 1. Create StatefulWidget and mount
    // 2. Call state.setState(() => { ... })
    // 3. Verify element is marked dirty
    // 4. Run build scope
    // 5. Verify build() was called again
  });

  it('InheritedWidget change triggers dependent rebuild', () => {
    // 1. Build tree with InheritedWidget ancestor
    // 2. Descendant calls context.dependOnInheritedWidgetOfExactType()
    // 3. Replace InheritedWidget with new data
    // 4. Verify dependent was rebuilt
    // 5. Verify non-dependent was NOT rebuilt
  });
});
```

### Tier 2: Layout System (HIGH)

#### 2.1 RenderTable Tests

**File**: `packages/flitter-core/src/layout/__tests__/render-table.test.ts`

Table layout is one of the most complex RenderObject subclasses.

**Key test scenarios**:
- Column width distribution (fixed, flex, intrinsic)
- Row height calculation (tallest cell wins)
- Cell positioning with padding
- Table with zero rows, zero columns
- Single-row and single-column tables
- Column width when content exceeds available width
- Table constraint propagation to cells

#### 2.2 RenderStickyHeader Tests

**File**: `packages/flitter-core/src/layout/__tests__/render-sticky-header.test.ts`

**Key test scenarios**:
- Header stays pinned at top during scroll
- Header height is excluded from content area
- Multiple sticky headers stack correctly
- Header transition animation (partially visible)

#### 2.3 RenderGridBorder Tests

**File**: `packages/flitter-core/src/layout/__tests__/render-grid-border.test.ts`

**Key test scenarios**:
- Grid lines drawn at correct positions
- Junction characters at intersections
- Border style variants (solid, dashed, none)

### Tier 3: High-Traffic Widgets (HIGH)

#### 3.1 Container Widget Tests

**File**: `packages/flitter-core/src/widgets/__tests__/container.test.ts`

```typescript
// Example test snippet
import { describe, it, expect } from 'bun:test';
import { captureToGrid } from 'flitter-amp/src/test-utils/capture';
// or use direct RenderObject-level testing

describe('Container', () => {
  it('applies padding, color, and alignment to child', () => {
    // Verify Container composes Padding + DecoratedBox + Align correctly
  });

  it('respects width/height constraints', () => {
    // Container with explicit width/height should create tight constraints
  });

  it('renders background color to all cells in bounds', () => {
    // Use captureToGrid to verify cells have correct background
  });
});
```

#### 3.2 ScrollView Widget Tests

**File**: `packages/flitter-core/src/widgets/__tests__/scroll-view.test.ts`

**Key test scenarios**:
- Content taller than viewport shows only visible portion
- Scroll offset changes which content is visible
- Scroll controller integration
- Scroll-to-bottom behavior
- Content shorter than viewport (no scrolling needed)
- Horizontal scroll support (if applicable)

#### 3.3 Stack Widget Tests

**File**: `packages/flitter-core/src/widgets/__tests__/stack.test.ts`

**Key test scenarios**:
- Overlapping children render in correct z-order
- Positioned children placed at correct offsets
- Non-positioned children fill stack bounds
- Empty stack

#### 3.4 SizedBox, Padding, Center, Spacer Widget Tests

**Files**:
- `packages/flitter-core/src/widgets/__tests__/sized-box.test.ts`
- `packages/flitter-core/src/widgets/__tests__/padding.test.ts`
- `packages/flitter-core/src/widgets/__tests__/center.test.ts`
- `packages/flitter-core/src/widgets/__tests__/spacer.test.ts`

These are the simplest widgets but the most commonly used. Correct constraint
forwarding is essential.

```typescript
// Example: SizedBox
describe('SizedBox', () => {
  it('creates tight constraints from explicit width and height', () => {
    const box = new SizedBox({ width: 40, height: 10, child: leaf });
    const grid = captureToGrid(box, { cols: 80, rows: 24 });
    // Verify child received constraints with maxWidth=40, maxHeight=10
  });

  it('SizedBox.expand fills parent constraints', () => {
    const box = SizedBox.expand({ child: leaf });
    // Verify it creates constraints matching parent's max
  });

  it('SizedBox.shrink creates zero-size constraints', () => {
    const box = SizedBox.shrink();
    // Verify 0x0 size
  });
});
```

### Tier 4: Painting and Terminal (MEDIUM)

#### 4.1 Border Painter Tests

**File**: `packages/flitter-core/src/painting/__tests__/border-painter.test.ts`

**Key test scenarios**:
- Solid box-drawing character set is correct (all 11 characters)
- Rounded box-drawing character set is correct
- Dashed box-drawing character set is correct
- Junction characters placed correctly at T and cross positions
- Paint border to PaintContext draws expected characters at expected positions

#### 4.2 Tree Connector Tests

**File**: `packages/flitter-core/src/painting/__tests__/tree-connector.test.ts`

**Key test scenarios**:
- Connector lines (vertical pipe, branch, end branch, horizontal)
- Depth indentation calculation
- Last-child vs mid-child connector difference

#### 4.3 Paint Traversal Tests

**File**: `packages/flitter-core/src/scheduler/__tests__/paint-traversal.test.ts`

**Key test scenarios**:
- `paintRenderTree` visits all nodes in DFS order
- Offset accumulation is correct through nested children
- Clipping respects clip boundaries

#### 4.4 Terminal Cleanup Tests

**File**: `packages/flitter-core/src/terminal/__tests__/terminal-cleanup.test.ts`

**Key test scenarios**:
- Terminal state is restored on exit (cursor visibility, mouse mode, alternate screen)
- Cleanup runs even on unexpected exits

### Tier 5: AMP Application Layer (MEDIUM-HIGH)

#### 5.1 Conversation State Tests

**File**: `packages/flitter-amp/src/__tests__/conversation.test.ts`

```typescript
// Example test snippet
import { describe, it, expect } from 'bun:test';
import { Conversation, Message, Turn } from '../state/conversation';

describe('Conversation', () => {
  it('starts with empty turns', () => {
    const conv = new Conversation();
    expect(conv.turns).toHaveLength(0);
  });

  it('addUserMessage creates a new turn', () => {
    const conv = new Conversation();
    conv.addUserMessage('Hello');
    expect(conv.turns).toHaveLength(1);
    expect(conv.turns[0].role).toBe('user');
    expect(conv.turns[0].content).toBe('Hello');
  });

  it('addAssistantMessage appends to current turn', () => {
    const conv = new Conversation();
    conv.addUserMessage('Hi');
    conv.addAssistantMessage('Hello!');
    // Verify assistant message is associated with the turn
  });

  it('addToolCall attaches tool result to current turn', () => {
    // Verify tool call tracking
  });

  it('streaming: partial message updates correctly', () => {
    // Verify streaming token-by-token accumulation
  });
});
```

#### 5.2 AppState Tests

**File**: `packages/flitter-amp/src/__tests__/app-state.test.ts`

**Key test scenarios**:
- Initial state: idle, no conversation, default config
- State transitions: idle -> connecting -> connected -> streaming -> idle
- Config loading and validation
- Theme switching
- Error state handling

#### 5.3 ACP Client Tests (with mocks)

**File**: `packages/flitter-amp/src/__tests__/acp-client.test.ts`

**Key test scenarios**:
- Connection lifecycle: connect, authenticate, disconnect
- Message send/receive
- Error handling: network failures, auth failures
- Reconnection logic
- Session management

### Tier 6: Input Edge Cases (MEDIUM)

#### 6.1 Hit-Test Tests

**File**: `packages/flitter-core/src/input/__tests__/hit-test.test.ts`

```typescript
// Example test snippet
import { describe, it, expect } from 'bun:test';
import { hitTest } from '../hit-test';
import { ContainerRenderBox, RenderBox } from '../../framework/render-object';
import { BoxConstraints } from '../../core/box-constraints';
import { Size, Offset } from '../../core/types';

describe('hitTest', () => {
  it('returns deepest child at point', () => {
    // Create parent (80x24) with child at (10, 5) sized 20x10
    const root = new TestContainerRenderBox();
    const child = new TestRenderBox();
    root.addChild(child);
    root.layout(BoxConstraints.tight(new Size(80, 24)));

    // Hit test at point within child bounds
    const result = hitTest(root, 15, 8);
    expect(result.path).toHaveLength(2);
    expect(result.path[0].renderObject).toBe(child); // deepest first
    expect(result.path[1].renderObject).toBe(root);
  });

  it('returns only root when point is outside all children', () => {
    const root = new TestContainerRenderBox();
    root.layout(BoxConstraints.tight(new Size(80, 24)));
    const result = hitTest(root, 40, 12);
    expect(result.path).toHaveLength(1);
    expect(result.path[0].renderObject).toBe(root);
  });

  it('handles overlapping children (last child wins)', () => {
    // Two children at same position -- back-to-front order
  });
});
```

#### 6.2 InputBridge Tests

**File**: `packages/flitter-core/src/input/__tests__/input-bridge.test.ts`

**Key test scenarios**:
- Feed raw escape sequences, verify correct InputEvent dispatched
- Dispose prevents further dispatch
- Multiple rapid inputs are all dispatched
- Invalid/partial sequences handled gracefully

---

## Test Architecture: Utilities, Mocks, and Fixtures

### Existing Test Utilities

The project already has useful test infrastructure in `packages/flitter-amp/src/test-utils/`:

| File | Purpose |
|---|---|
| `capture.ts` | Headless widget rendering via `captureToSvg()` and `captureToGrid()` |
| `grid-helpers.ts` | Cell-level assertion helpers for grid output |
| `termshot.ts` | SVG serialization from screen buffer |
| `tmux-harness.ts` | Tmux-based integration test harness |

### New Test Utilities Needed

#### 1. `WidgetTester` (Test Pump Harness)

**File**: `packages/flitter-core/src/test-utils/widget-tester.ts`

A Flutter-style `WidgetTester` that wraps the headless binding for easy widget testing:

```typescript
/**
 * WidgetTester -- headless widget tree pump for unit and integration tests.
 *
 * Mirrors Flutter's WidgetTester: mount a widget, pump frames, make assertions.
 */
export class WidgetTester {
  private binding: WidgetsBinding;

  constructor(opts?: { cols?: number; rows?: number }) {
    WidgetsBinding.reset();
    FrameScheduler.reset();
    this.binding = WidgetsBinding.instance;
    this.binding.handleResize(opts?.cols ?? 80, opts?.rows ?? 24);
  }

  /** Mount a root widget and pump one frame. */
  pumpWidget(widget: Widget): void {
    this.binding.attachRootWidget(widget);
    this.pump();
  }

  /** Run a synchronous frame (build + layout + paint). */
  pump(): void {
    this.binding.requestForcedPaintFrame();
    this.binding.drawFrameSync();
  }

  /** Get the root element. */
  get rootElement(): Element {
    return this.binding.rootElement!;
  }

  /** Find a descendant element by widget type. */
  findByType<T extends Widget>(type: new (...args: any[]) => T): Element | undefined {
    return this._findInTree(this.rootElement, (el) => el.widget instanceof type);
  }

  /** Find a descendant render object by type. */
  findRenderObject<T extends RenderObject>(
    type: new (...args: any[]) => T,
  ): T | undefined {
    // Walk render tree
  }

  /** Get the screen cell grid for assertions. */
  getGrid(): { getCell: (x: number, y: number) => { char: string; style: any } } {
    const screen = this.binding.getScreen();
    return screen.getFrontBuffer();
  }

  /** Cleanup -- must be called in afterEach(). */
  dispose(): void {
    WidgetsBinding.reset();
    FrameScheduler.reset();
  }

  private _findInTree(element: Element, predicate: (el: Element) => boolean): Element | undefined {
    if (predicate(element)) return element;
    for (const child of element.children) {
      const found = this._findInTree(child, predicate);
      if (found) return found;
    }
    return undefined;
  }
}
```

#### 2. Mock RenderObjects

**File**: `packages/flitter-core/src/test-utils/mock-render-objects.ts`

Reusable test doubles for common RenderObject patterns:

```typescript
/** Fills parent constraints (greedy). */
export class GreedyBox extends RenderBox {
  performLayout(): void {
    const c = this.constraints!;
    this.size = new Size(
      Number.isFinite(c.maxWidth) ? c.maxWidth : c.minWidth,
      Number.isFinite(c.maxHeight) ? c.maxHeight : c.minHeight,
    );
  }
  paint(): void {}
}

/** Fixed intrinsic size, clamped by constraints. */
export class FixedSizeBox extends RenderBox {
  constructor(public readonly preferredWidth: number, public readonly preferredHeight: number) {
    super();
  }
  performLayout(): void {
    this.size = this.constraints!.constrain(
      new Size(this.preferredWidth, this.preferredHeight),
    );
  }
  paint(): void {}
}

/** Mock PipelineOwner that records requests. */
export class MockPipelineOwner implements PipelineOwner {
  layoutCount = 0;
  paintCount = 0;
  requestLayout(): void { this.layoutCount++; }
  requestPaint(): void { this.paintCount++; }
}

/** Mock BuildOwner that records scheduled elements. */
export class MockBuildOwner implements BuildOwner {
  scheduledElements: Element[] = [];
  scheduleBuildFor(element: Element): void {
    this.scheduledElements.push(element);
  }
}
```

#### 3. Test Widgets

**File**: `packages/flitter-core/src/test-utils/test-widgets.ts`

Reusable widgets for testing:

```typescript
/** Leaf widget that terminates the tree (creates a LeafRenderObjectElement). */
export class TestLeafWidget extends LeafRenderObjectWidget {
  createRenderObject(): RenderObject {
    return new GreedyBox();
  }
}

/** Leaf widget with fixed size. */
export class FixedLeafWidget extends LeafRenderObjectWidget {
  constructor(
    private width: number,
    private height: number,
    opts?: { key?: Key },
  ) {
    super(opts);
  }
  createRenderObject(): RenderObject {
    return new FixedSizeBox(this.width, this.height);
  }
}

/** StatefulWidget that exposes setState for testing. */
export class CounterWidget extends StatefulWidget {
  createState(): CounterState {
    return new CounterState();
  }
}
export class CounterState extends State<CounterWidget> {
  count = 0;
  increment(): void {
    this.setState(() => { this.count++; });
  }
  build(context: BuildContext): Widget {
    return new TestLeafWidget();
  }
}
```

#### 4. ACP Test Fixtures

**File**: `packages/flitter-amp/src/test-utils/acp-fixtures.ts`

Mock ACP messages and conversation data for testing the application layer:

```typescript
export const mockUserMessage = {
  role: 'user' as const,
  content: 'Hello, how are you?',
  timestamp: Date.now(),
};

export const mockAssistantMessage = {
  role: 'assistant' as const,
  content: 'I am doing well, thank you!',
  timestamp: Date.now(),
};

export const mockToolCall = {
  id: 'tool-1',
  name: 'bash',
  input: { command: 'ls -la' },
  output: { stdout: 'file1.txt\nfile2.txt', exitCode: 0 },
};

export const mockConversation = {
  id: 'conv-1',
  turns: [mockUserMessage, mockAssistantMessage],
};

/** Creates a mock ACP client that records method calls. */
export function createMockAcpClient() {
  return {
    connected: false,
    messages: [] as any[],
    connect: async () => { /* ... */ },
    send: (msg: any) => { /* ... */ },
    disconnect: () => { /* ... */ },
    onMessage: (_handler: (msg: any) => void) => { /* ... */ },
  };
}
```

---

## Proposed Test Files Summary

### New Test Files (35 files)

#### Framework Core (Tier 1) -- 3 files
1. `packages/flitter-core/src/framework/__tests__/element-reconciliation.test.ts`
2. `packages/flitter-core/src/framework/__tests__/render-object-lifecycle.test.ts`
3. `packages/flitter-core/src/framework/__tests__/widget-lifecycle-integration.test.ts`

#### Layout (Tier 2) -- 3 files
4. `packages/flitter-core/src/layout/__tests__/render-table.test.ts`
5. `packages/flitter-core/src/layout/__tests__/render-sticky-header.test.ts`
6. `packages/flitter-core/src/layout/__tests__/render-grid-border.test.ts`

#### Widgets (Tier 3) -- 12 files
7. `packages/flitter-core/src/widgets/__tests__/container.test.ts`
8. `packages/flitter-core/src/widgets/__tests__/scroll-view.test.ts`
9. `packages/flitter-core/src/widgets/__tests__/stack.test.ts`
10. `packages/flitter-core/src/widgets/__tests__/sized-box.test.ts`
11. `packages/flitter-core/src/widgets/__tests__/padding.test.ts`
12. `packages/flitter-core/src/widgets/__tests__/center.test.ts`
13. `packages/flitter-core/src/widgets/__tests__/spacer.test.ts`
14. `packages/flitter-core/src/widgets/__tests__/button.test.ts`
15. `packages/flitter-core/src/widgets/__tests__/builder.test.ts`
16. `packages/flitter-core/src/widgets/__tests__/autocomplete.test.ts`
17. `packages/flitter-core/src/widgets/__tests__/mouse-region.test.ts`
18. `packages/flitter-core/src/widgets/__tests__/table-widget.test.ts`

#### Painting and Scheduler (Tier 4) -- 4 files
19. `packages/flitter-core/src/painting/__tests__/border-painter.test.ts`
20. `packages/flitter-core/src/painting/__tests__/tree-connector.test.ts`
21. `packages/flitter-core/src/scheduler/__tests__/paint-traversal.test.ts`
22. `packages/flitter-core/src/terminal/__tests__/terminal-cleanup.test.ts`

#### Input (Tier 6) -- 2 files
23. `packages/flitter-core/src/input/__tests__/hit-test.test.ts`
24. `packages/flitter-core/src/input/__tests__/input-bridge.test.ts`

#### Uncovered Modules -- 5 files
25. `packages/flitter-core/src/core/__tests__/wcwidth.test.ts`
26. `packages/flitter-core/src/framework/__tests__/error-widget.test.ts`
27. `packages/flitter-core/src/diagnostics/__tests__/frame-stats.test.ts`
28. `packages/flitter-core/src/diagnostics/__tests__/perf-overlay.test.ts`
29. `packages/flitter-core/src/utilities/__tests__/braille-spinner.test.ts`

#### AMP Application Layer (Tier 5) -- 6 files
30. `packages/flitter-amp/src/__tests__/conversation.test.ts`
31. `packages/flitter-amp/src/__tests__/app-state.test.ts`
32. `packages/flitter-amp/src/__tests__/config.test.ts`
33. `packages/flitter-amp/src/__tests__/acp-client.test.ts`
34. `packages/flitter-amp/src/__tests__/acp-session.test.ts`
35. `packages/flitter-amp/src/__tests__/input-area.test.ts`

### New Test Utilities (4 files)
36. `packages/flitter-core/src/test-utils/widget-tester.ts`
37. `packages/flitter-core/src/test-utils/mock-render-objects.ts`
38. `packages/flitter-core/src/test-utils/test-widgets.ts`
39. `packages/flitter-amp/src/test-utils/acp-fixtures.ts`

---

## Phased Implementation Plan

### Phase 1: Test Infrastructure (Week 1)

**Goal**: Build the shared test utilities so all subsequent test files are efficient to write.

| Task | File | Est. Tests |
|---|---|---|
| Create WidgetTester pump harness | `test-utils/widget-tester.ts` | N/A (utility) |
| Create mock render objects | `test-utils/mock-render-objects.ts` | N/A (utility) |
| Create test widgets | `test-utils/test-widgets.ts` | N/A (utility) |
| Create ACP fixtures | `test-utils/acp-fixtures.ts` | N/A (utility) |

**Deliverable**: All 4 utility files, verified by import in a smoke test.

### Phase 2: Framework Core (Week 2)

**Goal**: Comprehensive coverage of the three-tree architecture.

| Task | File | Est. Tests |
|---|---|---|
| Element reconciliation deep tests | `element-reconciliation.test.ts` | ~25 |
| RenderObject lifecycle tests | `render-object-lifecycle.test.ts` | ~20 |
| Widget lifecycle integration tests | `widget-lifecycle-integration.test.ts` | ~15 |
| ErrorWidget tests | `error-widget.test.ts` | ~8 |

**Deliverable**: ~68 new tests covering the framework's most critical code paths.

### Phase 3: Layout RenderObjects (Week 3)

**Goal**: Cover the three untested layout RenderObjects plus the high-traffic widgets.

| Task | File | Est. Tests |
|---|---|---|
| RenderTable tests | `render-table.test.ts` | ~20 |
| RenderStickyHeader tests | `render-sticky-header.test.ts` | ~10 |
| RenderGridBorder tests | `render-grid-border.test.ts` | ~10 |
| Container widget tests | `container.test.ts` | ~12 |
| SizedBox widget tests | `sized-box.test.ts` | ~10 |
| Padding widget tests | `padding.test.ts` | ~8 |

**Deliverable**: ~70 new tests covering layout correctness.

### Phase 4: Remaining Core Widgets (Week 4)

**Goal**: Cover the remaining 15+ untested widgets.

| Task | File | Est. Tests |
|---|---|---|
| ScrollView tests | `scroll-view.test.ts` | ~15 |
| Stack tests | `stack.test.ts` | ~10 |
| Center tests | `center.test.ts` | ~6 |
| Spacer tests | `spacer.test.ts` | ~5 |
| Builder tests | `builder.test.ts` | ~6 |
| Button tests | `button.test.ts` | ~8 |
| Autocomplete tests | `autocomplete.test.ts` | ~10 |
| MouseRegion tests | `mouse-region.test.ts` | ~10 |
| Table widget tests | `table-widget.test.ts` | ~12 |

**Deliverable**: ~82 new tests covering remaining widget catalog.

### Phase 5: Painting, Input, Terminal (Week 5)

**Goal**: Cover painting utilities, input edge cases, and terminal management.

| Task | File | Est. Tests |
|---|---|---|
| Border painter tests | `border-painter.test.ts` | ~12 |
| Tree connector tests | `tree-connector.test.ts` | ~8 |
| Paint traversal tests | `paint-traversal.test.ts` | ~10 |
| Hit-test tests | `hit-test.test.ts` | ~12 |
| InputBridge tests | `input-bridge.test.ts` | ~8 |
| Terminal cleanup tests | `terminal-cleanup.test.ts` | ~6 |
| wcwidth tests | `wcwidth.test.ts` | ~15 |
| Braille spinner tests | `braille-spinner.test.ts` | ~5 |

**Deliverable**: ~76 new tests.

### Phase 6: AMP Application Layer (Week 6)

**Goal**: Cover ACP client, state management, and key AMP widgets.

| Task | File | Est. Tests |
|---|---|---|
| Conversation state tests | `conversation.test.ts` | ~20 |
| AppState tests | `app-state.test.ts` | ~15 |
| Config tests | `config.test.ts` | ~10 |
| ACP client tests (mocked) | `acp-client.test.ts` | ~15 |
| ACP session tests | `acp-session.test.ts` | ~12 |
| Input area widget tests | `input-area.test.ts` | ~10 |
| Diagnostics (frame-stats, perf-overlay) | 2 test files | ~15 |

**Deliverable**: ~97 new tests covering application layer.

---

## Running the Tests

All tests use `bun:test` as the test runner.

```bash
# Run all tests in flitter-core
cd packages/flitter-core && bun test

# Run all tests in flitter-amp
cd packages/flitter-amp && bun test

# Run a specific test file
bun test packages/flitter-core/src/framework/__tests__/element-reconciliation.test.ts

# Run with coverage report
cd packages/flitter-core && bun test --coverage

# Run tests matching a pattern
bun test --test-name-pattern "RenderTable"
```

---

## Success Criteria

| Metric | Current | Target |
|---|---|---|
| flitter-core test files | 58 of 93 sources covered | 88 of 93 (95%) |
| flitter-amp test files | ~10 of ~43 sources covered | ~20 of ~43 (47%) |
| Total test count (estimated) | ~500 | ~900 |
| Framework core branch coverage | Partial | >90% |
| Layout RenderObject coverage | 70% | 100% |
| Widget catalog coverage | 49% | >85% |
| Zero-test modules | painting, utilities | 0 modules at zero |

### Exit Criteria for Each Phase

1. All new test files pass (`bun test` exits 0)
2. No regressions in existing tests
3. Each new test file has at minimum 5 test cases
4. Test helpers are reused (no copy-paste of mock render objects)
5. Tests follow existing patterns: `bun:test` imports, `describe`/`it`/`expect` structure,
   Amp reference comments where applicable

---

## Relationship to Other Gaps

- **Gap #56** (`56-prompt-history-tests.md`): Already addressed PromptHistory tests. This plan
  does not duplicate that work.
- **Gaps #57-#60** (ACP gaps): The ACP client/session/reconnection gaps identified test needs
  for the connection layer. This plan formalizes those into concrete test files (Phase 6).
- **Gap #62** (`62-terminal-buffer-mismatch.md`): Terminal buffer issues would be caught by
  the terminal cleanup and screen buffer tests proposed here.
