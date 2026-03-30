// Integration tests for the full setState → render pipeline.
// Verifies: setState → markNeedsRebuild → scheduleBuildFor → buildScopes → layout → paint → render
// Amp ref: .reference/element-tree.md:1631-1680 (complete setState→frame chain)

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { WidgetsBinding, resetSchedulers } from '../binding';
import { Widget, StatefulWidget, StatelessWidget, State, type BuildContext } from '../widget';
import { StatefulElement, StatelessElement, LeafRenderObjectElement } from '../element';
import { LeafRenderObjectWidget, RenderBox, RenderObject } from '../render-object';
import { readScreenRow, readFrontCell } from '../../test-utils/pipeline-helpers';
import { BoxConstraints } from '../../core/box-constraints';
import { Offset, Size } from '../../core/types';
import { BuildOwner } from '../build-owner';
import { FrameScheduler } from '../../scheduler/frame-scheduler';
import type { PaintContext } from '../../scheduler/paint-context';

// ---------------------------------------------------------------------------
// Test helpers — widgets that paint text into the ScreenBuffer
// ---------------------------------------------------------------------------

/**
 * A RenderBox that paints a single text string at its offset position.
 * Used to verify the full paint pipeline writes cells to the ScreenBuffer.
 */
class TextRenderBox extends RenderBox {
  text: string;

  constructor(text: string) {
    super();
    this.text = text;
  }

  performLayout(): void {
    if (this.constraints) {
      const width = Math.min(this.text.length, this.constraints.maxWidth);
      const height = Math.min(1, this.constraints.maxHeight);
      this.size = this.constraints.constrain(new Size(width, height));
    }
  }

  paint(context: PaintContext, offset: Offset): void {
    // PaintContext.drawText(x, y, text, style?) — Offset uses col/row not x/y
    (context as any).drawText(offset.col, offset.row, this.text);
  }
}

/**
 * A LeafRenderObjectWidget that creates a TextRenderBox.
 * This terminates the widget tree and provides a render object that paints text.
 */
class TextLeafWidget extends LeafRenderObjectWidget {
  readonly text: string;

  constructor(text: string) {
    super();
    this.text = text;
  }

  createRenderObject(): RenderObject {
    return new TextRenderBox(this.text);
  }

  updateRenderObject(renderObject: RenderObject): void {
    if (renderObject instanceof TextRenderBox) {
      renderObject.text = this.text;
    }
  }
}

/**
 * A StatefulWidget whose state can change text via setState.
 * Core test subject for setState → render pipeline.
 */
class CounterWidget extends StatefulWidget {
  createState(): State<StatefulWidget> {
    return new CounterState();
  }
}

class CounterState extends State<CounterWidget> {
  count = 0;

  build(_context: BuildContext): Widget {
    return new TextLeafWidget(`count:${this.count}`);
  }

  increment(): void {
    this.setState(() => {
      this.count++;
    });
  }
}

/**
 * A StatelessWidget that wraps a child — for testing depth ordering.
 */
class WrapperWidget extends StatelessWidget {
  readonly child: Widget;

  constructor(child: Widget) {
    super();
    this.child = child;
  }

  build(_context: BuildContext): Widget {
    return this.child;
  }

  override createElement(): any {
    return new StatelessElement(this);
  }
}

/**
 * A minimal render box for testing (no paint output).
 */
class NoopRenderBox extends RenderBox {
  performLayout(): void {
    if (this.constraints) {
      this.size = this.constraints.constrain(
        new Size(this.constraints.maxWidth, this.constraints.maxHeight),
      );
    }
  }
  paint(): void {}
}

/**
 * A leaf widget with a no-op render box.
 */
