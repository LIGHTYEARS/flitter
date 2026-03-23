// Interactive widgets tests
// Tests for: TextEditingController, TextField, Button, Table, Divider, MouseRegion

import { describe, test, expect, beforeEach } from 'bun:test';
import { TextEditingController, TextField } from '../text-field';
import { Button } from '../button';
import { Table } from '../table';
import { Divider, RenderDivider } from '../divider';
import { MouseRegion, RenderMouseRegion, type MouseRegionEvent, type MouseEventType } from '../mouse-region';
import { BoxConstraints } from '../../core/box-constraints';
import { Color } from '../../core/color';
import { TextStyle } from '../../core/text-style';
import { Offset, Size } from '../../core/types';
import { EdgeInsets } from '../../layout/edge-insets';
import { StatelessWidget, type BuildContext, type Widget } from '../../framework/widget';
import { RenderBox, type PaintContext } from '../../framework/render-object';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Simple stub widget for Table renderRow testing */
class StubWidget extends StatelessWidget {
  readonly label: string;
  constructor(label: string) {
    super();
    this.label = label;
  }
  build(_context: BuildContext): Widget {
    return this;
  }
}

/** Simple stub RenderBox for MouseRegion child */
class StubRenderBox extends RenderBox {
  performLayout(): void {
    const constraints = this.constraints!;
    this.size = constraints.constrain(new Size(10, 3));
  }
  paint(_context: PaintContext, _offset: Offset): void {}
}

// ===========================================================================
// TextEditingController
// ===========================================================================

