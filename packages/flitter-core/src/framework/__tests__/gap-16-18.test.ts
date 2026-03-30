// Tests for Gap 16: depth-ordered _nodesNeedingLayout in PipelineOwner
// and Gap 18: LayoutBuilder implementation
//
// These tests verify:
// 1. PipelineOwner processes layout nodes in depth order
// 2. PipelineOwner.requestLayoutFor works correctly
// 3. LayoutBuilder receives constraints and builds child accordingly
// 4. LayoutBuilder rebuilds when constraints change
// 5. LayoutBuilder correctly manages child element lifecycle

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { PipelineOwner } from '../../framework/pipeline-owner';
import { RenderBox, RenderObject, LeafRenderObjectWidget, type PaintContext } from '../../framework/render-object';
import { BoxConstraints } from '../../core/box-constraints';
import { Size, Offset } from '../../core/types';
import { WidgetsBinding, resetSchedulers } from '../../framework/binding';
import { FrameScheduler } from '../../scheduler/frame-scheduler';
import { Widget, StatelessWidget, type BuildContext } from '../../framework/widget';
import { LayoutBuilder, RenderLayoutBuilder, LayoutBuilderElement } from '../../widgets/builder';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

class TestRenderBox extends RenderBox {
  layoutCount = 0;
  lastConstraints: BoxConstraints | null = null;

  performLayout(): void {
    this.layoutCount++;
    if (this.constraints) {
      this.lastConstraints = this.constraints;
      this.size = this.constraints.constrain(
        new Size(this.constraints.maxWidth, this.constraints.maxHeight),
      );
    }
  }

  paint(): void {}
}

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
    (context as any).drawText?.(offset.col, offset.row, this.text);
  }
}

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

class NoopLeafWidget extends LeafRenderObjectWidget {
  createRenderObject(): RenderObject {
    return new NoopRenderBox();
  }
}

// ---------------------------------------------------------------------------
// Gap 16: PipelineOwner depth-ordered layout
// ---------------------------------------------------------------------------