class NoopLeafWidget extends LeafRenderObjectWidget {
  createRenderObject(): RenderObject {
    return new NoopRenderBox();
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Pipeline Integration: setState → ScreenBuffer', () => {
  beforeEach(() => {
    WidgetsBinding.reset();
    FrameScheduler.reset();
  });

  afterEach(() => {
    WidgetsBinding.reset();
    FrameScheduler.reset();
  });

  // -----------------------------------------------------------------------
  // Test 1: Full setState → ScreenBuffer chain
  // -----------------------------------------------------------------------
  describe('full setState → ScreenBuffer chain', () => {
    it('renders initial state to ScreenBuffer', () => {
      const binding = WidgetsBinding.instance;
      const widget = new CounterWidget();
      binding.attachRootWidget(widget);

      // Force paint on this frame so paint actually executes
      binding.requestForcedPaintFrame();
      binding.drawFrameSync();

      // Read screen buffer row 0 — should contain "count:0"
      const row = readScreenRow(binding, 0, 10);
      expect(row).toContain('count:0');
    });

    it('updates ScreenBuffer after setState + drawFrameSync', () => {
      const binding = WidgetsBinding.instance;
      const widget = new CounterWidget();
      binding.attachRootWidget(widget);

      // Initial render
      binding.requestForcedPaintFrame();
      binding.drawFrameSync();

      const initialRow = readScreenRow(binding, 0, 10);
      expect(initialRow).toContain('count:0');

      // Find the StatefulElement and its state to call setState
      const rootElement = binding.rootElement!;
      let counterState: CounterState | null = null;

      function findCounterState(element: any): void {
        if (element._state instanceof CounterState) {
          counterState = element._state;
          return;
        }
        for (const child of element.children || []) {
          findCounterState(child);
        }
      }
      findCounterState(rootElement);

      expect(counterState).not.toBeNull();

      // Call setState to increment
      counterState!.increment();

      // Run a frame — this should rebuild, layout, paint, render
      binding.drawFrameSync();

      // After the frame, ScreenBuffer should have "count:1"
      const updatedRow = readScreenRow(binding, 0, 10);
      expect(updatedRow).toContain('count:1');
    });

    it('handles multiple setState calls before next frame', () => {
      const binding = WidgetsBinding.instance;
      const widget = new CounterWidget();
      binding.attachRootWidget(widget);

      binding.requestForcedPaintFrame();
      binding.drawFrameSync();

      // Find counter state
      const rootElement = binding.rootElement!;
      let counterState: CounterState | null = null;
      function findState(element: any): void {
        if (element._state instanceof CounterState) {
          counterState = element._state;
          return;
        }
        for (const child of element.children || []) findState(child);
      }
      findState(rootElement);
      expect(counterState).not.toBeNull();

      // Call setState 3 times before the next frame
      counterState!.increment();
      counterState!.increment();
      counterState!.increment();

      // Single frame processes all state changes
      binding.drawFrameSync();

      const row = readScreenRow(binding, 0, 10);
      expect(row).toContain('count:3');
    });
  });

  // -----------------------------------------------------------------------
  // Test 2: Dirty element scheduling
  // -----------------------------------------------------------------------
  describe('dirty element scheduling', () => {
    it('setState calls markNeedsRebuild which adds to BuildOwner dirty set', () => {
      const binding = WidgetsBinding.instance;
      const widget = new CounterWidget();
      binding.attachRootWidget(widget);

      // Initial build clears all dirty flags
      binding.drawFrameSync();
      expect(binding.buildOwner.hasDirtyElements).toBe(false);

      // Find the counter state
      let counterState: CounterState | null = null;
      function findState(element: any): void {
        if (element._state instanceof CounterState) {
          counterState = element._state;
          return;
        }
        for (const child of element.children || []) findState(child);
      }
      findState(binding.rootElement!);
      expect(counterState).not.toBeNull();

      // setState should mark the element dirty and add to BuildOwner
      counterState!.increment();

      // After setState, buildOwner should have dirty elements
      expect(binding.buildOwner.hasDirtyElements).toBe(true);
      expect(binding.buildOwner.dirtyElementCount).toBeGreaterThan(0);

      // After a frame, dirty set is cleared
      binding.drawFrameSync();
      expect(binding.buildOwner.hasDirtyElements).toBe(false);
    });

    it('duplicate setState calls do not add element multiple times', () => {
      const binding = WidgetsBinding.instance;
      const widget = new CounterWidget();
      binding.attachRootWidget(widget);
      binding.drawFrameSync();

      let counterState: CounterState | null = null;
      function findState(element: any): void {
        if (element._state instanceof CounterState) {
          counterState = element._state;
          return;
        }
        for (const child of element.children || []) findState(child);
      }
      findState(binding.rootElement!);

      // Call setState twice — BuildOwner uses a Set, so duplicates are ignored
      counterState!.increment();
      const countAfterFirst = binding.buildOwner.dirtyElementCount;

      counterState!.increment();
      const countAfterSecond = binding.buildOwner.dirtyElementCount;

      // Should be the same count since the element is already in the dirty set
      expect(countAfterSecond).toBe(countAfterFirst);
    });
  });

  // -----------------------------------------------------------------------
  // Test 3: Build phase ordering (parents before children)
  // -----------------------------------------------------------------------
  describe('build phase ordering', () => {
    it('rebuilds parents before children (sorted by depth)', () => {
      const rebuildOrder: string[] = [];

      // Create a parent StatefulWidget that tracks rebuild order
      class ParentWidget extends StatefulWidget {
        createState(): State<StatefulWidget> {
          return new ParentWidgetState();
        }
      }

      class ParentWidgetState extends State<ParentWidget> {
        value = 'parent-v0';

        build(_context: BuildContext): Widget {
          rebuildOrder.push(`parent:${this.value}`);
          return new ChildStatefulWidget();
        }

        updateValue(v: string): void {
          this.setState(() => { this.value = v; });
        }
      }

      class ChildStatefulWidget extends StatefulWidget {
        createState(): State<StatefulWidget> {
          return new ChildState();
        }
      }

      class ChildState extends State<ChildStatefulWidget> {
        value = 'child-v0';

        build(_context: BuildContext): Widget {
          rebuildOrder.push(`child:${this.value}`);
          return new NoopLeafWidget();
        }

        updateValue(v: string): void {
          this.setState(() => { this.value = v; });
        }
      }

      const binding = WidgetsBinding.instance;
      binding.attachRootWidget(new ParentWidget());
      binding.drawFrameSync();

      // Initial build order: parent then child
      expect(rebuildOrder).toEqual(['parent:parent-v0', 'child:child-v0']);

      rebuildOrder.length = 0;

      // Find both states
      let parentState: ParentWidgetState | null = null;
      let childState: ChildState | null = null;
      function findStates(element: any): void {
        if (element._state instanceof ParentWidgetState) {
          parentState = element._state;
        }
        if (element._state instanceof ChildState) {
          childState = element._state;
        }
        for (const child of element.children || []) findStates(child);
      }
      findStates(binding.rootElement!);
      expect(parentState).not.toBeNull();
      expect(childState).not.toBeNull();

      // Mark BOTH dirty — child first, then parent
      // BuildOwner should sort by depth and rebuild parent first
      childState!.updateValue('child-v1');
      parentState!.updateValue('parent-v1');

      binding.drawFrameSync();

      // Parent (shallower depth) should rebuild before child (deeper depth)
      // Note: When parent rebuilds, it creates a new ChildStatefulWidget.
      // The child's state may be reused (canUpdate) or replaced.
      // Either way, parent must rebuild first.
      expect(rebuildOrder.length).toBeGreaterThanOrEqual(1);
      expect(rebuildOrder[0]).toBe('parent:parent-v1');
    });
  });

  // -----------------------------------------------------------------------
  // Test 4: Frame pacing via FrameScheduler
  // -----------------------------------------------------------------------
  describe('frame scheduling integration', () => {
    it('requestFrame is called when scheduleBuildFor is called', () => {
      const binding = WidgetsBinding.instance;
      const widget = new CounterWidget();
      binding.attachRootWidget(widget);
      binding.drawFrameSync();

      // FrameScheduler should not have a frame scheduled after drawFrameSync
      const scheduler = FrameScheduler.instance;

      // Find counter state and call setState
      let counterState: CounterState | null = null;
      function findState(element: any): void {
        if (element._state instanceof CounterState) {
          counterState = element._state;
          return;
        }
        for (const child of element.children || []) findState(child);
      }
      findState(binding.rootElement!);

      // setState → markNeedsRebuild → scheduleBuildFor → requestFrame
      counterState!.increment();

      // After setState, the FrameScheduler should have a frame scheduled
      // (isFrameScheduled returns true when _frameScheduled or _frameInProgress)
      expect(scheduler.isFrameScheduled).toBe(true);
    });

    it('BuildOwner.scheduleBuildFor calls FrameScheduler.requestFrame directly', () => {
      // Verify the Amp-correct wiring: BuildOwner calls c9.instance.requestFrame()
      const binding = WidgetsBinding.instance;
      const widget = new CounterWidget();
      binding.attachRootWidget(widget);
      binding.drawFrameSync();

      // Create a standalone BuildOwner to verify it calls FrameScheduler directly
      const buildOwner = new BuildOwner();
      const scheduler = FrameScheduler.instance;

      // Create a mock dirty element
      const mockWidget = new NoopLeafWidget();
      const mockElement = mockWidget.createElement();
      mockElement._dirty = true;
      mockElement._mounted = true;

      // Before scheduling, consume any pending frame request
      // The scheduler might already have a scheduled frame from WidgetsBinding init
      // We just need to verify that scheduling a build triggers requestFrame
      buildOwner.scheduleBuildFor(mockElement);

      // The BuildOwner.scheduleBuildFor calls FrameScheduler.instance.requestFrame()
      // So isFrameScheduled should be true
      expect(scheduler.isFrameScheduled).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Test 5: Layout + Paint + Render pipeline
  // -----------------------------------------------------------------------
  describe('layout + paint + render pipeline', () => {
    it('layout applies constraints to render objects', () => {
      const binding = WidgetsBinding.instance;
      const widget = new CounterWidget();
      binding.attachRootWidget(widget);

      // Force a full frame
      binding.requestForcedPaintFrame();
      binding.drawFrameSync();

      // The root render object should have been laid out with the binding's constraints
      const rootRO = binding.pipelineOwner.rootNode;
      expect(rootRO).not.toBeNull();
      expect(rootRO!.hasSize).toBe(true);
      expect(rootRO!.size.width).toBeGreaterThan(0);
      expect(rootRO!.size.height).toBeGreaterThan(0);
    });

    it('paint writes character cells to ScreenBuffer', () => {
      const binding = WidgetsBinding.instance;
      const widget = new CounterWidget();
      binding.attachRootWidget(widget);

      binding.requestForcedPaintFrame();
      binding.drawFrameSync();

      // Verify specific characters from "count:0" are in the front buffer
      // (after present(), painted content is in front buffer)
      const cell0 = readFrontCell(binding, 0, 0);
      const cell1 = readFrontCell(binding, 1, 0);
      const cell2 = readFrontCell(binding, 2, 0);

      expect(cell0.char).toBe('c'); // 'c' from 'count:0'
      expect(cell1.char).toBe('o'); // 'o' from 'count:0'
      expect(cell2.char).toBe('u'); // 'u' from 'count:0'
    });

    it('render phase generates output when OutputWriter is set', () => {
      const binding = WidgetsBinding.instance;
      const widget = new CounterWidget();
      binding.attachRootWidget(widget);

      // Set up an output capture
      let outputCapture = '';
      binding.setOutput({
        write(data: string) {
          outputCapture += data;
        },
      });

      // Force paint and render
      binding.requestForcedPaintFrame();
      binding.drawFrameSync();

      // The render phase should have produced ANSI output
      expect(outputCapture.length).toBeGreaterThan(0);
    });

    it('no paint occurs when no dirty state exists', () => {
      const binding = WidgetsBinding.instance;
      const widget = new CounterWidget();
      binding.attachRootWidget(widget);

      // First frame paints
      binding.requestForcedPaintFrame();
      binding.drawFrameSync();
      expect(binding.didPaintCurrentFrame).toBe(true);

      // Second frame with no changes should NOT paint
      binding.drawFrameSync();
      expect(binding.didPaintCurrentFrame).toBe(false);
    });

    it('paint occurs after setState marks element dirty', () => {
      const binding = WidgetsBinding.instance;
      const widget = new CounterWidget();
      binding.attachRootWidget(widget);

      binding.requestForcedPaintFrame();
      binding.drawFrameSync();

      // Find counter state
      let counterState: CounterState | null = null;
      function findState(element: any): void {
        if (element._state instanceof CounterState) {
          counterState = element._state;
          return;
        }
        for (const child of element.children || []) findState(child);
      }
      findState(binding.rootElement!);

      // setState → dirty → shouldPaint → paint phase executes
      counterState!.increment();
      binding.drawFrameSync();

      // After the frame where we had dirty elements, paint should have occurred
      expect(binding.didPaintCurrentFrame).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Test 6: End-to-end: multiple frames with changing state
  // -----------------------------------------------------------------------
  describe('end-to-end multi-frame', () => {
    it('correctly renders across multiple state changes and frames', () => {
      const binding = WidgetsBinding.instance;
      const widget = new CounterWidget();
      binding.attachRootWidget(widget);

      binding.requestForcedPaintFrame();
      binding.drawFrameSync();

      let counterState: CounterState | null = null;
      function findState(element: any): void {
        if (element._state instanceof CounterState) {
          counterState = element._state;
          return;
        }
        for (const child of element.children || []) findState(child);
      }
      findState(binding.rootElement!);
      expect(counterState).not.toBeNull();

      // Frame 1: count:0 already verified above
      expect(readScreenRow(binding, 0, 10)).toContain('count:0');

      // Frame 2: increment to 1
      counterState!.increment();
      binding.drawFrameSync();
      expect(readScreenRow(binding, 0, 10)).toContain('count:1');

      // Frame 3: increment to 2
      counterState!.increment();
      binding.drawFrameSync();
      expect(readScreenRow(binding, 0, 10)).toContain('count:2');

      // Frame 4: no change — screen should still show count:2
      binding.drawFrameSync();
      expect(readScreenRow(binding, 0, 10)).toContain('count:2');

      // Frame 5: increment to 3
      counterState!.increment();
      binding.drawFrameSync();
      expect(readScreenRow(binding, 0, 10)).toContain('count:3');
    });
  });
});