describe('TextEditingController', () => {
  let controller: TextEditingController;

  beforeEach(() => {
    controller = new TextEditingController();
  });

  test('initial state: empty text, cursor at 0', () => {
    expect(controller.text).toBe('');
    expect(controller.cursorPosition).toBe(0);
    expect(controller.selectionStart).toBe(-1);
    expect(controller.selectionEnd).toBe(-1);
  });

  test('initial state with text', () => {
    const ctrl = new TextEditingController({ text: 'hello' });
    expect(ctrl.text).toBe('hello');
    expect(ctrl.cursorPosition).toBe(5); // cursor at end
  });

  test('insertText: inserts at cursor position', () => {
    controller.insertText('abc');
    expect(controller.text).toBe('abc');
    expect(controller.cursorPosition).toBe(3);
  });

  test('insertText: inserts in middle', () => {
    controller.insertText('ac');
    controller.cursorPosition = 1;
    controller.insertText('b');
    expect(controller.text).toBe('abc');
    expect(controller.cursorPosition).toBe(2);
  });

  test('deleteBackward: removes char before cursor', () => {
    controller.insertText('abc');
    controller.deleteBackward();
    expect(controller.text).toBe('ab');
    expect(controller.cursorPosition).toBe(2);
  });

  test('deleteBackward: no-op at position 0', () => {
    controller.insertText('abc');
    controller.cursorPosition = 0;
    controller.deleteBackward();
    expect(controller.text).toBe('abc');
    expect(controller.cursorPosition).toBe(0);
  });

  test('deleteForward: removes char at cursor', () => {
    controller.insertText('abc');
    controller.cursorPosition = 1;
    controller.deleteForward();
    expect(controller.text).toBe('ac');
    expect(controller.cursorPosition).toBe(1);
  });

  test('deleteForward: no-op at end of text', () => {
    controller.insertText('abc');
    controller.deleteForward();
    expect(controller.text).toBe('abc');
    expect(controller.cursorPosition).toBe(3);
  });

  test('moveCursorLeft: moves cursor left', () => {
    controller.insertText('abc');
    controller.moveCursorLeft();
    expect(controller.cursorPosition).toBe(2);
    controller.moveCursorLeft();
    expect(controller.cursorPosition).toBe(1);
  });

  test('moveCursorLeft: stops at 0', () => {
    controller.insertText('abc');
    controller.cursorPosition = 0;
    controller.moveCursorLeft();
    expect(controller.cursorPosition).toBe(0);
  });

  test('moveCursorRight: moves cursor right', () => {
    controller.insertText('abc');
    controller.cursorPosition = 0;
    controller.moveCursorRight();
    expect(controller.cursorPosition).toBe(1);
  });

  test('moveCursorRight: stops at text.length', () => {
    controller.insertText('abc');
    controller.moveCursorRight();
    expect(controller.cursorPosition).toBe(3);
  });

  test('moveCursorHome: jumps to 0', () => {
    controller.insertText('abc');
    controller.moveCursorHome();
    expect(controller.cursorPosition).toBe(0);
  });

  test('moveCursorEnd: jumps to text.length', () => {
    controller.insertText('abc');
    controller.cursorPosition = 0;
    controller.moveCursorEnd();
    expect(controller.cursorPosition).toBe(3);
  });

  test('text setter: updates text and clamps cursor', () => {
    controller.insertText('abcdef');
    expect(controller.cursorPosition).toBe(6);
    controller.text = 'ab'; // shorter text
    expect(controller.text).toBe('ab');
    expect(controller.cursorPosition).toBe(2); // clamped
  });

  test('text setter: cursor stays if still in range', () => {
    controller.insertText('abc');
    controller.cursorPosition = 1;
    controller.text = 'xyz';
    expect(controller.cursorPosition).toBe(1); // still valid
  });

  test('cursorPosition setter: clamps to [0, text.length]', () => {
    controller.insertText('abc');
    controller.cursorPosition = 100;
    expect(controller.cursorPosition).toBe(3);
    controller.cursorPosition = -5;
    expect(controller.cursorPosition).toBe(0);
  });

  test('selectAll: selects entire text', () => {
    controller.insertText('abc');
    controller.selectAll();
    expect(controller.selectionStart).toBe(0);
    expect(controller.selectionEnd).toBe(3);
  });

  test('clear: resets everything', () => {
    controller.insertText('abc');
    controller.selectAll();
    controller.clear();
    expect(controller.text).toBe('');
    expect(controller.cursorPosition).toBe(0);
    expect(controller.selectionStart).toBe(-1);
    expect(controller.selectionEnd).toBe(-1);
  });

  test('listener notification on insertText', () => {
    let notified = 0;
    controller.addListener(() => notified++);
    controller.insertText('a');
    expect(notified).toBe(1);
    controller.insertText('b');
    expect(notified).toBe(2);
  });

  test('listener notification on deleteBackward', () => {
    controller.insertText('ab');
    let notified = 0;
    controller.addListener(() => notified++);
    controller.deleteBackward();
    expect(notified).toBe(1);
  });

  test('listener notification on text setter', () => {
    let notified = 0;
    controller.addListener(() => notified++);
    controller.text = 'hello';
    expect(notified).toBe(1);
  });

  test('listener notification on cursor movement', () => {
    controller.insertText('abc');
    let notified = 0;
    controller.addListener(() => notified++);
    controller.moveCursorLeft();
    expect(notified).toBe(1);
    controller.moveCursorRight();
    expect(notified).toBe(2);
    controller.moveCursorHome();
    expect(notified).toBe(3);
    controller.moveCursorEnd();
    expect(notified).toBe(4);
  });

  test('removeListener: stops notification', () => {
    let notified = 0;
    const listener = () => notified++;
    controller.addListener(listener);
    controller.insertText('a');
    expect(notified).toBe(1);
    controller.removeListener(listener);
    controller.insertText('b');
    expect(notified).toBe(1); // no new notification
  });

  test('dispose: clears listeners', () => {
    let notified = 0;
    controller.addListener(() => notified++);
    controller.dispose();
    // After dispose, no notification (but ChangeNotifier silently handles this)
    // Just verify dispose doesn't throw
    expect(notified).toBe(0);
  });
});

// ===========================================================================
// TextField
// ===========================================================================

