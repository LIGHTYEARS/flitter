// Tests for Flex widgets: Row, Column, Flex, ParentDataWidget, Flexible, Expanded, Spacer.
// Covers widget creation, render object creation, parent data application,
// static factories, and integration with the layout system.

import { describe, expect, test } from 'bun:test';
import { Offset, Size } from '../../core/types';
import { BoxConstraints } from '../../core/box-constraints';
import { RenderBox, PaintContext, RenderObject } from '../../framework/render-object';
import { Widget, StatelessWidget, type BuildContext } from '../../framework/widget';
import { RenderFlex } from '../../layout/render-flex';
import { FlexParentData } from '../../layout/parent-data';
import { RenderConstrainedBox } from '../../layout/render-constrained';

import { Flex, Row, Column } from '../flex';
import { ParentDataWidget, ParentDataElement } from '../parent-data-widget';
import { Flexible, Expanded } from '../flexible';
import { Spacer } from '../spacer';
import { SizedBox } from '../sized-box';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** A minimal RenderBox that takes a fixed desired size. */
class FixedSizeBox extends RenderBox {
  private _desiredSize: Size;

  constructor(width: number, height: number) {
    super();
    this._desiredSize = new Size(width, height);
  }

  performLayout(): void {
    this.size = this.constraints!.constrain(this._desiredSize);
  }

  paint(_context: PaintContext, _offset: Offset): void {}
}

/** A RenderBox that takes the biggest size allowed by constraints. */
class GreedyBox extends RenderBox {
  performLayout(): void {
    const c = this.constraints!;
    const w = Number.isFinite(c.maxWidth) ? c.maxWidth : c.minWidth;
    const h = Number.isFinite(c.maxHeight) ? c.maxHeight : c.minHeight;
    this.size = new Size(w, h);
  }

  paint(_context: PaintContext, _offset: Offset): void {}
}

/** A minimal leaf widget for testing that wraps a FixedSizeBox. */
class TestLeafWidget extends Widget {
  readonly _width: number;
  readonly _height: number;

  constructor(width: number, height: number) {
    super();
    this._width = width;
    this._height = height;
  }

  createElement(): any {
    const { LeafRenderObjectElement } = require('../../framework/element');
    // Patch: create a simple element that creates a FixedSizeBox
    const elem = new LeafRenderObjectElement(this);
    return elem;
  }

  createRenderObject(): RenderBox {
    return new FixedSizeBox(this._width, this._height);
  }

  updateRenderObject(_renderObject: RenderObject): void {}
}

// ---------------------------------------------------------------------------
// Flex Widget Tests
// ---------------------------------------------------------------------------

