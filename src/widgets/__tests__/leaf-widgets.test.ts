// Tests for leaf and single-child widgets
// Covers: Text, DefaultTextStyle, Container, SizedBox, Padding, Center, DecoratedBox

import { describe, it, expect } from 'bun:test';
import { TextStyle } from '../../core/text-style';
import { TextSpan } from '../../core/text-span';
import { Offset, Size } from '../../core/types';
import { BoxConstraints } from '../../core/box-constraints';
import { EdgeInsets } from '../../layout/edge-insets';
import { RenderPadding } from '../../layout/render-padded';
import { RenderConstrainedBox } from '../../layout/render-constrained';
import { RenderDecoratedBox, BoxDecoration, Border, BorderSide } from '../../layout/render-decorated';
import { Color } from '../../core/color';
import { Text, RenderText } from '../text';
import { DefaultTextStyle } from '../default-text-style';
import { Container } from '../container';
import { SizedBox } from '../sized-box';
import { Padding } from '../padding';
import { Center, RenderCenter } from '../center';
import { DecoratedBox } from '../decorated-box';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Simple PaintContext that records drawChar calls for assertion.
 */
class TestPaintContext {
  chars: { col: number; row: number; char: string; style?: TextStyle }[] = [];

  drawChar(col: number, row: number, char: string, style?: TextStyle): void {
    this.chars.push({ col, row, char, style });
  }

  drawText(col: number, row: number, text: string, style?: TextStyle): void {
    for (const ch of text) {
      this.drawChar(col, row, ch, style);
      col++;
    }
  }

  /** Get all characters on a given row as a string. */
  getRow(row: number): string {
    return this.chars
      .filter((c) => c.row === row)
      .sort((a, b) => a.col - b.col)
      .map((c) => c.char)
      .join('');
  }

  /** Get all characters on a given row with their column positions. */
  getRowEntries(row: number): { col: number; char: string }[] {
    return this.chars
      .filter((c) => c.row === row)
      .sort((a, b) => a.col - b.col)
      .map(({ col, char }) => ({ col, char }));
  }
}

// ---------------------------------------------------------------------------
// Text widget tests
// ---------------------------------------------------------------------------

describe('Text widget', () => {
  it('creates a LeafRenderObjectWidget', () => {
    const text = new Text({ text: new TextSpan({ text: 'hello' }) });
    expect(text).toBeDefined();
    expect(text.text).toBeInstanceOf(TextSpan);
    expect(text.textAlign).toBe('left');
    expect(text.overflow).toBe('clip');
  });

  it('createElement returns a LeafRenderObjectElement', () => {
    const text = new Text({ text: new TextSpan({ text: 'hello' }) });
    const element = text.createElement();
    expect(element).toBeDefined();
    expect(element.constructor.name).toBe('LeafRenderObjectElement');
  });

  it('createRenderObject returns RenderText', () => {
    const text = new Text({ text: new TextSpan({ text: 'hello' }) });
    const ro = text.createRenderObject();
    expect(ro).toBeInstanceOf(RenderText);
  });

  it('updateRenderObject updates properties', () => {
    const text1 = new Text({ text: new TextSpan({ text: 'hello' }), textAlign: 'left' });
    const ro = text1.createRenderObject();

    const text2 = new Text({ text: new TextSpan({ text: 'world' }), textAlign: 'center' });
    text2.updateRenderObject(ro);

    expect(ro.text.toPlainText()).toBe('world');
    expect(ro.textAlign).toBe('center');
  });
});