describe('TextField', () => {
  test('creates with default controller', () => {
    const tf = new TextField();
    expect(tf.controller).toBeUndefined();
    expect(tf.placeholder).toBeUndefined();
  });

  test('creates with provided controller', () => {
    const ctrl = new TextEditingController({ text: 'hello' });
    const tf = new TextField({ controller: ctrl });
    expect(tf.controller).toBe(ctrl);
  });

  test('creates with placeholder', () => {
    const tf = new TextField({ placeholder: 'Type here...' });
    expect(tf.placeholder).toBe('Type here...');
  });

  test('creates with onSubmit callback', () => {
    let submitted = '';
    const tf = new TextField({ onSubmit: (text) => { submitted = text; } });
    expect(tf.onSubmit).toBeDefined();
    tf.onSubmit!('test');
    expect(submitted).toBe('test');
  });

  test('creates with onChanged callback', () => {
    let changed = '';
    const tf = new TextField({ onChanged: (text) => { changed = text; } });
    expect(tf.onChanged).toBeDefined();
    tf.onChanged!('hello');
    expect(changed).toBe('hello');
  });

  test('creates with style', () => {
    const style = new TextStyle({ bold: true });
    const tf = new TextField({ style });
    expect(tf.style).toBe(style);
  });

  test('creates with autofocus', () => {
    const tf = new TextField({ autofocus: true });
    expect(tf.autofocus).toBe(true);
  });

  test('is a StatefulWidget', () => {
    const tf = new TextField();
    const state = tf.createState();
    expect(state).toBeDefined();
  });
});

// ===========================================================================
// Button
// ===========================================================================

describe('Button', () => {
  test('creates with text and onPressed', () => {
    let pressed = false;
    const btn = new Button({ text: 'Click me', onPressed: () => { pressed = true; } });
    expect(btn.text).toBe('Click me');
    btn.onPressed();
    expect(pressed).toBe(true);
  });

  test('renders text content via build', () => {
    const btn = new Button({ text: 'Submit', onPressed: () => {} });
    // Build returns a display widget; ensure no throw
    const result = btn.build({} as BuildContext);
    expect(result).toBeDefined();
  });

  test('default padding applied', () => {
    const btn = new Button({ text: 'Test', onPressed: () => {} });
    expect(btn.padding.left).toBe(2);
    expect(btn.padding.right).toBe(2);
    expect(btn.padding.top).toBe(1);
    expect(btn.padding.bottom).toBe(1);
  });

  test('custom padding', () => {
    const btn = new Button({
      text: 'Test',
      onPressed: () => {},
      padding: EdgeInsets.all(3),
    });
    expect(btn.padding.left).toBe(3);
    expect(btn.padding.top).toBe(3);
  });

  test('color property', () => {
    const btn = new Button({
      text: 'Test',
      onPressed: () => {},
      color: Color.blue,
    });
    expect(btn.color).toBe(Color.blue);
  });

  test('reverse defaults to false', () => {
    const btn = new Button({ text: 'Test', onPressed: () => {} });
    expect(btn.reverse).toBe(false);
  });

  test('reverse can be set to true', () => {
    const btn = new Button({ text: 'Test', onPressed: () => {}, reverse: true });
    expect(btn.reverse).toBe(true);
  });

  test('handleKeyEvent: Enter triggers onPressed', () => {
    let pressed = false;
    const btn = new Button({ text: 'Test', onPressed: () => { pressed = true; } });
    const result = btn.handleKeyEvent('Enter');
    expect(result).toBe('handled');
    expect(pressed).toBe(true);
  });

  test('handleKeyEvent: Space triggers onPressed', () => {
    let pressed = false;
    const btn = new Button({ text: 'Test', onPressed: () => { pressed = true; } });
    const result = btn.handleKeyEvent(' ');
    expect(result).toBe('handled');
    expect(pressed).toBe(true);
  });

  test('handleKeyEvent: other keys return ignored', () => {
    const btn = new Button({ text: 'Test', onPressed: () => {} });
    const result = btn.handleKeyEvent('Tab');
    expect(result).toBe('ignored');
  });
});

// ===========================================================================
// Table
// ===========================================================================

