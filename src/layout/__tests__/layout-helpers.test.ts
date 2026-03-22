// Tests for MINR-06: estimateIntrinsicWidth layout helper
import { describe, test, expect } from 'bun:test';
import { estimateIntrinsicWidth } from '../layout-helpers';
import { Text } from '../../widgets/text';
import { SizedBox } from '../../widgets/sized-box';
import { Container } from '../../widgets/container';
import { Padding } from '../../widgets/padding';
import { Row, Column } from '../../widgets/flex';
import { TextSpan } from '../../core/text-span';
import { EdgeInsets } from '../edge-insets';
import { Widget, StatelessWidget, BuildContext } from '../../framework/widget';

// A simple StatelessWidget for testing that we return 0
class DummyStateless extends StatelessWidget {
  build(_context: BuildContext): Widget {
    return SizedBox.shrink();
  }
}

describe('MINR-06: estimateIntrinsicWidth', () => {
  test('returns 0 for unknown widget types', () => {
    const widget = SizedBox.shrink();
    // SizedBox.shrink has width=0, so should return 0
    expect(estimateIntrinsicWidth(widget)).toBe(0);
  });

  test('computes width from Text widget TextSpan', () => {
    const text = new Text({
      text: new TextSpan({ text: 'Hello' }),
    });
    expect(estimateIntrinsicWidth(text)).toBe(5);
  });

  test('computes width from Text widget with CJK characters', () => {
    // CJK characters are typically 2 columns wide
    const text = new Text({
      text: new TextSpan({ text: 'AB' }),
    });
    // Simple ASCII: 2 columns
    expect(estimateIntrinsicWidth(text)).toBe(2);
  });

  test('returns SizedBox width when set', () => {
    const box = new SizedBox({ width: 10, height: 5 });
    expect(estimateIntrinsicWidth(box)).toBe(10);
  });

  test('SizedBox without width recurses into child', () => {
    const child = new Text({ text: new TextSpan({ text: 'Test' }) });
    const box = new SizedBox({ height: 5, child });
    expect(estimateIntrinsicWidth(box)).toBe(4); // "Test" = 4 chars
  });

  test('SizedBox with Infinity width returns 0 (not finite)', () => {
    const box = SizedBox.expand();
    expect(estimateIntrinsicWidth(box)).toBe(0);
  });

  test('Container with explicit width returns width + padding', () => {
    const container = new Container({
      width: 20,
      padding: EdgeInsets.symmetric({ horizontal: 2 }),
    });
    // width (20) + horizontal padding (2 left + 2 right = 4)
    expect(estimateIntrinsicWidth(container)).toBe(24);
  });

  test('Container without width estimates from child + padding', () => {
    const child = new Text({ text: new TextSpan({ text: 'Hello World' }) });
    const container = new Container({
      child,
      padding: EdgeInsets.all(1),
    });
    // "Hello World" = 11 chars, padding horizontal = 1 left + 1 right = 2
    expect(estimateIntrinsicWidth(container)).toBe(13);
  });

  test('Container without child or width returns padding only', () => {
    const container = new Container({
      padding: EdgeInsets.symmetric({ horizontal: 3 }),
    });
    // 0 child width + 3 left + 3 right = 6
    expect(estimateIntrinsicWidth(container)).toBe(6);
  });

  test('Padding adds horizontal insets to child width', () => {
    const child = new Text({ text: new TextSpan({ text: 'Hi' }) });
    const padded = new Padding({
      padding: EdgeInsets.only({ left: 3, right: 5 }),
      child,
    });
    // "Hi" = 2 chars + 3 left + 5 right = 10
    expect(estimateIntrinsicWidth(padded)).toBe(10);
  });

  test('Padding without child returns just padding', () => {
    const padded = new Padding({
      padding: EdgeInsets.symmetric({ horizontal: 4 }),
    });
    // 0 child width + 4 left + 4 right = 8
    expect(estimateIntrinsicWidth(padded)).toBe(8);
  });

  test('Row sums children widths', () => {
    const row = new Row({
      children: [
        new Text({ text: new TextSpan({ text: 'A' }) }),
        new Text({ text: new TextSpan({ text: 'BB' }) }),
        new Text({ text: new TextSpan({ text: 'CCC' }) }),
      ],
    });
    // 1 + 2 + 3 = 6
    expect(estimateIntrinsicWidth(row)).toBe(6);
  });

  test('Row with no children returns 0', () => {
    const row = new Row({ children: [] });
    expect(estimateIntrinsicWidth(row)).toBe(0);
  });

  test('Column returns max of children widths', () => {
    const col = new Column({
      children: [
        new Text({ text: new TextSpan({ text: 'Short' }) }),
        new Text({ text: new TextSpan({ text: 'A longer string' }) }),
        new Text({ text: new TextSpan({ text: 'Medium' }) }),
      ],
    });
    // max(5, 15, 6) = 15
    expect(estimateIntrinsicWidth(col)).toBe(15);
  });

  test('Column with no children returns 0', () => {
    const col = new Column({ children: [] });
    expect(estimateIntrinsicWidth(col)).toBe(0);
  });

  test('returns 0 for StatelessWidget (cannot inspect build output)', () => {
    const widget = new DummyStateless();
    expect(estimateIntrinsicWidth(widget)).toBe(0);
  });

  test('handles nested widget trees', () => {
    // Row containing Padding containing Text
    const row = new Row({
      children: [
        new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: new Text({ text: new TextSpan({ text: 'A' }) }),
        }),
        new SizedBox({ width: 5 }),
      ],
    });
    // Padding child: 1 + 1 left + 1 right = 3
    // SizedBox: 5
    // Row sum: 3 + 5 = 8
    expect(estimateIntrinsicWidth(row)).toBe(8);
  });

  test('handles Column inside Row', () => {
    const row = new Row({
      children: [
        new Column({
          children: [
            new Text({ text: new TextSpan({ text: 'Short' }) }),
            new Text({ text: new TextSpan({ text: 'LongerText' }) }),
          ],
        }),
        new Text({ text: new TextSpan({ text: '!' }) }),
      ],
    });
    // Column: max(5, 10) = 10
    // Text: 1
    // Row sum: 10 + 1 = 11
    expect(estimateIntrinsicWidth(row)).toBe(11);
  });
});