describe('RenderText', () => {
  it('computes correct size for simple text', () => {
    const rt = new RenderText({ text: new TextSpan({ text: 'hello' }) });
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));
    expect(rt.size.width).toBe(5);
    expect(rt.size.height).toBe(1);
  });

  it('computes correct size for multi-line text', () => {
    const rt = new RenderText({ text: new TextSpan({ text: 'hello\nworld\nfoo' }) });
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));
    expect(rt.size.width).toBe(5);
    expect(rt.size.height).toBe(3);
  });

  it('computes correct width for CJK characters', () => {
    // Chinese characters are width 2
    const rt = new RenderText({ text: new TextSpan({ text: '\u4F60\u597D' }) }); // 你好
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));
    expect(rt.size.width).toBe(4); // 2 chars * 2 width each
    expect(rt.size.height).toBe(1);
  });

  it('computes correct width for mixed ASCII + CJK', () => {
    const rt = new RenderText({ text: new TextSpan({ text: 'hi\u4F60' }) }); // hi你
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));
    expect(rt.size.width).toBe(4); // 'h'=1, 'i'=1, '你'=2
    expect(rt.size.height).toBe(1);
  });

  it('constrains size to parent constraints', () => {
    const rt = new RenderText({ text: new TextSpan({ text: 'a long line of text here' }) });
    rt.layout(new BoxConstraints({ maxWidth: 10, maxHeight: 5 }));
    expect(rt.size.width).toBe(10); // constrained to maxWidth
    expect(rt.size.height).toBe(1);
  });

  it('paints text content correctly', () => {
    const rt = new RenderText({ text: new TextSpan({ text: 'abc' }) });
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    const ctx = new TestPaintContext();
    rt.paint(ctx as any, Offset.zero);

    expect(ctx.getRow(0)).toBe('abc');
  });

  it('paints multi-line text', () => {
    const rt = new RenderText({ text: new TextSpan({ text: 'ab\ncd' }) });
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    const ctx = new TestPaintContext();
    rt.paint(ctx as any, Offset.zero);

    expect(ctx.getRow(0)).toBe('ab');
    expect(ctx.getRow(1)).toBe('cd');
  });

  it('applies text offset when painting', () => {
    const rt = new RenderText({ text: new TextSpan({ text: 'hi' }) });
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    const ctx = new TestPaintContext();
    rt.paint(ctx as any, new Offset(5, 3));

    const entries = ctx.getRowEntries(3);
    expect(entries.length).toBe(2);
    expect(entries[0]!.col).toBe(5);
    expect(entries[0]!.char).toBe('h');
    expect(entries[1]!.col).toBe(6);
    expect(entries[1]!.char).toBe('i');
  });

  it('handles textAlign center', () => {
    const rt = new RenderText({
      text: new TextSpan({ text: 'hi' }),
      textAlign: 'center',
    });
    // Force wider constraints to see centering effect
    rt.layout(new BoxConstraints({ minWidth: 10, maxWidth: 10, maxHeight: 24 }));

    const ctx = new TestPaintContext();
    rt.paint(ctx as any, Offset.zero);

    // 'hi' is 2 chars wide, container is 10, left offset = floor((10-2)/2) = 4
    const entries = ctx.getRowEntries(0);
    expect(entries.length).toBe(2);
    expect(entries[0]!.col).toBe(4);
    expect(entries[0]!.char).toBe('h');
  });

  it('handles textAlign right', () => {
    const rt = new RenderText({
      text: new TextSpan({ text: 'hi' }),
      textAlign: 'right',
    });
    rt.layout(new BoxConstraints({ minWidth: 10, maxWidth: 10, maxHeight: 24 }));

    const ctx = new TestPaintContext();
    rt.paint(ctx as any, Offset.zero);

    // 'hi' is 2 chars wide, container is 10, left offset = 10-2 = 8
    const entries = ctx.getRowEntries(0);
    expect(entries.length).toBe(2);
    expect(entries[0]!.col).toBe(8);
    expect(entries[0]!.char).toBe('h');
  });

  it('handles maxLines truncation', () => {
    const rt = new RenderText({
      text: new TextSpan({ text: 'line1\nline2\nline3' }),
      maxLines: 2,
    });
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    expect(rt.size.height).toBe(2);

    const ctx = new TestPaintContext();
    rt.paint(ctx as any, Offset.zero);

    expect(ctx.getRow(0)).toBe('line1');
    expect(ctx.getRow(1)).toBe('line2');
    // line3 should not be painted
    expect(ctx.chars.filter((c) => c.row === 2).length).toBe(0);
  });

  it('handles overflow ellipsis with maxLines', () => {
    const rt = new RenderText({
      text: new TextSpan({ text: 'first line\nsecond line\nthird line' }),
      maxLines: 2,
      overflow: 'ellipsis',
    });
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    const ctx = new TestPaintContext();
    rt.paint(ctx as any, Offset.zero);

    // First line should be normal
    expect(ctx.getRow(0)).toBe('first line');
    // Second line should end with '...' since there are more lines
    const row1 = ctx.getRow(1);
    expect(row1.endsWith('...')).toBe(true);
  });

  it('handles overflow ellipsis with width truncation', () => {
    const rt = new RenderText({
      text: new TextSpan({ text: 'a long line that exceeds width' }),
      overflow: 'ellipsis',
    });
    rt.layout(new BoxConstraints({ maxWidth: 10, maxHeight: 24 }));

    const ctx = new TestPaintContext();
    rt.paint(ctx as any, Offset.zero);

    const row = ctx.getRow(0);
    expect(row.endsWith('...')).toBe(true);
    expect(row.length).toBeLessThanOrEqual(10);
  });

  it('paints styled text spans', () => {
    const boldStyle = new TextStyle({ bold: true });
    const rt = new RenderText({
      text: new TextSpan({
        children: [
          new TextSpan({ text: 'A', style: boldStyle }),
          new TextSpan({ text: 'B' }),
        ],
      }),
    });
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    const ctx = new TestPaintContext();
    rt.paint(ctx as any, Offset.zero);

    expect(ctx.chars.length).toBe(2);
    expect(ctx.chars[0]!.char).toBe('A');
    expect(ctx.chars[0]!.style?.bold).toBe(true);
    expect(ctx.chars[1]!.char).toBe('B');
  });

  it('handles empty text', () => {
    const rt = new RenderText({ text: new TextSpan({ text: '' }) });
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));
    expect(rt.size.width).toBe(0);
    expect(rt.size.height).toBe(1); // one empty line
  });
});

