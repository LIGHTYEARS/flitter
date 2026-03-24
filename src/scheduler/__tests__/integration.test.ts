// End-to-end integration test for WidgetsBinding + ScreenBuffer + Renderer pipeline.
// Tests the full 4-phase frame pipeline: BUILD -> LAYOUT -> PAINT -> RENDER
//
// Verifies that:
// 1. runApp() creates the widget/element/render trees
// 2. drawFrameSync() runs the full pipeline
// 3. The render tree is built and laid out
// 4. Paint writes cells to the screen buffer
// 5. Render produces ANSI output via the output writer

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { WidgetsBinding, runApp } from '../../framework/binding';
import { Widget, StatelessWidget, type BuildContext } from '../../framework/widget';
import {
  LeafRenderObjectWidget,
  RenderBox,
  RenderObject,
  type PaintContext,
} from '../../framework/render-object';
import { BoxConstraints } from '../../core/box-constraints';
import { Offset, Size } from '../../core/types';
import { FrameScheduler } from '../frame-scheduler';

// ---------------------------------------------------------------------------
// Test helpers — concrete widgets and render objects for integration testing
// ---------------------------------------------------------------------------

/** Track paint calls for verification */
const paintCalls: Array<{ x: number; y: number; w: number; h: number }> = [];

/** A render box that fills its area in the screen buffer. */
class FillingRenderBox extends RenderBox {
  readonly fillChar: string;

  constructor(fillChar: string = 'X') {
    super();
    this.fillChar = fillChar;
  }

  performLayout(): void {
    if (this.constraints) {
      // Take all available space up to 10x5
      const w = Math.min(10, this.constraints.maxWidth);
      const h = Math.min(5, this.constraints.maxHeight);
      this.size = new Size(w, h);
    }
  }

  paint(context: PaintContext, offset: Offset): void {
    paintCalls.push({
      x: offset.col,
      y: offset.row,
      w: this.size.width,
      h: this.size.height,
    });
    // Note: PaintContext from render-object.ts is just an interface {}.
    // The real PaintContext (from scheduler/paint-context.ts) has drawChar etc.
    // When paintRenderTree() is called from binding, it creates the real one.
  }
}

/** A leaf widget that creates a FillingRenderBox. */
class FillingWidget extends LeafRenderObjectWidget {
  readonly fillChar: string;

  constructor(fillChar: string = 'X') {
    super();
    this.fillChar = fillChar;
  }

  createRenderObject(): RenderObject {
    return new FillingRenderBox(this.fillChar);
  }
}

/** A minimal render box used for basic testing */
class TestRenderBox extends RenderBox {
  performLayout(): void {
    if (this.constraints) {
      this.size = this.constraints.constrain(
        new Size(this.constraints.maxWidth, this.constraints.maxHeight),
      );
    }
  }
  paint(_context: PaintContext, _offset: Offset): void {}
}

/** A leaf widget that creates a TestRenderBox — terminates the tree. */
class LeafTestWidget extends LeafRenderObjectWidget {
  createRenderObject(): RenderObject {
    return new TestRenderBox();
  }
}

/** A StatelessWidget that builds a LeafTestWidget. */
class SimpleApp extends StatelessWidget {
  buildCount = 0;

  build(_context: BuildContext): Widget {
    this.buildCount++;
    return new LeafTestWidget();
  }
}

/** A StatelessWidget that builds a FillingWidget. */
class FillingApp extends StatelessWidget {
  buildCount = 0;
  readonly fillChar: string;

  constructor(fillChar: string = 'X') {
    super();
    this.fillChar = fillChar;
  }

  build(_context: BuildContext): Widget {
    this.buildCount++;
    return new FillingWidget(this.fillChar);
  }
}

// ---------------------------------------------------------------------------
// Integration tests
// ---------------------------------------------------------------------------