describe('Flex widget', () => {
  test('creates RenderFlex with specified direction', () => {
    const widget = new Flex({
      direction: 'horizontal',
    });
    const ro = widget.createRenderObject();
    expect(ro).toBeInstanceOf(RenderFlex);
    expect(ro.direction).toBe('horizontal');
  });

  test('creates RenderFlex with all properties', () => {
    const widget = new Flex({
      direction: 'vertical',
      mainAxisAlignment: 'center',
      crossAxisAlignment: 'end',
      mainAxisSize: 'min',
    });
    const ro = widget.createRenderObject();
    expect(ro.direction).toBe('vertical');
    expect(ro.mainAxisAlignment).toBe('center');
    expect(ro.crossAxisAlignment).toBe('end');
    expect(ro.mainAxisSize).toBe('min');
  });

  test('defaults to start/center/max', () => {
    const widget = new Flex({ direction: 'horizontal' });
    const ro = widget.createRenderObject();
    expect(ro.mainAxisAlignment).toBe('start');
    expect(ro.crossAxisAlignment).toBe('center');
    expect(ro.mainAxisSize).toBe('max');
  });

  test('updateRenderObject updates all properties', () => {
    const widget1 = new Flex({ direction: 'horizontal' });
    const ro = widget1.createRenderObject();

    const widget2 = new Flex({
      direction: 'vertical',
      mainAxisAlignment: 'end',
      crossAxisAlignment: 'stretch',
      mainAxisSize: 'min',
    });
    widget2.updateRenderObject(ro);

    expect(ro.direction).toBe('vertical');
    expect(ro.mainAxisAlignment).toBe('end');
    expect(ro.crossAxisAlignment).toBe('stretch');
    expect(ro.mainAxisSize).toBe('min');
  });

  test('stores children', () => {
    const child1 = new TestLeafWidget(10, 10);
    const child2 = new TestLeafWidget(20, 20);
    const widget = new Flex({
      direction: 'horizontal',
      children: [child1, child2],
    });
    expect(widget.children.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Row Widget Tests
// ---------------------------------------------------------------------------

describe('Row widget', () => {
  test('creates RenderFlex with horizontal direction', () => {
    const row = new Row();
    const ro = row.createRenderObject();
    expect(ro).toBeInstanceOf(RenderFlex);
    expect(ro.direction).toBe('horizontal');
  });

  test('defaults to start/center/max', () => {
    const row = new Row();
    const ro = row.createRenderObject();
    expect(ro.mainAxisAlignment).toBe('start');
    expect(ro.crossAxisAlignment).toBe('center');
    expect(ro.mainAxisSize).toBe('max');
  });

  test('Row.start factory', () => {
    const row = Row.start([]);
    const ro = row.createRenderObject();
    expect(ro.direction).toBe('horizontal');
    expect(ro.mainAxisAlignment).toBe('start');
  });

  test('Row.center factory', () => {
    const row = Row.center([]);
    const ro = row.createRenderObject();
    expect(ro.mainAxisAlignment).toBe('center');
  });

  test('Row.end factory', () => {
    const row = Row.end([]);
    const ro = row.createRenderObject();
    expect(ro.mainAxisAlignment).toBe('end');
  });

  test('Row.spaceBetween factory', () => {
    const row = Row.spaceBetween([]);
    const ro = row.createRenderObject();
    expect(ro.mainAxisAlignment).toBe('spaceBetween');
  });

  test('Row.spaceAround factory', () => {
    const row = Row.spaceAround([]);
    const ro = row.createRenderObject();
    expect(ro.mainAxisAlignment).toBe('spaceAround');
  });

  test('Row.spaceEvenly factory', () => {
    const row = Row.spaceEvenly([]);
    const ro = row.createRenderObject();
    expect(ro.mainAxisAlignment).toBe('spaceEvenly');
  });

  test('Row with custom cross axis alignment', () => {
    const row = new Row({ crossAxisAlignment: 'stretch' });
    const ro = row.createRenderObject();
    expect(ro.crossAxisAlignment).toBe('stretch');
  });
});

// ---------------------------------------------------------------------------
// Column Widget Tests
// ---------------------------------------------------------------------------

describe('Column widget', () => {
  test('creates RenderFlex with vertical direction', () => {
    const col = new Column();
    const ro = col.createRenderObject();
    expect(ro).toBeInstanceOf(RenderFlex);
    expect(ro.direction).toBe('vertical');
  });

  test('defaults to start/center/max', () => {
    const col = new Column();
    const ro = col.createRenderObject();
    expect(ro.mainAxisAlignment).toBe('start');
    expect(ro.crossAxisAlignment).toBe('center');
    expect(ro.mainAxisSize).toBe('max');
  });

  test('Column.start factory', () => {
    const col = Column.start([]);
    const ro = col.createRenderObject();
    expect(ro.direction).toBe('vertical');
    expect(ro.mainAxisAlignment).toBe('start');
  });

  test('Column.center factory', () => {
    const col = Column.center([]);
    const ro = col.createRenderObject();
    expect(ro.mainAxisAlignment).toBe('center');
  });

  test('Column.end factory', () => {
    const col = Column.end([]);
    const ro = col.createRenderObject();
    expect(ro.mainAxisAlignment).toBe('end');
  });

  test('Column.spaceBetween factory', () => {
    const col = Column.spaceBetween([]);
    const ro = col.createRenderObject();
    expect(ro.mainAxisAlignment).toBe('spaceBetween');
  });

  test('Column.spaceAround factory', () => {
    const col = Column.spaceAround([]);
    const ro = col.createRenderObject();
    expect(ro.mainAxisAlignment).toBe('spaceAround');
  });

  test('Column.spaceEvenly factory', () => {
    const col = Column.spaceEvenly([]);
    const ro = col.createRenderObject();
    expect(ro.mainAxisAlignment).toBe('spaceEvenly');
  });
});

// ---------------------------------------------------------------------------
// ParentDataWidget Tests
// ---------------------------------------------------------------------------

describe('ParentDataWidget', () => {
  test('is abstract — subclasses must implement applyParentData', () => {
    // TypeScript enforces abstract at compile time. At runtime, we verify
    // that concrete subclasses work correctly.
    class ConcreteParentData extends ParentDataWidget {
      applied = false;
      applyParentData(_renderObject: RenderObject): void {
        this.applied = true;
      }
    }
    const child = new TestLeafWidget(10, 10);
    const widget = new ConcreteParentData({ child });
    expect(widget.child).toBe(child);
  });

  test('concrete subclass can apply parent data', () => {
    class TestParentDataWidget extends ParentDataWidget {
      applyParentData(renderObject: RenderObject): void {
        if (renderObject.parentData instanceof FlexParentData) {
          (renderObject.parentData as FlexParentData).flex = 42;
        }
      }
    }

    const child = new TestLeafWidget(10, 10);
    const pdWidget = new TestParentDataWidget({ child });
    expect(pdWidget.child).toBe(child);
  });

  test('createElement returns ParentDataElement', () => {
    class TestParentDataWidget2 extends ParentDataWidget {
      applyParentData(_renderObject: RenderObject): void {}
    }

    const child = new TestLeafWidget(10, 10);
    const pdWidget = new TestParentDataWidget2({ child });
    const elem = pdWidget.createElement();
    expect(elem).toBeInstanceOf(ParentDataElement);
  });
});

// ---------------------------------------------------------------------------
// Flexible Widget Tests
// ---------------------------------------------------------------------------

describe('Flexible widget', () => {
  test('creates with default flex=1 and fit=loose', () => {
    const child = new TestLeafWidget(10, 10);
    const flexible = new Flexible({ child });
    expect(flexible.flex).toBe(1);
    expect(flexible.fit).toBe('loose');
    expect(flexible.child).toBe(child);
  });

  test('creates with custom flex and fit', () => {
    const child = new TestLeafWidget(10, 10);
    const flexible = new Flexible({ child, flex: 3, fit: 'tight' });
    expect(flexible.flex).toBe(3);
    expect(flexible.fit).toBe('tight');
  });

  test('applyParentData sets flex and fit on FlexParentData', () => {
    const child = new TestLeafWidget(10, 10);
    const flexible = new Flexible({ child, flex: 5, fit: 'tight' });

    // Create a mock render object with FlexParentData
    const renderObj = new FixedSizeBox(10, 10);
    renderObj.parentData = new FlexParentData();

    flexible.applyParentData(renderObj);

    const pd = renderObj.parentData as FlexParentData;
    expect(pd.flex).toBe(5);
    expect(pd.fit).toBe('tight');
  });

  test('applyParentData does not crash on non-FlexParentData', () => {
    const child = new TestLeafWidget(10, 10);
    const flexible = new Flexible({ child, flex: 2 });

    const renderObj = new FixedSizeBox(10, 10);
    // parentData is default ParentData, not FlexParentData
    // Should not throw
    expect(() => flexible.applyParentData(renderObj)).not.toThrow();
  });

  test('createElement returns ParentDataElement', () => {
    const child = new TestLeafWidget(10, 10);
    const flexible = new Flexible({ child });
    const elem = flexible.createElement();
    expect(elem).toBeInstanceOf(ParentDataElement);
  });
});

// ---------------------------------------------------------------------------
// Expanded Widget Tests
// ---------------------------------------------------------------------------

describe('Expanded widget', () => {
  test('defaults to flex=1 and fit=tight', () => {
    const child = new TestLeafWidget(10, 10);
    const expanded = new Expanded({ child });
    expect(expanded.flex).toBe(1);
    expect(expanded.fit).toBe('tight');
  });

  test('custom flex, always tight fit', () => {
    const child = new TestLeafWidget(10, 10);
    const expanded = new Expanded({ child, flex: 3 });
    expect(expanded.flex).toBe(3);
    expect(expanded.fit).toBe('tight');
  });

  test('is an instance of Flexible', () => {
    const child = new TestLeafWidget(10, 10);
    const expanded = new Expanded({ child });
    expect(expanded).toBeInstanceOf(Flexible);
    expect(expanded).toBeInstanceOf(ParentDataWidget);
  });

  test('applyParentData sets fit=tight on FlexParentData', () => {
    const child = new TestLeafWidget(10, 10);
    const expanded = new Expanded({ child, flex: 2 });

    const renderObj = new FixedSizeBox(10, 10);
    renderObj.parentData = new FlexParentData();

    expanded.applyParentData(renderObj);

    const pd = renderObj.parentData as FlexParentData;
    expect(pd.flex).toBe(2);
    expect(pd.fit).toBe('tight');
  });
});

// ---------------------------------------------------------------------------
// Spacer Widget Tests
// ---------------------------------------------------------------------------

describe('Spacer widget', () => {
  test('is a StatelessWidget', () => {
    const spacer = new Spacer();
    expect(spacer).toBeInstanceOf(StatelessWidget);
  });

  test('default flex is 1', () => {
    const spacer = new Spacer();
    expect(spacer.flex).toBe(1);
  });

  test('custom flex', () => {
    const spacer = new Spacer({ flex: 3 });
    expect(spacer.flex).toBe(3);
  });

  test('build returns Expanded with SizedBox.shrink() child', () => {
    const spacer = new Spacer();
    const result = spacer.build({} as BuildContext);
    expect(result).toBeInstanceOf(Expanded);
    const expanded = result as Expanded;
    expect(expanded.flex).toBe(1);
    expect(expanded.fit).toBe('tight');
    expect(expanded.child).toBeInstanceOf(SizedBox);
    const sb = expanded.child as SizedBox;
    expect(sb.width).toBe(0);
    expect(sb.height).toBe(0);
  });

  test('build with custom flex returns Expanded with correct flex', () => {
    const spacer = new Spacer({ flex: 3 });
    const result = spacer.build({} as BuildContext);
    expect(result).toBeInstanceOf(Expanded);
    expect((result as Expanded).flex).toBe(3);
  });

  test('build with width returns SizedBox', () => {
    const spacer = new Spacer({ width: 10 });
    const result = spacer.build({} as BuildContext);
    expect(result).toBeInstanceOf(SizedBox);
    expect((result as SizedBox).width).toBe(10);
  });

  test('build with height returns SizedBox', () => {
    const spacer = new Spacer({ height: 5 });
    const result = spacer.build({} as BuildContext);
    expect(result).toBeInstanceOf(SizedBox);
    expect((result as SizedBox).height).toBe(5);
  });

  test('Spacer.horizontal creates fixed-width spacer', () => {
    const spacer = Spacer.horizontal(20);
    const result = spacer.build({} as BuildContext);
    expect(result).toBeInstanceOf(SizedBox);
    expect((result as SizedBox).width).toBe(20);
    expect((result as SizedBox).height).toBe(0);
  });

  test('Spacer.vertical creates fixed-height spacer', () => {
    const spacer = Spacer.vertical(10);
    const result = spacer.build({} as BuildContext);
    expect(result).toBeInstanceOf(SizedBox);
    expect((result as SizedBox).width).toBe(0);
    expect((result as SizedBox).height).toBe(10);
  });

  test('Spacer.flexible creates flex spacer', () => {
    const spacer = Spacer.flexible(2);
    expect(spacer.flex).toBe(2);
    const result = spacer.build({} as BuildContext);
    expect(result).toBeInstanceOf(Expanded);
    expect((result as Expanded).flex).toBe(2);
  });

  test('Spacer.flexible defaults to flex=1', () => {
    const spacer = Spacer.flexible();
    expect(spacer.flex).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Integration: RenderFlex direct layout with flex parent data
// ---------------------------------------------------------------------------

describe('Integration: flex layout with parent data', () => {
  test('Expanded applyParentData integrates with RenderFlex layout', () => {
    // Create a RenderFlex, add children, set parent data, and verify layout
    const flex = new RenderFlex({ direction: 'horizontal' });

    // Child 1: fixed size box (non-flex)
    const fixed = new FixedSizeBox(30, 10);
    flex.insert(fixed);

    // Child 2: greedy box that will expand
    const expandable = new GreedyBox();
    flex.insert(expandable);

    // Set flex parent data on the expandable child (simulates what Expanded does)
    const pd = expandable.parentData as FlexParentData;
    pd.flex = 1;
    pd.fit = 'tight';

    flex.layout(BoxConstraints.tight(new Size(100, 20)));

    // Fixed child keeps 30, expandable gets 70 (100 - 30)
    expect(fixed.size.width).toBe(30);
    expect(expandable.size.width).toBe(70);
  });

  test('Two Expanded children split space equally', () => {
    const flex = new RenderFlex({ direction: 'horizontal' });

    const box1 = new GreedyBox();
    const box2 = new GreedyBox();

    flex.insert(box1);
    flex.insert(box2);

    // Apply flex=1, fit=tight to both
    (box1.parentData as FlexParentData).flex = 1;
    (box1.parentData as FlexParentData).fit = 'tight';
    (box2.parentData as FlexParentData).flex = 1;
    (box2.parentData as FlexParentData).fit = 'tight';

    flex.layout(BoxConstraints.tight(new Size(80, 10)));

    expect(box1.size.width).toBe(40);
    expect(box2.size.width).toBe(40);
  });

  test('Flexible (loose) child can be smaller than allocated space', () => {
    const flex = new RenderFlex({ direction: 'horizontal' });

    const box1 = new FixedSizeBox(20, 10);
    flex.insert(box1);

    // Set it as loose flex
    (box1.parentData as FlexParentData).flex = 1;
    (box1.parentData as FlexParentData).fit = 'loose';

    flex.layout(BoxConstraints.tight(new Size(100, 20)));

    // Loose: 0..100 constraints, FixedSizeBox wants 20
    expect(box1.size.width).toBe(20);
  });

  test('Mixed Expanded and Flexible children', () => {
    const flex = new RenderFlex({ direction: 'horizontal' });

    const tight = new GreedyBox();
    const loose = new FixedSizeBox(15, 10);

    flex.insert(tight);
    flex.insert(loose);

    // tight: flex=2, fit=tight
    (tight.parentData as FlexParentData).flex = 2;
    (tight.parentData as FlexParentData).fit = 'tight';

    // loose: flex=1, fit=loose
    (loose.parentData as FlexParentData).flex = 1;
    (loose.parentData as FlexParentData).fit = 'loose';

    flex.layout(BoxConstraints.tight(new Size(90, 10)));

    // Total flex = 3, space per flex = 30
    // tight gets 60 (greedy takes all), loose gets 15 (wants 15, max 30)
    expect(tight.size.width).toBe(60);
    expect(loose.size.width).toBe(15);
  });

  test('Row with Expanded children distributes space correctly in vertical', () => {
    const flex = new RenderFlex({ direction: 'vertical' });

    const box1 = new GreedyBox();
    const box2 = new GreedyBox();
    const box3 = new GreedyBox();

    flex.insert(box1);
    flex.insert(box2);
    flex.insert(box3);

    // All flex=1, tight
    for (const box of [box1, box2, box3]) {
      (box.parentData as FlexParentData).flex = 1;
      (box.parentData as FlexParentData).fit = 'tight';
    }

    flex.layout(BoxConstraints.tight(new Size(60, 90)));

    // 90 / 3 = 30 each
    expect(box1.size.height).toBe(30);
    expect(box2.size.height).toBe(30);
    expect(box3.size.height).toBe(30);
  });

  test('Row widget creates correct render object and layout', () => {
    // Verify Row widget creates correct RenderFlex
    const row = new Row({
      mainAxisAlignment: 'spaceBetween',
      crossAxisAlignment: 'center',
    });

    const ro = row.createRenderObject();
    expect(ro.direction).toBe('horizontal');
    expect(ro.mainAxisAlignment).toBe('spaceBetween');
    expect(ro.crossAxisAlignment).toBe('center');

    // Verify layout works with children added directly to render object
    const c1 = new FixedSizeBox(10, 5);
    const c2 = new FixedSizeBox(10, 5);
    ro.insert(c1);
    ro.insert(c2);

    ro.layout(BoxConstraints.tight(new Size(100, 20)));

    // spaceBetween with 2 children: first at 0, second at end
    // remaining = 100 - 20 = 80, betweenSpace = 80
    expect(c1.offset.col).toBe(0);
    expect(c2.offset.col).toBe(90);
  });

  test('Column widget creates correct render object and layout', () => {
    const col = new Column({
      mainAxisAlignment: 'center',
    });

    const ro = col.createRenderObject();
    expect(ro.direction).toBe('vertical');
    expect(ro.mainAxisAlignment).toBe('center');

    const c1 = new FixedSizeBox(30, 10);
    ro.insert(c1);

    ro.layout(BoxConstraints.tight(new Size(80, 40)));

    // center: leading = (40 - 10) / 2 = 15
    expect(c1.offset.row).toBe(15);
  });
});