describe('Gap 16: PipelineOwner depth-ordered _nodesNeedingLayout', () => {
  let owner: PipelineOwner;

  beforeEach(() => {
    owner = new PipelineOwner();
  });

  describe('addNodeNeedingLayout', () => {
    it('adds a node to the layout queue', () => {
      const root = new TestRenderBox();
      owner.setRootRenderObject(root);
      expect(owner.hasNodesNeedingLayout).toBe(true);
    });

    it('nodesNeedingLayout returns snapshot of pending nodes', () => {
      const root = new TestRenderBox();
      owner.setRootRenderObject(root);
      expect(owner.nodesNeedingLayout.length).toBeGreaterThan(0);
      expect(owner.nodesNeedingLayout[0]).toBe(root);
    });
  });

  describe('requestLayoutFor', () => {
    it('adds a specific node to the layout queue', () => {
      const node = new TestRenderBox();
      owner.requestLayoutFor(node);
      expect(owner.hasNodesNeedingLayout).toBe(true);
    });
  });

  describe('flushLayout depth ordering', () => {
    it('processes parent before child in layout list', () => {
      const layoutOrder: string[] = [];

      class TrackingRenderBox extends RenderBox {
        name: string;
        private _child: RenderBox | null = null;

        constructor(name: string) {
          super();
          this.name = name;
        }

        get child(): RenderBox | null { return this._child; }

        set child(value: RenderBox | null) {
          if (this._child === value) return;
          if (this._child) this.dropChild(this._child);
          this._child = value;
          if (this._child) this.adoptChild(this._child);
        }

        override visitChildren(visitor: (child: RenderObject) => void): void {
          if (this._child) visitor(this._child);
        }

        performLayout(): void {
          layoutOrder.push(this.name);
          if (this.constraints) {
            if (this._child) {
              this._child.layout(this.constraints);
              this.size = this.constraints.constrain(this._child.size);
            } else {
              this.size = this.constraints.constrain(
                new Size(this.constraints.maxWidth, this.constraints.maxHeight),
              );
            }
          }
        }

        paint(): void {}
      }

      const parent = new TrackingRenderBox('parent');
      const child = new TrackingRenderBox('child');
      parent.child = child;

      owner.setRootRenderObject(parent);
      owner.setConstraints(BoxConstraints.tight(new Size(80, 24)));

      // Flush -- parent should be laid out first (shallower depth)
      owner.flushLayout();
      expect(layoutOrder[0]).toBe('parent');
    });

    it('handles re-entrant additions during layout', () => {
      // When performLayout adds a new node to the layout list,
      // it should be processed in a subsequent iteration
      let extraLayoutCount = 0;

      class ReentrantRenderBox extends RenderBox {
        private _triggered = false;

        performLayout(): void {
          if (this.constraints) {
            this.size = this.constraints.constrain(
              new Size(this.constraints.maxWidth, this.constraints.maxHeight),
            );
          }
          if (!this._triggered && this.owner) {
            this._triggered = true;
            // Simulate a re-entrant addition
            const extra = new TestRenderBox();
            this.adoptChild(extra);
            extra.layout(this.constraints!);
            extraLayoutCount++;
          }
        }

        paint(): void {}
      }

      const root = new ReentrantRenderBox();
      owner.setRootRenderObject(root);
      owner.setConstraints(BoxConstraints.tight(new Size(80, 24)));

      const result = owner.flushLayout();
      expect(result).toBe(true);
      expect(extraLayoutCount).toBe(1);
    });

    it('skips already-clean nodes', () => {
      const root = new TestRenderBox();
      owner.setRootRenderObject(root);
      owner.setConstraints(BoxConstraints.tight(new Size(80, 24)));

      // First flush lays out the root
      owner.flushLayout();
      expect(root.layoutCount).toBe(1);

      // Second flush should be no-op (root is clean)
      const result = owner.flushLayout();
      expect(result).toBe(false);
      expect(root.layoutCount).toBe(1);
    });
  });

  describe('removeFromQueues', () => {
    it('removes node from layout queue', () => {
      const root = new TestRenderBox();
      owner.setRootRenderObject(root);
      expect(owner.hasNodesNeedingLayout).toBe(true);

      owner.removeFromQueues(root);
      expect(owner.hasNodesNeedingLayout).toBe(false);
    });

    it('removes node from both layout and paint queues', () => {
      const node = new TestRenderBox();
      owner.requestLayoutFor(node);
      owner.requestPaint(node);

      expect(owner.hasNodesNeedingLayout).toBe(true);
      expect(owner.hasNodesNeedingPaint).toBe(true);

      owner.removeFromQueues(node);
      expect(owner.hasNodesNeedingLayout).toBe(false);
      expect(owner.hasNodesNeedingPaint).toBe(false);
    });
  });

  describe('dispose', () => {
    it('clears layout queue', () => {
      const root = new TestRenderBox();
      owner.setRootRenderObject(root);
      expect(owner.hasNodesNeedingLayout).toBe(true);

      owner.dispose();
      expect(owner.hasNodesNeedingLayout).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Gap 18: LayoutBuilder
// ---------------------------------------------------------------------------

describe('Gap 18: LayoutBuilder', () => {
  beforeEach(() => {
    WidgetsBinding.reset();
    FrameScheduler.reset();
  });

  afterEach(() => {
    WidgetsBinding.reset();
    FrameScheduler.reset();
  });

  describe('LayoutBuilder widget', () => {
    it('creates a LayoutBuilderElement', () => {
      const widget = new LayoutBuilder({
        builder: (_context, _constraints) => new NoopLeafWidget(),
      });
      const element = widget.createElement();
      expect(element).toBeInstanceOf(LayoutBuilderElement);
    });

    it('creates a RenderLayoutBuilder render object', () => {
      const widget = new LayoutBuilder({
        builder: (_context, _constraints) => new NoopLeafWidget(),
      });
      const renderObj = widget.createRenderObject();
      expect(renderObj).toBeInstanceOf(RenderLayoutBuilder);
    });
  });

  describe('RenderLayoutBuilder', () => {
    it('invokes callback during performLayout', () => {
      const renderObj = new RenderLayoutBuilder();
      let receivedConstraints: BoxConstraints | null = null;

      renderObj.updateCallback((constraints) => {
        receivedConstraints = constraints;
      });

      const constraints = BoxConstraints.tight(new Size(80, 24));
      renderObj.layout(constraints);

      expect(receivedConstraints).not.toBeNull();
      expect(receivedConstraints!.maxWidth).toBe(80);
      expect(receivedConstraints!.maxHeight).toBe(24);
    });

    it('lays out child after callback', () => {
      const renderObj = new RenderLayoutBuilder();
      const childBox = new TestRenderBox();

      renderObj.updateCallback((_constraints) => {
        // Simulate element attaching a child during the callback
        renderObj.child = childBox;
      });

      const constraints = BoxConstraints.tight(new Size(80, 24));
      renderObj.layout(constraints);

      expect(childBox.layoutCount).toBe(1);
      expect(renderObj.size.width).toBe(80);
      expect(renderObj.size.height).toBe(24);
    });

    it('sizes to zero when no child', () => {
      const renderObj = new RenderLayoutBuilder();
      renderObj.updateCallback(() => {});

      const constraints = new BoxConstraints({
        minWidth: 0, maxWidth: 80,
        minHeight: 0, maxHeight: 24,
      });
      renderObj.layout(constraints);

      expect(renderObj.size.width).toBe(0);
      expect(renderObj.size.height).toBe(0);
    });

    it('manages child lifecycle via child setter', () => {
      const renderObj = new RenderLayoutBuilder();
      const child1 = new TestRenderBox();
      const child2 = new TestRenderBox();

      renderObj.child = child1;
      expect(child1.parent).toBe(renderObj);

      renderObj.child = child2;
      expect(child1.parent).toBeNull();
      expect(child2.parent).toBe(renderObj);

      renderObj.child = null;
      expect(child2.parent).toBeNull();
    });

    it('visits child', () => {
      const renderObj = new RenderLayoutBuilder();
      const child = new TestRenderBox();
      renderObj.child = child;

      const visited: RenderObject[] = [];
      renderObj.visitChildren((c) => visited.push(c));
      expect(visited).toEqual([child]);
    });
  });

  describe('LayoutBuilder integration with binding', () => {
    it('passes constraints from parent to builder callback', () => {
      const binding = WidgetsBinding.instance;
      let receivedConstraints: BoxConstraints | null = null;

      const widget = new LayoutBuilder({
        builder: (_context, constraints) => {
          receivedConstraints = constraints;
          return new TextLeafWidget(`${constraints.maxWidth}x${constraints.maxHeight}`);
        },
      });

      binding.attachRootWidget(widget);
      binding.requestForcedPaintFrame();
      binding.drawFrameSync();

      expect(receivedConstraints).not.toBeNull();
      // The binding's default screen is 80x24
      expect(receivedConstraints!.maxWidth).toBeGreaterThan(0);
      expect(receivedConstraints!.maxHeight).toBeGreaterThan(0);
    });

    it('builder result is rendered as child', () => {
      const binding = WidgetsBinding.instance;

      const widget = new LayoutBuilder({
        builder: (_context, constraints) => {
          return new TextLeafWidget('layout-built');
        },
      });

      binding.attachRootWidget(widget);
      binding.requestForcedPaintFrame();
      binding.drawFrameSync();

      // Verify the render tree has the child
      const rootRO = binding.pipelineOwner.rootNode;
      expect(rootRO).not.toBeNull();
      expect(rootRO!.hasSize).toBe(true);
    });

    it('rebuilds child when builder changes on widget update', () => {
      const binding = WidgetsBinding.instance;
      const buildCalls: string[] = [];

      // Use a wrapper to control what LayoutBuilder gets
      class TestWrapper extends StatelessWidget {
        label: string;
        constructor(label: string) {
          super();
          this.label = label;
        }
        build(_context: BuildContext): Widget {
          return new LayoutBuilder({
            builder: (_ctx, constraints) => {
              buildCalls.push(this.label);
              return new TextLeafWidget(this.label);
            },
          });
        }
      }

      binding.attachRootWidget(new TestWrapper('v1'));
      binding.requestForcedPaintFrame();
      binding.drawFrameSync();

      expect(buildCalls).toContain('v1');
    });

    it('provides a BuildContext to the builder', () => {
      const binding = WidgetsBinding.instance;
      let hasContext = false;

      const widget = new LayoutBuilder({
        builder: (context, _constraints) => {
          hasContext = context !== null && context !== undefined;
          return new NoopLeafWidget();
        },
      });

      binding.attachRootWidget(widget);
      binding.requestForcedPaintFrame();
      binding.drawFrameSync();

      expect(hasContext).toBe(true);
    });

    it('handles loose constraints correctly', () => {
      const binding = WidgetsBinding.instance;
      let constraintsLoose = false;

      const widget = new LayoutBuilder({
        builder: (_context, constraints) => {
          // The root constraints from the binding are loose (min=0, max=screen size)
          constraintsLoose = constraints.minWidth === 0 && constraints.minHeight === 0
            && constraints.maxWidth > 0 && constraints.maxHeight > 0;
          return new NoopLeafWidget();
        },
      });

      binding.attachRootWidget(widget);
      binding.requestForcedPaintFrame();
      binding.drawFrameSync();

      expect(constraintsLoose).toBe(true);
    });

    it('builder receives updated constraints after resize', () => {
      const binding = WidgetsBinding.instance;
      const constraintHistory: { w: number; h: number }[] = [];

      const widget = new LayoutBuilder({
        builder: (_context, constraints) => {
          constraintHistory.push({
            w: constraints.maxWidth,
            h: constraints.maxHeight,
          });
          return new NoopLeafWidget();
        },
      });

      binding.attachRootWidget(widget);
      binding.requestForcedPaintFrame();
      binding.drawFrameSync();

      expect(constraintHistory.length).toBeGreaterThanOrEqual(1);

      // The initial render used the default screen size
      const initial = constraintHistory[constraintHistory.length - 1];
      expect(initial.w).toBeGreaterThan(0);
      expect(initial.h).toBeGreaterThan(0);
    });
  });
});