// ---------------------------------------------------------------------------
// DefaultTextStyle tests
// ---------------------------------------------------------------------------

describe('DefaultTextStyle', () => {
  it('creates an InheritedWidget', () => {
    const child = new Text({ text: new TextSpan({ text: 'hi' }) });
    const dts = new DefaultTextStyle({
      style: new TextStyle({ bold: true }),
      child,
    });
    expect(dts).toBeDefined();
    expect(dts.style.bold).toBe(true);
    expect(dts.child).toBe(child);
  });

  it('updateShouldNotify returns true when style changes', () => {
    const child = new Text({ text: new TextSpan({ text: 'hi' }) });
    const old = new DefaultTextStyle({
      style: new TextStyle({ bold: true }),
      child,
    });
    const newWidget = new DefaultTextStyle({
      style: new TextStyle({ bold: false }),
      child,
    });
    expect(newWidget.updateShouldNotify(old)).toBe(true);
  });

  it('updateShouldNotify returns false when style is the same', () => {
    const child = new Text({ text: new TextSpan({ text: 'hi' }) });
    const old = new DefaultTextStyle({
      style: new TextStyle({ bold: true }),
      child,
    });
    const newWidget = new DefaultTextStyle({
      style: new TextStyle({ bold: true }),
      child,
    });
    expect(newWidget.updateShouldNotify(old)).toBe(false);
  });

  it('of returns empty TextStyle when no ancestor found', () => {
    // Create a minimal context that returns null for lookup
    const mockContext = {
      widget: {} as any,
      mounted: true,
      dependOnInheritedWidgetOfExactType: () => null,
    };
    const style = DefaultTextStyle.of(mockContext as any);
    expect(style).toBeInstanceOf(TextStyle);
    expect(style.isEmpty).toBe(true);
  });

  it('maybeOf returns undefined when no ancestor found', () => {
    const mockContext = {
      widget: {} as any,
      mounted: true,
      dependOnInheritedWidgetOfExactType: () => null,
    };
    const style = DefaultTextStyle.maybeOf(mockContext as any);
    expect(style).toBeUndefined();
  });

  it('cascades style through element tree', () => {
    const boldStyle = new TextStyle({ bold: true });
    const child = new Text({ text: new TextSpan({ text: 'hi' }) });
    const dts = new DefaultTextStyle({
      style: boldStyle,
      child,
    });

    // Mount the inherited element
    const element = dts.createElement();
    element.mount();

    // Verify the inherited element has the child
    expect(element.child).toBeDefined();

    // Simulate context lookup: create a mock context that finds the DefaultTextStyle
    const mockContext = {
      widget: {} as any,
      mounted: true,
      dependOnInheritedWidgetOfExactType: (widgetType: Function) => {
        if (widgetType === DefaultTextStyle) {
          return element;
        }
        return null;
      },
    };

    const resolved = DefaultTextStyle.of(mockContext as any);
    expect(resolved.bold).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SizedBox tests
// ---------------------------------------------------------------------------

describe('SizedBox', () => {
  it('creates render object with tight constraints', () => {
    const sb = new SizedBox({ width: 10, height: 5 });
    const ro = sb.createRenderObject() as RenderConstrainedBox;
    expect(ro).toBeInstanceOf(RenderConstrainedBox);
    expect(ro.additionalConstraints.minWidth).toBe(10);
    expect(ro.additionalConstraints.maxWidth).toBe(10);
    expect(ro.additionalConstraints.minHeight).toBe(5);
    expect(ro.additionalConstraints.maxHeight).toBe(5);
  });

  it('applies width and height constraints during layout', () => {
    const sb = new SizedBox({ width: 10, height: 5 });
    const ro = sb.createRenderObject() as RenderConstrainedBox;

    ro.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));
    expect(ro.size.width).toBe(10);
    expect(ro.size.height).toBe(5);
  });

  it('only sets width when height is not specified', () => {
    const sb = new SizedBox({ width: 10 });
    const ro = sb.createRenderObject() as RenderConstrainedBox;
    expect(ro.additionalConstraints.minWidth).toBe(10);
    expect(ro.additionalConstraints.maxWidth).toBe(10);
    expect(ro.additionalConstraints.minHeight).toBe(0);
    expect(ro.additionalConstraints.maxHeight).toBe(Infinity);
  });

  it('updateRenderObject updates constraints', () => {
    const sb1 = new SizedBox({ width: 10, height: 5 });
    const ro = sb1.createRenderObject() as RenderConstrainedBox;

    const sb2 = new SizedBox({ width: 20, height: 15 });
    sb2.updateRenderObject(ro);

    expect(ro.additionalConstraints.minWidth).toBe(20);
    expect(ro.additionalConstraints.maxWidth).toBe(20);
    expect(ro.additionalConstraints.minHeight).toBe(15);
    expect(ro.additionalConstraints.maxHeight).toBe(15);
  });

  it('createElement returns SingleChildRenderObjectElement', () => {
    const sb = new SizedBox({ width: 10, height: 5 });
    const element = sb.createElement();
    expect(element.constructor.name).toBe('SingleChildRenderObjectElement');
  });

  describe('static factories', () => {
    it('SizedBox.expand creates expanding box', () => {
      const sb = SizedBox.expand();
      expect(sb.width).toBe(Infinity);
      expect(sb.height).toBe(Infinity);

      const ro = sb.createRenderObject() as RenderConstrainedBox;
      // Expanding: layout with bounded constraints, should fill
      ro.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));
      expect(ro.size.width).toBe(80);
      expect(ro.size.height).toBe(24);
    });

    it('SizedBox.shrink creates zero-sized box', () => {
      const sb = SizedBox.shrink();
      expect(sb.width).toBe(0);
      expect(sb.height).toBe(0);

      const ro = sb.createRenderObject() as RenderConstrainedBox;
      ro.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));
      expect(ro.size.width).toBe(0);
      expect(ro.size.height).toBe(0);
    });

    it('SizedBox.fromSize creates box with exact size', () => {
      const sb = SizedBox.fromSize(30, 10);
      expect(sb.width).toBe(30);
      expect(sb.height).toBe(10);
    });

    it('SizedBox.fixedHeight sets only height', () => {
      const sb = SizedBox.fixedHeight(10);
      expect(sb.width).toBeUndefined();
      expect(sb.height).toBe(10);
    });

    it('SizedBox.fixedWidth sets only width', () => {
      const sb = SizedBox.fixedWidth(20);
      expect(sb.width).toBe(20);
      expect(sb.height).toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// Padding tests
// ---------------------------------------------------------------------------

describe('Padding', () => {
  it('creates render object with correct padding', () => {
    const pw = new Padding({ padding: EdgeInsets.all(2) });
    const ro = pw.createRenderObject() as RenderPadding;
    expect(ro).toBeInstanceOf(RenderPadding);
    expect(ro.padding.left).toBe(2);
    expect(ro.padding.top).toBe(2);
    expect(ro.padding.right).toBe(2);
    expect(ro.padding.bottom).toBe(2);
  });

  it('deflates constraints during layout', () => {
    const pw = new Padding({ padding: EdgeInsets.all(2) });
    const ro = pw.createRenderObject() as RenderPadding;

    // Layout with tight 10x10 constraints, padding takes 2 on each side
    ro.layout(new BoxConstraints({ minWidth: 10, maxWidth: 10, minHeight: 10, maxHeight: 10 }));
    // With no child, size = padding amount constrained = max(4, 10) = 10
    expect(ro.size.width).toBe(10);
    expect(ro.size.height).toBe(10);
  });

  it('deflates constraints correctly with child', () => {
    const pw = new Padding({ padding: EdgeInsets.all(2) });
    const ro = pw.createRenderObject() as RenderPadding;

    // Create a simple child that sizes to constraints
    const child = new RenderConstrainedBox({
      additionalConstraints: BoxConstraints.tightFor({ width: 6, height: 6 }),
    });
    ro.child = child;

    ro.layout(new BoxConstraints({ maxWidth: 20, maxHeight: 20 }));

    // Child should be 6x6, self should be 6+4 = 10, 6+4 = 10
    expect(child.size.width).toBe(6);
    expect(child.size.height).toBe(6);
    expect(ro.size.width).toBe(10);
    expect(ro.size.height).toBe(10);
  });

  it('sets child offset to padding origin', () => {
    const pw = new Padding({
      padding: new EdgeInsets(3, 1, 3, 1),
    });
    const ro = pw.createRenderObject() as RenderPadding;

    const child = new RenderConstrainedBox({
      additionalConstraints: BoxConstraints.tightFor({ width: 4, height: 4 }),
    });
    ro.child = child;

    ro.layout(new BoxConstraints({ maxWidth: 20, maxHeight: 20 }));

    expect(child.offset.col).toBe(3);
    expect(child.offset.row).toBe(1);
  });

  it('updateRenderObject updates padding', () => {
    const pw1 = new Padding({ padding: EdgeInsets.all(1) });
    const ro = pw1.createRenderObject() as RenderPadding;

    const pw2 = new Padding({ padding: EdgeInsets.all(5) });
    pw2.updateRenderObject(ro);

    expect(ro.padding.left).toBe(5);
  });

  it('createElement returns SingleChildRenderObjectElement', () => {
    const pw = new Padding({ padding: EdgeInsets.all(1) });
    const element = pw.createElement();
    expect(element.constructor.name).toBe('SingleChildRenderObjectElement');
  });
});

// ---------------------------------------------------------------------------
// Center tests
// ---------------------------------------------------------------------------

describe('Center', () => {
  it('creates a RenderCenter render object', () => {
    const cw = new Center();
    const ro = cw.createRenderObject();
    expect(ro).toBeInstanceOf(RenderCenter);
  });

  it('positions child in the middle with bounded constraints', () => {
    const cw = new Center();
    const rc = cw.createRenderObject() as RenderCenter;

    const child = new RenderConstrainedBox({
      additionalConstraints: BoxConstraints.tightFor({ width: 4, height: 2 }),
    });
    rc.child = child;

    rc.layout(new BoxConstraints({ maxWidth: 20, maxHeight: 10 }));

    // Self should expand to fill available space (20x10)
    expect(rc.size.width).toBe(20);
    expect(rc.size.height).toBe(10);

    // Child should be centered: floor((20-4)/2) = 8, floor((10-2)/2) = 4
    expect(child.offset.col).toBe(8);
    expect(child.offset.row).toBe(4);
  });

  it('positions child correctly with odd dimensions', () => {
    const rc = new RenderCenter();

    const child = new RenderConstrainedBox({
      additionalConstraints: BoxConstraints.tightFor({ width: 3, height: 3 }),
    });
    rc.child = child;

    rc.layout(new BoxConstraints({ maxWidth: 10, maxHeight: 10 }));

    // floor((10-3)/2) = 3
    expect(child.offset.col).toBe(3);
    expect(child.offset.row).toBe(3);
  });

  it('respects widthFactor', () => {
    const cw = new Center({ widthFactor: 2 });
    const rc = cw.createRenderObject() as RenderCenter;

    const child = new RenderConstrainedBox({
      additionalConstraints: BoxConstraints.tightFor({ width: 5, height: 3 }),
    });
    rc.child = child;

    rc.layout(new BoxConstraints({ maxWidth: 40, maxHeight: 20 }));

    // Width should be child.width * widthFactor = 5*2 = 10
    expect(rc.size.width).toBe(10);
    // Height should be maxHeight since no heightFactor and bounded
    expect(rc.size.height).toBe(20);

    // Child centered: floor((10-5)/2) = 2
    expect(child.offset.col).toBe(2);
  });

  it('respects heightFactor', () => {
    const cw = new Center({ heightFactor: 3 });
    const rc = cw.createRenderObject() as RenderCenter;

    const child = new RenderConstrainedBox({
      additionalConstraints: BoxConstraints.tightFor({ width: 4, height: 2 }),
    });
    rc.child = child;

    rc.layout(new BoxConstraints({ maxWidth: 20, maxHeight: 30 }));

    // Width should be maxWidth since no widthFactor and bounded
    expect(rc.size.width).toBe(20);
    // Height should be child.height * heightFactor = 2*3 = 6
    expect(rc.size.height).toBe(6);

    // Child centered vertically: floor((6-2)/2) = 2
    expect(child.offset.row).toBe(2);
  });

  it('handles no child - bounded constraints', () => {
    const rc = new RenderCenter();
    rc.layout(new BoxConstraints({ maxWidth: 20, maxHeight: 10 }));
    expect(rc.size.width).toBe(20);
    expect(rc.size.height).toBe(10);
  });

  it('handles no child - unbounded constraints', () => {
    const rc = new RenderCenter();
    rc.layout(new BoxConstraints()); // unbounded
    expect(rc.size.width).toBe(0);
    expect(rc.size.height).toBe(0);
  });

  it('paints child at correct offset', () => {
    const rc = new RenderCenter();

    // Create a simple child: RenderText for simplicity
    const childRender = new RenderText({ text: new TextSpan({ text: 'X' }) });
    rc.child = childRender;

    rc.layout(new BoxConstraints({ maxWidth: 10, maxHeight: 10 }));

    const ctx = new TestPaintContext();
    rc.paint(ctx as any, Offset.zero);

    // 'X' is 1 char wide, 1 line tall, centered in 10x10
    // offset = floor((10-1)/2) = 4
    expect(ctx.chars.length).toBe(1);
    expect(ctx.chars[0]!.col).toBe(4);
    expect(ctx.chars[0]!.row).toBe(4);
    expect(ctx.chars[0]!.char).toBe('X');
  });

  it('updateRenderObject updates factors', () => {
    const cw1 = new Center({ widthFactor: 1 });
    const ro = cw1.createRenderObject() as RenderCenter;

    const cw2 = new Center({ widthFactor: 3, heightFactor: 2 });
    cw2.updateRenderObject(ro);

    expect(ro.widthFactor).toBe(3);
    expect(ro.heightFactor).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// DecoratedBox tests
// ---------------------------------------------------------------------------

describe('DecoratedBox', () => {
  it('creates render object with decoration', () => {
    const dec = new BoxDecoration({ color: Color.blue });
    const db = new DecoratedBox({ decoration: dec });
    const ro = db.createRenderObject() as RenderDecoratedBox;
    expect(ro).toBeInstanceOf(RenderDecoratedBox);
    expect(ro.decoration.color?.equals(Color.blue)).toBe(true);
  });

  it('updateRenderObject updates decoration', () => {
    const dec1 = new BoxDecoration({ color: Color.blue });
    const db1 = new DecoratedBox({ decoration: dec1 });
    const ro = db1.createRenderObject() as RenderDecoratedBox;

    const dec2 = new BoxDecoration({ color: Color.red });
    const db2 = new DecoratedBox({ decoration: dec2 });
    db2.updateRenderObject(ro);

    expect(ro.decoration.color?.equals(Color.red)).toBe(true);
  });

  it('createElement returns SingleChildRenderObjectElement', () => {
    const dec = new BoxDecoration();
    const db = new DecoratedBox({ decoration: dec });
    const element = db.createElement();
    expect(element.constructor.name).toBe('SingleChildRenderObjectElement');
  });
});

// ---------------------------------------------------------------------------
// Container tests
// ---------------------------------------------------------------------------

describe('Container', () => {
  it('is a StatelessWidget', () => {
    const c = new Container();
    expect(c).toBeDefined();
  });

  it('builds to SizedBox.shrink when no properties set', () => {
    const c = new Container();
    const mockCtx = { widget: c, mounted: true } as any;
    const built = c.build(mockCtx);
    expect(built).toBeInstanceOf(SizedBox);
    // Should be a shrink box (0x0)
    const sb = built as SizedBox;
    expect(sb.width).toBe(0);
    expect(sb.height).toBe(0);
  });

  it('composes SizedBox when width/height specified', () => {
    const c = new Container({ width: 10, height: 5 });
    const mockCtx = { widget: c, mounted: true } as any;
    const built = c.build(mockCtx);
    expect(built).toBeInstanceOf(SizedBox);
    const sb = built as SizedBox;
    expect(sb.width).toBe(10);
    expect(sb.height).toBe(5);
  });

  it('composes Padding when padding specified', () => {
    const c = new Container({
      padding: EdgeInsets.all(2),
      child: new Text({ text: new TextSpan({ text: 'test' }) }),
    });
    const mockCtx = { widget: c, mounted: true } as any;
    const built = c.build(mockCtx);
    // Should be Padding wrapping Text
    expect(built).toBeInstanceOf(Padding);
    const pw = built as Padding;
    expect(pw.padding.left).toBe(2);
  });

  it('composes padding + sizing + decoration', () => {
    const c = new Container({
      width: 20,
      height: 10,
      padding: EdgeInsets.all(1),
      decoration: new BoxDecoration({ color: Color.blue }),
      child: new Text({ text: new TextSpan({ text: 'test' }) }),
    });
    const mockCtx = { widget: c, mounted: true } as any;
    const built = c.build(mockCtx);

    // Outermost should be SizedBox (width/height)
    expect(built).toBeInstanceOf(SizedBox);
    const sb = built as SizedBox;
    expect(sb.width).toBe(20);
    expect(sb.height).toBe(10);

    // Its child should be DecoratedBox
    expect(sb.child).toBeInstanceOf(DecoratedBox);
    const db = sb.child as DecoratedBox;

    // DecoratedBox's child should be Padding
    expect(db.child).toBeInstanceOf(Padding);
    const pw = db.child as Padding;
    expect(pw.padding.left).toBe(1);

    // Padding's child should be Text
    expect(pw.child).toBeInstanceOf(Text);
  });

  it('composes margin as outermost Padding', () => {
    const c = new Container({
      margin: EdgeInsets.all(3),
      width: 10,
      height: 5,
    });
    const mockCtx = { widget: c, mounted: true } as any;
    const built = c.build(mockCtx);

    // Outermost should be Padding (margin)
    expect(built).toBeInstanceOf(Padding);
    const marginPad = built as Padding;
    expect(marginPad.padding.left).toBe(3);

    // Its child should be SizedBox
    expect(marginPad.child).toBeInstanceOf(SizedBox);
  });
});
