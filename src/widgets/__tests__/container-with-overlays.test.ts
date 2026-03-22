// Tests for ContainerWithOverlays widget
// Verifies construction, overlay grouping, positioning, and build output

import { describe, test, expect } from 'bun:test';
import {
  ContainerWithOverlays,
  type OverlaySpec,
  type OverlayPosition,
  type OverlayAlignment,
} from '../container-with-overlays';
import { Container } from '../container';
import { Stack } from '../stack';
import { Positioned } from '../stack';
import { Row } from '../flex';
import { SizedBox } from '../sized-box';
import { StatelessWidget, type BuildContext, type Widget } from '../../framework/widget';
import { EdgeInsets } from '../../layout/edge-insets';
import { BoxDecoration } from '../../layout/render-decorated';
import { BoxConstraints } from '../../core/box-constraints';

// Minimal test widget
class _DummyWidget extends StatelessWidget {
  readonly label: string;
  constructor(label?: string) {
    super();
    this.label = label ?? 'dummy';
  }
  build(_context: BuildContext): Widget {
    return this;
  }
}

// Stub BuildContext for build() calls
const _stubContext = { widget: null!, mounted: true } as unknown as BuildContext;

describe('ContainerWithOverlays', () => {
  // -----------------------------------------------------------------------
  // Construction
  // -----------------------------------------------------------------------

  describe('construction', () => {
    test('creates with no arguments, defaults applied', () => {
      const widget = new ContainerWithOverlays();

      expect(widget.containerChild).toBeUndefined();
      expect(widget.padding).toBeUndefined();
      expect(widget.overlays).toEqual([]);
      expect(widget.overlayGroupSpacing).toBe(1);
      expect(widget.decoration).toBeUndefined();
      expect(widget.constraints).toBeUndefined();
      expect(widget.width).toBeUndefined();
      expect(widget.height).toBeUndefined();
      expect(widget.margin).toBeUndefined();
    });

    test('creates with all properties specified', () => {
      const child = new _DummyWidget('child');
      const padding = EdgeInsets.all(2);
      const margin = EdgeInsets.all(1);
      const decoration = new BoxDecoration({});
      const constraints = new BoxConstraints({ minWidth: 10, maxWidth: 50 });
      const overlays: OverlaySpec[] = [
        { child: new _DummyWidget('ov'), position: 'top', alignment: 'left' },
      ];

      const widget = new ContainerWithOverlays({
        child,
        padding,
        margin,
        decoration,
        constraints,
        overlays,
        overlayGroupSpacing: 2,
        width: 40,
        height: 20,
      });

      expect(widget.containerChild).toBe(child);
      expect(widget.padding).toBe(padding);
      expect(widget.margin).toBe(margin);
      expect(widget.decoration).toBe(decoration);
      expect(widget.constraints).toBe(constraints);
      expect(widget.overlays).toHaveLength(1);
      expect(widget.overlayGroupSpacing).toBe(2);
      expect(widget.width).toBe(40);
      expect(widget.height).toBe(20);
    });

    test('overlays array is readonly', () => {
      const overlays: OverlaySpec[] = [
        { child: new _DummyWidget(), position: 'top', alignment: 'left' },
      ];
      const widget = new ContainerWithOverlays({ overlays });
      expect(widget.overlays).toHaveLength(1);
    });
  });

  // -----------------------------------------------------------------------
  // Build — no overlays
  // -----------------------------------------------------------------------

  describe('build without overlays', () => {
    test('returns Container when no overlays', () => {
      const child = new _DummyWidget('inner');
      const widget = new ContainerWithOverlays({
        child,
        width: 30,
        height: 10,
      });

      const result = widget.build(_stubContext);
      expect(result).toBeInstanceOf(Container);
    });

    test('returns Container wrapped in margin Container when margin is set', () => {
      const widget = new ContainerWithOverlays({
        width: 30,
        margin: EdgeInsets.all(1),
      });

      const result = widget.build(_stubContext);
      // Should be a Container (for margin) wrapping the inner Container
      expect(result).toBeInstanceOf(Container);
    });
  });

  // -----------------------------------------------------------------------
  // Build — with overlays
  // -----------------------------------------------------------------------

  describe('build with overlays', () => {
    test('wraps in Stack when overlays are present', () => {
      const overlay: OverlaySpec = {
        child: new _DummyWidget('overlay'),
        position: 'top',
        alignment: 'left',
      };
      const widget = new ContainerWithOverlays({
        child: new _DummyWidget('main'),
        overlays: [overlay],
      });

      const result = widget.build(_stubContext);
      expect(result).toBeInstanceOf(Stack);
    });

    test('Stack has passthrough fit', () => {
      const widget = new ContainerWithOverlays({
        overlays: [
          { child: new _DummyWidget(), position: 'top', alignment: 'left' },
        ],
      });

      const result = widget.build(_stubContext) as Stack;
      expect(result.fit).toBe('passthrough');
    });

    test('Stack children: first is Container, rest are Positioned', () => {
      const widget = new ContainerWithOverlays({
        child: new _DummyWidget('main'),
        overlays: [
          { child: new _DummyWidget('o1'), position: 'top', alignment: 'left' },
          { child: new _DummyWidget('o2'), position: 'bottom', alignment: 'right' },
        ],
      });

      const result = widget.build(_stubContext) as Stack;
      // Access children via the widget's internal children property
      const children = result.children;
      // First child should be a Container, the rest Positioned
      expect(children[0]).toBeInstanceOf(Container);
      expect(children[1]).toBeInstanceOf(Positioned);
      expect(children[2]).toBeInstanceOf(Positioned);
    });

    test('applies margin when overlays present', () => {
      const widget = new ContainerWithOverlays({
        overlays: [
          { child: new _DummyWidget(), position: 'top', alignment: 'left' },
        ],
        margin: EdgeInsets.all(2),
      });

      const result = widget.build(_stubContext);
      // Should be a Container (for margin) wrapping the Stack
      expect(result).toBeInstanceOf(Container);
    });
  });

  // -----------------------------------------------------------------------
  // Overlay grouping
  // -----------------------------------------------------------------------

  describe('overlay grouping', () => {
    test('groups overlays by position and alignment', () => {
      const o1 = new _DummyWidget('tl-1');
      const o2 = new _DummyWidget('tl-2');
      const o3 = new _DummyWidget('br');

      const widget = new ContainerWithOverlays({
        overlays: [
          { child: o1, position: 'top', alignment: 'left' },
          { child: o2, position: 'top', alignment: 'left' },
          { child: o3, position: 'bottom', alignment: 'right' },
        ],
      });

      const result = widget.build(_stubContext) as Stack;
      const children = result.children;
      // Container + 2 groups (top:left has 2 items, bottom:right has 1 item)
      expect(children).toHaveLength(3); // Container + 2 Positioned groups
    });

    test('single overlay in group renders child directly (no Row)', () => {
      const overlayChild = new _DummyWidget('single');
      const widget = new ContainerWithOverlays({
        overlays: [
          { child: overlayChild, position: 'top', alignment: 'left' },
        ],
      });

      const result = widget.build(_stubContext) as Stack;
      const children = result.children;
      const positioned = children[1] as Positioned;
      // The child of the Positioned should be the overlay widget directly
      const posChild = (positioned as Positioned).child;
      expect(posChild).toBe(overlayChild);
    });

    test('multiple overlays in same group renders Row', () => {
      const widget = new ContainerWithOverlays({
        overlays: [
          { child: new _DummyWidget('a'), position: 'top', alignment: 'left' },
          { child: new _DummyWidget('b'), position: 'top', alignment: 'left' },
        ],
      });

      const result = widget.build(_stubContext) as Stack;
      const children = result.children;
      const positioned = children[1] as Positioned;
      const posChild = (positioned as Positioned).child;
      expect(posChild).toBeInstanceOf(Row);
    });

    test('Row includes spacing SizedBox between items', () => {
      const widget = new ContainerWithOverlays({
        overlays: [
          { child: new _DummyWidget('a'), position: 'top', alignment: 'left' },
          { child: new _DummyWidget('b'), position: 'top', alignment: 'left' },
        ],
        overlayGroupSpacing: 3,
      });

      const result = widget.build(_stubContext) as Stack;
      const children = result.children;
      const positioned = children[1] as Positioned;
      const row = (positioned as Positioned).child as Row;
      // Row should have: [widget-a, SizedBox(spacing), widget-b]
      const rowChildren = row.children;
      expect(rowChildren).toHaveLength(3);
      expect(rowChildren[1]).toBeInstanceOf(SizedBox);
    });
  });

  // -----------------------------------------------------------------------
  // Positioned placement
  // -----------------------------------------------------------------------

  describe('overlay positioning', () => {
    test('top-left overlay: top=0, left=0', () => {
      const widget = new ContainerWithOverlays({
        overlays: [
          { child: new _DummyWidget(), position: 'top', alignment: 'left' },
        ],
      });

      const result = widget.build(_stubContext) as Stack;
      const children = result.children;
      const pos = children[1] as Positioned;
      expect(pos.top).toBe(0);
      expect(pos.left).toBe(0);
      expect(pos.bottom).toBeUndefined();
      expect(pos.right).toBeUndefined();
    });

    test('top-right overlay: top=0, right=0', () => {
      const widget = new ContainerWithOverlays({
        overlays: [
          { child: new _DummyWidget(), position: 'top', alignment: 'right' },
        ],
      });

      const result = widget.build(_stubContext) as Stack;
      const children = result.children;
      const pos = children[1] as Positioned;
      expect(pos.top).toBe(0);
      expect(pos.right).toBe(0);
      expect(pos.left).toBeUndefined();
      expect(pos.bottom).toBeUndefined();
    });

    test('top-center overlay: top=0, left=0, right=0', () => {
      const widget = new ContainerWithOverlays({
        overlays: [
          { child: new _DummyWidget(), position: 'top', alignment: 'center' },
        ],
      });

      const result = widget.build(_stubContext) as Stack;
      const children = result.children;
      const pos = children[1] as Positioned;
      expect(pos.top).toBe(0);
      expect(pos.left).toBe(0);
      expect(pos.right).toBe(0);
      expect(pos.bottom).toBeUndefined();
    });

    test('bottom-left overlay: bottom=0, left=0', () => {
      const widget = new ContainerWithOverlays({
        overlays: [
          { child: new _DummyWidget(), position: 'bottom', alignment: 'left' },
        ],
      });

      const result = widget.build(_stubContext) as Stack;
      const children = result.children;
      const pos = children[1] as Positioned;
      expect(pos.bottom).toBe(0);
      expect(pos.left).toBe(0);
      expect(pos.top).toBeUndefined();
      expect(pos.right).toBeUndefined();
    });

    test('bottom-right overlay: bottom=0, right=0', () => {
      const widget = new ContainerWithOverlays({
        overlays: [
          { child: new _DummyWidget(), position: 'bottom', alignment: 'right' },
        ],
      });

      const result = widget.build(_stubContext) as Stack;
      const children = result.children;
      const pos = children[1] as Positioned;
      expect(pos.bottom).toBe(0);
      expect(pos.right).toBe(0);
      expect(pos.top).toBeUndefined();
      expect(pos.left).toBeUndefined();
    });

    test('bottom-center overlay: bottom=0, left=0, right=0', () => {
      const widget = new ContainerWithOverlays({
        overlays: [
          { child: new _DummyWidget(), position: 'bottom', alignment: 'center' },
        ],
      });

      const result = widget.build(_stubContext) as Stack;
      const children = result.children;
      const pos = children[1] as Positioned;
      expect(pos.bottom).toBe(0);
      expect(pos.left).toBe(0);
      expect(pos.right).toBe(0);
      expect(pos.top).toBeUndefined();
    });

    test('offsetX applies to left-aligned overlay', () => {
      const widget = new ContainerWithOverlays({
        overlays: [
          { child: new _DummyWidget(), position: 'top', alignment: 'left', offsetX: 5 },
        ],
      });

      const result = widget.build(_stubContext) as Stack;
      const children = result.children;
      const pos = children[1] as Positioned;
      expect(pos.left).toBe(5);
      expect(pos.top).toBe(0);
    });

    test('offsetX applies to right-aligned overlay', () => {
      const widget = new ContainerWithOverlays({
        overlays: [
          { child: new _DummyWidget(), position: 'bottom', alignment: 'right', offsetX: 3 },
        ],
      });

      const result = widget.build(_stubContext) as Stack;
      const children = result.children;
      const pos = children[1] as Positioned;
      expect(pos.right).toBe(3);
      expect(pos.bottom).toBe(0);
    });

    test('offsetX applies to center-aligned overlay as symmetric inset', () => {
      const widget = new ContainerWithOverlays({
        overlays: [
          { child: new _DummyWidget(), position: 'top', alignment: 'center', offsetX: 2 },
        ],
      });

      const result = widget.build(_stubContext) as Stack;
      const children = result.children;
      const pos = children[1] as Positioned;
      expect(pos.left).toBe(2);
      expect(pos.right).toBe(2);
    });
  });

  // -----------------------------------------------------------------------
  // All positions and alignments
  // -----------------------------------------------------------------------

  describe('position/alignment combinations', () => {
    const positions: OverlayPosition[] = ['top', 'bottom'];
    const alignments: OverlayAlignment[] = ['left', 'center', 'right'];

    for (const position of positions) {
      for (const alignment of alignments) {
        test(`${position}-${alignment} produces valid Positioned`, () => {
          const widget = new ContainerWithOverlays({
            overlays: [
              { child: new _DummyWidget(), position, alignment },
            ],
          });

          const result = widget.build(_stubContext) as Stack;
          const children = result.children;
          expect(children).toHaveLength(2); // Container + 1 Positioned
          expect(children[1]).toBeInstanceOf(Positioned);
        });
      }
    }
  });

  // -----------------------------------------------------------------------
  // Container properties pass-through
  // -----------------------------------------------------------------------

  describe('container property pass-through', () => {
    test('passes width and height to inner Container', () => {
      const widget = new ContainerWithOverlays({
        width: 50,
        height: 25,
        overlays: [
          { child: new _DummyWidget(), position: 'top', alignment: 'left' },
        ],
      });

      const result = widget.build(_stubContext) as Stack;
      const children = result.children;
      const container = children[0] as Container;
      expect(container.width).toBe(50);
      expect(container.height).toBe(25);
    });

    test('passes padding and decoration to inner Container', () => {
      const padding = EdgeInsets.all(2);
      const decoration = new BoxDecoration({});

      const widget = new ContainerWithOverlays({
        padding,
        decoration,
        overlays: [
          { child: new _DummyWidget(), position: 'top', alignment: 'left' },
        ],
      });

      const result = widget.build(_stubContext) as Stack;
      const children = result.children;
      const container = children[0] as Container;
      expect(container.padding).toBe(padding);
      expect(container.decoration).toBe(decoration);
    });

    test('passes constraints to inner Container', () => {
      const constraints = new BoxConstraints({ minWidth: 10, maxWidth: 80 });

      const widget = new ContainerWithOverlays({
        constraints,
        overlays: [
          { child: new _DummyWidget(), position: 'top', alignment: 'left' },
        ],
      });

      const result = widget.build(_stubContext) as Stack;
      const children = result.children;
      const container = children[0] as Container;
      expect(container.constraints).toBe(constraints);
    });
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  describe('edge cases', () => {
    test('empty overlays array treated same as no overlays', () => {
      const widget = new ContainerWithOverlays({
        child: new _DummyWidget(),
        overlays: [],
      });

      const result = widget.build(_stubContext);
      expect(result).toBeInstanceOf(Container);
    });

    test('overlayGroupSpacing of 0 produces no SizedBox spacers', () => {
      const widget = new ContainerWithOverlays({
        overlays: [
          { child: new _DummyWidget('a'), position: 'top', alignment: 'left' },
          { child: new _DummyWidget('b'), position: 'top', alignment: 'left' },
        ],
        overlayGroupSpacing: 0,
      });

      const result = widget.build(_stubContext) as Stack;
      const children = result.children;
      const positioned = children[1] as Positioned;
      const row = (positioned as Positioned).child as Row;
      const rowChildren = row.children;
      // No SizedBox spacers: just the 2 widgets
      expect(rowChildren).toHaveLength(2);
    });

    test('multiple distinct groups produce separate Positioned widgets', () => {
      const widget = new ContainerWithOverlays({
        overlays: [
          { child: new _DummyWidget(), position: 'top', alignment: 'left' },
          { child: new _DummyWidget(), position: 'top', alignment: 'right' },
          { child: new _DummyWidget(), position: 'bottom', alignment: 'left' },
          { child: new _DummyWidget(), position: 'bottom', alignment: 'right' },
          { child: new _DummyWidget(), position: 'top', alignment: 'center' },
          { child: new _DummyWidget(), position: 'bottom', alignment: 'center' },
        ],
      });

      const result = widget.build(_stubContext) as Stack;
      const children = result.children;
      // Container + 6 distinct Positioned groups
      expect(children).toHaveLength(7);
    });
  });
});