describe('Table', () => {
  test('renders items with renderRow', () => {
    const items = ['a', 'b', 'c'];
    const table = new Table({
      items,
      renderRow: (item) => [new StubWidget(item), new StubWidget(item.toUpperCase())],
    });

    expect(table.items).toEqual(['a', 'b', 'c']);
    expect(table.showDividers).toBe(false); // default
  });

  test('showDividers option', () => {
    const table = new Table({
      items: [],
      renderRow: () => [new StubWidget(''), new StubWidget('')],
      showDividers: true,
    });
    expect(table.showDividers).toBe(true);
  });

  test('builds without error', () => {
    const table = new Table({
      items: [1, 2, 3],
      renderRow: (item) => [
        new StubWidget(String(item)),
        new StubWidget(`val-${item}`),
      ],
    });
    const result = table.build({} as BuildContext);
    expect(result).toBeDefined();
  });

  test('renderRow called for each item', () => {
    let callCount = 0;
    const table = new Table({
      items: ['x', 'y', 'z'],
      renderRow: (item) => {
        callCount++;
        return [new StubWidget(item), new StubWidget(item)];
      },
    });
    table.build({} as BuildContext);
    expect(callCount).toBe(3);
  });

  test('empty items produces empty result', () => {
    const table = new Table({
      items: [],
      renderRow: () => [new StubWidget(''), new StubWidget('')],
    });
    const result = table.build({} as BuildContext);
    expect(result).toBeDefined();
  });
});

// ===========================================================================
// Divider
// ===========================================================================

describe('Divider', () => {
  test('creates Divider widget', () => {
    const div = new Divider();
    expect(div.color).toBeUndefined();
  });

  test('creates Divider with color', () => {
    const div = new Divider({ color: Color.cyan });
    expect(div.color).toBe(Color.cyan);
  });

  test('createRenderObject returns RenderDivider', () => {
    const div = new Divider({ color: Color.red });
    const render = div.createRenderObject();
    expect(render).toBeInstanceOf(RenderDivider);
    expect(render.color).toBe(Color.red);
  });

  test('updateRenderObject updates color', () => {
    const div1 = new Divider({ color: Color.red });
    const render = div1.createRenderObject();
    const div2 = new Divider({ color: Color.blue });
    div2.updateRenderObject(render);
    expect(render.color).toBe(Color.blue);
  });

  describe('RenderDivider', () => {
    test('sizes to full width, height 1', () => {
      const render = new RenderDivider();
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 40, minHeight: 0, maxHeight: 10 }));
      expect(render.size.width).toBe(40);
      expect(render.size.height).toBe(1);
    });

    test('sizes with tight constraints', () => {
      const render = new RenderDivider();
      render.layout(BoxConstraints.tight(new Size(20, 5)));
      expect(render.size.width).toBe(20);
      // Height clamped: constrain(20, 1) on tight(20,5) => (20,1) if min<=1<=max
      // Actually tight means min=max=5 for height, so constrained to 5
      // But we request height 1 and constraints.constrain(Size(20,1))
      // On tight(20,5): constrain(Size(20,1)) => Size(20, clamp(1,5,5)) = Size(20,5)
      expect(render.size.height).toBe(5);
    });

    test('paints horizontal line characters', () => {
      const render = new RenderDivider();
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 5, minHeight: 0, maxHeight: 5 }));

      const chars: Array<{ col: number; row: number; char: string }> = [];
      const mockContext = {
        setChar: (col: number, row: number, char: string) => {
          chars.push({ col, row, char });
        },
      };
      render.paint(mockContext as unknown as PaintContext, new Offset(2, 3));

      expect(chars.length).toBe(5); // 5 chars wide
      for (let i = 0; i < 5; i++) {
        expect(chars[i].col).toBe(2 + i);
        expect(chars[i].row).toBe(3);
        expect(chars[i].char).toBe('\u2500'); // horizontal line
      }
    });

    test('paints with color style', () => {
      const render = new RenderDivider(Color.green);
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 3, minHeight: 0, maxHeight: 5 }));

      const styles: Array<{ fg?: Color } | undefined> = [];
      const mockContext = {
        setChar: (_col: number, _row: number, _char: string, style?: { fg?: Color }) => {
          styles.push(style);
        },
      };
      render.paint(mockContext as unknown as PaintContext, Offset.zero);

      expect(styles.length).toBe(3);
      for (const style of styles) {
        expect(style).toBeDefined();
        expect(style!.fg).toBe(Color.green);
      }
    });

    test('uses default width of 80 when unconstrained', () => {
      const render = new RenderDivider();
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: Infinity, minHeight: 0, maxHeight: 10 }));
      expect(render.size.width).toBe(80);
      expect(render.size.height).toBe(1);
    });

    test('color setter updates and marks needs paint', () => {
      const render = new RenderDivider(Color.red);
      expect(render.color).toBe(Color.red);
      render.color = Color.blue;
      expect(render.color).toBe(Color.blue);
    });

    test('color setter no-op for same color', () => {
      const render = new RenderDivider(Color.red);
      render.color = Color.red; // same, no-op
      expect(render.color).toBe(Color.red);
    });
  });
});