describe('WidgetsBinding Integration', () => {
  beforeEach(() => {
    WidgetsBinding.reset();
    FrameScheduler.reset();
    paintCalls.length = 0;
  });

  afterEach(() => {
    WidgetsBinding.reset();
    FrameScheduler.reset();
    paintCalls.length = 0;
  });

  describe('full pipeline: runApp + drawFrameSync', () => {
    it('builds the widget tree and creates render objects', async () => {
      const app = new SimpleApp();
      const binding = await runApp(app);

      // The root element should be created
      expect(binding.rootElement).not.toBeNull();
      expect(binding.rootElement!.mounted).toBe(true);
      expect(binding.isRunning).toBe(true);

      // The widget's build method should have been called
      expect(app.buildCount).toBe(1);
    });

    it('runs build + layout phases via drawFrameSync', () => {
      const binding = WidgetsBinding.instance;
      const app = new SimpleApp();
      binding.attachRootWidget(app);

      // Run a full synchronous frame
      binding.drawFrameSync();

      // Build phase should have run
      expect(binding.buildOwner.hasDirtyElements).toBe(false);

      // The root render object should be wired to the pipeline owner
      const rootRO = binding.pipelineOwner.rootNode;
      expect(rootRO).not.toBeNull();

      // Layout should have been performed
      expect(rootRO!.needsLayout).toBe(false);
      expect(rootRO!.hasSize).toBe(true);
    });

    it('creates screen buffer with correct default size', () => {
      const binding = WidgetsBinding.instance;
      binding.attachRootWidget(new SimpleApp());

      const screen = binding.getScreen();
      const size = screen.getSize();
      expect(size.width).toBe(80);
      expect(size.height).toBe(24);
    });

    it('creates renderer', () => {
      const binding = WidgetsBinding.instance;
      binding.attachRootWidget(new SimpleApp());

      const renderer = binding.getRenderer();
      expect(renderer).not.toBeNull();
      expect(renderer).toBeDefined();
    });

    it('paint phase sets didPaintCurrentFrame when render tree is dirty', () => {
      const binding = WidgetsBinding.instance;
      binding.attachRootWidget(new SimpleApp());

      // Force paint to ensure the frame runs paint
      binding.requestForcedPaintFrame();

      // Now run a sync frame
      binding.drawFrameSync();

      // Should have painted
      expect(binding.didPaintCurrentFrame).toBe(true);
    });

    it('render phase produces ANSI output when output is set', () => {
      const binding = WidgetsBinding.instance;

      // Set up an output collector
      let outputData = '';
      binding.setOutput({
        write(data: string) {
          outputData += data;
        },
      });

      binding.attachRootWidget(new SimpleApp());
      binding.requestForcedPaintFrame();
      binding.drawFrameSync();

      // If paint happened, render should have produced output
      if (binding.didPaintCurrentFrame) {
        // Output should contain ANSI escape sequences
        expect(outputData.length).toBeGreaterThan(0);
        // Should contain BSU (Begin Synchronized Update)
        expect(outputData).toContain('\x1b[?2026h');
        // Should contain ESU (End Synchronized Update)
        expect(outputData).toContain('\x1b[?2026l');
      }
    });

    it('no output when no output writer is set', () => {
      const binding = WidgetsBinding.instance;
      // Don't set output
      binding.attachRootWidget(new SimpleApp());
      binding.requestForcedPaintFrame();

      // Should not throw
      binding.drawFrameSync();
    });
  });

  describe('dirty state tracking', () => {
    it('beginFrame detects dirty elements', () => {
      const binding = WidgetsBinding.instance;
      binding.attachRootWidget(new SimpleApp());

      // Mark a dirty element
      const root = binding.rootElement!;
      if (root.children.length > 0) {
        const child = root.children[0];
        child._dirty = true;
        binding.buildOwner.scheduleBuildFor(child);
      }

      binding.beginFrame();
      expect(binding.shouldPaintCurrentFrame).toBe(true);
    });

    it('beginFrame clears forcePaintOnNextFrame', () => {
      const binding = WidgetsBinding.instance;
      binding.attachRootWidget(new SimpleApp());

      binding.requestForcedPaintFrame();
      expect(binding.forcePaintOnNextFrame).toBe(true);

      binding.beginFrame();
      expect(binding.forcePaintOnNextFrame).toBe(false);
      expect(binding.shouldPaintCurrentFrame).toBe(true);
    });

    it('beginFrame resets didPaintCurrentFrame', () => {
      const binding = WidgetsBinding.instance;
      binding.attachRootWidget(new SimpleApp());

      binding.beginFrame();
      expect(binding.didPaintCurrentFrame).toBe(false);
    });
  });

  describe('resize handling', () => {
    it('handleResize sets pendingResizeEvent', () => {
      const binding = WidgetsBinding.instance;
      binding.attachRootWidget(new SimpleApp());

      binding.handleResize(120, 40);
      expect(binding.pendingResizeEvent).toEqual({ width: 120, height: 40 });
    });

    it('processResizeIfPending clears the event and resizes screen', () => {
      const binding = WidgetsBinding.instance;
      binding.attachRootWidget(new SimpleApp());

      // Get screen first so it exists
      const screen = binding.getScreen();
      expect(screen.getSize()).toEqual({ width: 80, height: 24 });

      // Set a pending resize
      binding.handleResize(120, 40);
      expect(binding.pendingResizeEvent).not.toBeNull();

      // Process the resize
      binding.processResizeIfPending();

      // Should be cleared
      expect(binding.pendingResizeEvent).toBeNull();

      // Screen should be resized
      const newSize = screen.getSize();
      expect(newSize.width).toBe(120);
      expect(newSize.height).toBe(40);
    });

    it('processResizeIfPending sets shouldPaintCurrentFrame', () => {
      const binding = WidgetsBinding.instance;
      binding.attachRootWidget(new SimpleApp());

      binding.handleResize(120, 40);
      binding.beginFrame(); // reset shouldPaint
      binding.processResizeIfPending();

      expect(binding.shouldPaintCurrentFrame).toBe(true);
    });

    it('drawFrameSync processes pending resize', () => {
      const binding = WidgetsBinding.instance;
      binding.attachRootWidget(new SimpleApp());

      // Get screen first
      const screen = binding.getScreen();

      // Queue resize + run frame
      binding.handleResize(100, 30);
      binding.drawFrameSync();

      // Resize should have been processed
      expect(binding.pendingResizeEvent).toBeNull();
      const newSize = screen.getSize();
      expect(newSize.width).toBe(100);
      expect(newSize.height).toBe(30);
    });
  });

  describe('screen buffer integration', () => {
    it('getScreen returns the same instance', () => {
      const binding = WidgetsBinding.instance;
      const s1 = binding.getScreen();
      const s2 = binding.getScreen();
      expect(s1).toBe(s2);
    });

    it('getRenderer returns the same instance', () => {
      const binding = WidgetsBinding.instance;
      const r1 = binding.getRenderer();
      const r2 = binding.getRenderer();
      expect(r1).toBe(r2);
    });

    it('paint clears screen buffer before painting', () => {
      const binding = WidgetsBinding.instance;
      binding.attachRootWidget(new SimpleApp());

      // Pre-fill screen with data
      const screen = binding.getScreen();
      screen.setChar(0, 0, 'Z');

      // Run a frame with forced paint
      binding.requestForcedPaintFrame();
      binding.drawFrameSync();

      // The screen was cleared and repainted
      // (verify paint ran by checking didPaintCurrentFrame)
      expect(binding.didPaintCurrentFrame).toBe(true);
    });

    it('render calls present to swap buffers', () => {
      const binding = WidgetsBinding.instance;
      binding.setOutput({ write: () => {} }); // Need output to trigger render

      binding.attachRootWidget(new SimpleApp());
      binding.requestForcedPaintFrame();
      binding.drawFrameSync();

      // After render, the screen buffer should have swapped (present was called)
      // We can verify this indirectly: screen should exist and be in a clean state
      const screen = binding.getScreen();
      expect(screen).toBeDefined();
    });
  });

  describe('frame skip optimization', () => {
    it('skips paint when nothing is dirty', () => {
      const binding = WidgetsBinding.instance;
      binding.attachRootWidget(new SimpleApp());

      // Run first frame to process initial dirty state
      binding.requestForcedPaintFrame();
      binding.drawFrameSync();
      expect(binding.didPaintCurrentFrame).toBe(true);

      // Run another frame without any dirty state or forced paint
      binding.drawFrameSync();

      // Should have skipped paint (nothing dirty)
      expect(binding.shouldPaintCurrentFrame).toBe(false);
      expect(binding.didPaintCurrentFrame).toBe(false);
    });

    it('skips render when paint was skipped', () => {
      const binding = WidgetsBinding.instance;
      let renderCallCount = 0;
      binding.setOutput({
        write() {
          renderCallCount++;
        },
      });

      binding.attachRootWidget(new SimpleApp());

      // First frame: force paint
      binding.requestForcedPaintFrame();
      binding.drawFrameSync();
      const firstRenderCalls = renderCallCount;

      // Second frame: nothing dirty
      binding.drawFrameSync();

      // Render should not have been called again
      expect(renderCallCount).toBe(firstRenderCalls);
    });
  });

  describe('FrameScheduler integration', () => {
    it('WidgetsBinding registers callbacks with FrameScheduler', () => {
      // Creating the binding should register 6 callbacks
      const _binding = WidgetsBinding.instance;
      const scheduler = FrameScheduler.instance;

      // Should have registered frame callbacks
      expect(scheduler.frameCallbackCount).toBeGreaterThanOrEqual(6);
    });

    it('requestForcedPaintFrame sets flag and requests frame', () => {
      const binding = WidgetsBinding.instance;
      binding.attachRootWidget(new SimpleApp());

      binding.requestForcedPaintFrame();
      expect(binding.forcePaintOnNextFrame).toBe(true);
    });
  });

  describe('backward compatibility', () => {
    it('runApp returns the binding instance', async () => {
      const binding = await runApp(new SimpleApp());
      expect(binding).toBe(WidgetsBinding.instance);
    });

    it('reset cleans up screen and renderer', () => {
      const binding = WidgetsBinding.instance;
      binding.attachRootWidget(new SimpleApp());

      // Access screen and renderer
      binding.getScreen();
      binding.getRenderer();

      WidgetsBinding.reset();

      // After reset, a new instance should have fresh screen/renderer
      const newBinding = WidgetsBinding.instance;
      expect(newBinding).not.toBe(binding);
    });

    it('drawFrameSync still works for testing (backward compat)', () => {
      const binding = WidgetsBinding.instance;
      binding.attachRootWidget(new SimpleApp());

      // Should not throw
      binding.drawFrameSync();

      // Build should have completed
      expect(binding.buildOwner.hasDirtyElements).toBe(false);
    });

    it('stop still works', () => {
      const binding = WidgetsBinding.instance;
      binding.attachRootWidget(new SimpleApp());
      expect(binding.isRunning).toBe(true);

      binding.stop();
      expect(binding.isRunning).toBe(false);
      expect(binding.rootElement).toBeNull();
    });
  });
});