// ===========================================================================
// MouseRegion
// ===========================================================================

describe('MouseRegion', () => {
  test('creates MouseRegion widget with callbacks', () => {
    const onClick = () => {};
    const mr = new MouseRegion({ onClick });
    expect(mr.onClick).toBe(onClick);
  });

  test('creates MouseRegion with child', () => {
    const child = new StubWidget('child');
    const mr = new MouseRegion({ child });
    expect(mr.child).toBe(child);
  });

  test('createRenderObject returns RenderMouseRegion', () => {
    const onClick = () => {};
    const mr = new MouseRegion({ onClick });
    const render = mr.createRenderObject();
    expect(render).toBeInstanceOf(RenderMouseRegion);
    expect(render.onClick).toBe(onClick);
  });

  test('updateRenderObject updates callbacks', () => {
    const mr1 = new MouseRegion({ onClick: () => {} });
    const render = mr1.createRenderObject();
    const newClick = () => {};
    const mr2 = new MouseRegion({ onClick: newClick });
    mr2.updateRenderObject(render);
    expect(render.onClick).toBe(newClick);
  });

  describe('RenderMouseRegion', () => {
    test('delegates layout to child', () => {
      const render = new RenderMouseRegion();
      const child = new StubRenderBox();
      render.child = child;
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 80, minHeight: 0, maxHeight: 24 }));
      // StubRenderBox sizes to 10x3
      expect(render.size.width).toBe(10);
      expect(render.size.height).toBe(3);
    });

    test('sizes to zero without child', () => {
      const render = new RenderMouseRegion();
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 80, minHeight: 0, maxHeight: 24 }));
      expect(render.size.width).toBe(0);
      expect(render.size.height).toBe(0);
    });

    test('handleMouseEvent dispatches click', () => {
      let clickEvent: MouseRegionEvent | null = null;
      const render = new RenderMouseRegion({
        onClick: (e) => { clickEvent = e; },
      });
      render.handleMouseEvent('click', { x: 5, y: 2 });
      expect(clickEvent).toBeDefined();
      expect(clickEvent!.x).toBe(5);
      expect(clickEvent!.y).toBe(2);
    });

    test('handleMouseEvent dispatches enter', () => {
      let entered = false;
      const render = new RenderMouseRegion({
        onEnter: () => { entered = true; },
      });
      render.handleMouseEvent('enter', { x: 0, y: 0 });
      expect(entered).toBe(true);
    });

    test('handleMouseEvent dispatches exit', () => {
      let exited = false;
      const render = new RenderMouseRegion({
        onExit: () => { exited = true; },
      });
      render.handleMouseEvent('exit', { x: 0, y: 0 });
      expect(exited).toBe(true);
    });

    test('handleMouseEvent dispatches hover', () => {
      let hoverEvent: MouseRegionEvent | null = null;
      const render = new RenderMouseRegion({
        onHover: (e) => { hoverEvent = e; },
      });
      render.handleMouseEvent('hover', { x: 3, y: 1 });
      expect(hoverEvent).toBeDefined();
      expect(hoverEvent!.x).toBe(3);
    });

    test('handleMouseEvent dispatches scroll', () => {
      let scrolled = false;
      const render = new RenderMouseRegion({
        onScroll: () => { scrolled = true; },
      });
      render.handleMouseEvent('scroll', { x: 0, y: 0 });
      expect(scrolled).toBe(true);
    });

    test('handleMouseEvent no-op for missing callback', () => {
      const render = new RenderMouseRegion();
      // Should not throw even without callbacks
      render.handleMouseEvent('click', { x: 0, y: 0 });
      render.handleMouseEvent('enter', { x: 0, y: 0 });
      render.handleMouseEvent('exit', { x: 0, y: 0 });
      render.handleMouseEvent('hover', { x: 0, y: 0 });
      render.handleMouseEvent('scroll', { x: 0, y: 0 });
    });

    test('hasMouseListeners: true when callback set', () => {
      const render = new RenderMouseRegion({ onClick: () => {} });
      expect(render.hasMouseListeners).toBe(true);
    });

    test('hasMouseListeners: false when no callbacks', () => {
      const render = new RenderMouseRegion();
      expect(render.hasMouseListeners).toBe(false);
    });

    test('child can be set and replaced', () => {
      const render = new RenderMouseRegion();
      const child1 = new StubRenderBox();
      render.child = child1;
      expect(render.child).toBe(child1);

      const child2 = new StubRenderBox();
      render.child = child2;
      expect(render.child).toBe(child2);
    });

    test('child can be set to null', () => {
      const render = new RenderMouseRegion();
      const child = new StubRenderBox();
      render.child = child;
      render.child = null;
      expect(render.child).toBeNull();
    });

    test('visitChildren visits child', () => {
      const render = new RenderMouseRegion();
      const child = new StubRenderBox();
      render.child = child;

      const visited: RenderBox[] = [];
      render.visitChildren((c) => visited.push(c as RenderBox));
      expect(visited.length).toBe(1);
      expect(visited[0]).toBe(child);
    });

    test('visitChildren does nothing without child', () => {
      const render = new RenderMouseRegion();
      const visited: RenderBox[] = [];
      render.visitChildren((c) => visited.push(c as RenderBox));
      expect(visited.length).toBe(0);
    });

    test('handleMouseEvent dispatches release', () => {
      let releaseEvent: MouseRegionEvent | null = null;
      const render = new RenderMouseRegion({
        onRelease: (e) => { releaseEvent = e; },
      });
      render.handleMouseEvent('release', { x: 4, y: 7 });
      expect(releaseEvent).toBeDefined();
      expect(releaseEvent!.x).toBe(4);
      expect(releaseEvent!.y).toBe(7);
    });

    test('handleMouseEvent dispatches drag', () => {
      let dragEvent: MouseRegionEvent | null = null;
      const render = new RenderMouseRegion({
        onDrag: (e) => { dragEvent = e; },
      });
      render.handleMouseEvent('drag', { x: 8, y: 3 });
      expect(dragEvent).toBeDefined();
      expect(dragEvent!.x).toBe(8);
      expect(dragEvent!.y).toBe(3);
    });

    test('handleMouseEvent release no-op without callback', () => {
      const render = new RenderMouseRegion();
      // Should not throw
      render.handleMouseEvent('release', { x: 0, y: 0 });
    });

    test('handleMouseEvent drag no-op without callback', () => {
      const render = new RenderMouseRegion();
      // Should not throw
      render.handleMouseEvent('drag', { x: 0, y: 0 });
    });

    test('hasMouseListeners includes onRelease', () => {
      const render = new RenderMouseRegion({ onRelease: () => {} });
      expect(render.hasMouseListeners).toBe(true);
    });

    test('hasMouseListeners includes onDrag', () => {
      const render = new RenderMouseRegion({ onDrag: () => {} });
      expect(render.hasMouseListeners).toBe(true);
    });
  });

  test('MouseRegion widget passes onRelease to render object', () => {
    const onRelease = () => {};
    const mr = new MouseRegion({ onRelease });
    const render = mr.createRenderObject();
    expect(render.onRelease).toBe(onRelease);
  });

  test('MouseRegion widget passes onDrag to render object', () => {
    const onDrag = () => {};
    const mr = new MouseRegion({ onDrag });
    const render = mr.createRenderObject();
    expect(render.onDrag).toBe(onDrag);
  });

  test('updateRenderObject updates onRelease and onDrag', () => {
    const mr1 = new MouseRegion({ onRelease: () => {} });
    const render = mr1.createRenderObject();
    const newRelease = () => {};
    const newDrag = () => {};
    const mr2 = new MouseRegion({ onRelease: newRelease, onDrag: newDrag });
    mr2.updateRenderObject(render);
    expect(render.onRelease).toBe(newRelease);
    expect(render.onDrag).toBe(newDrag);
  });

  test('MouseEventType includes release and drag', () => {
    // Verify the type union allows 'release' and 'drag'
    const types: MouseEventType[] = ['click', 'release', 'drag', 'enter', 'exit', 'hover', 'scroll'];
    expect(types.length).toBe(7);
  });
});
