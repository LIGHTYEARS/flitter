// Tests for EventDispatcher, InputBridge, and HitTest
// Plan 06-03: Event Dispatch Pipeline

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { EventDispatcher, type KeyHandler, type MouseHandler, type ResizeHandler } from '../event-dispatcher';
import { InputBridge } from '../input-bridge';
import { InputParser } from '../input-parser';
import { BoxHitTestResult } from '../hit-test';
import {
  createKeyEvent,
  createMouseEvent,
  createResizeEvent,
  createFocusEvent,
  createPasteEvent,
  type KeyEvent,
  type MouseEvent as TMouseEvent,
  type InputEvent,
  type KeyEventResult,
} from '../events';
import { RenderBox, ContainerRenderBox, type PaintContext } from '../../framework/render-object';
import { Offset, Size } from '../../core/types';
import { BoxConstraints } from '../../core/box-constraints';

// -- Test helper: concrete RenderBox for hit testing --

class TestRenderBox extends RenderBox {
  private _testSize: Size;
  private _testOffset: Offset;

  constructor(width: number, height: number, col: number = 0, row: number = 0) {
    super();
    this._testSize = new Size(width, height);
    this._testOffset = new Offset(col, row);
  }

  performLayout(): void {
    this.size = this._testSize;
    this.offset = this._testOffset;
  }

  paint(_context: PaintContext, _offset: Offset): void {}
}

class TestContainerRenderBox extends ContainerRenderBox {
  private _testSize: Size;
  private _testOffset: Offset;

  constructor(width: number, height: number, col: number = 0, row: number = 0) {
    super();
    this._testSize = new Size(width, height);
    this._testOffset = new Offset(col, row);
  }

  performLayout(): void {
    this.size = this._testSize;
    this.offset = this._testOffset;
    // Layout children
    this.visitChildren((child) => {
      if (child instanceof RenderBox) {
        child.layout(BoxConstraints.tight(this._testSize));
      }
    });
  }

  paint(_context: PaintContext, _offset: Offset): void {}

  addTestChild(child: RenderBox): void {
    this.insert(child);
  }
}

// ==========================================================================
// EventDispatcher Tests
// ==========================================================================

describe('EventDispatcher', () => {
  beforeEach(() => {
    EventDispatcher.reset();
  });

  afterEach(() => {
    EventDispatcher.reset();
  });

  // --- Singleton ---

  it('should return same instance (singleton)', () => {
    const a = EventDispatcher.instance;
    const b = EventDispatcher.instance;
    expect(a).toBe(b);
  });

  it('should return new instance after reset', () => {
    const a = EventDispatcher.instance;
    EventDispatcher.reset();
    const b = EventDispatcher.instance;
    expect(a).not.toBe(b);
  });

  // --- Key handler registration and dispatch ---

  it('should register and dispatch key events to key handlers', () => {
    const dispatcher = EventDispatcher.instance;
    const received: KeyEvent[] = [];
    const handler: KeyHandler = (event) => {
      received.push(event);
      return 'handled';
    };

    dispatcher.addKeyHandler(handler);
    const event = createKeyEvent('a');
    dispatcher.dispatchKeyEvent(event);

    expect(received).toHaveLength(1);
    expect(received[0]!.key).toBe('a');
  });

  it('should remove key handlers', () => {
    const dispatcher = EventDispatcher.instance;
    const received: KeyEvent[] = [];
    const handler: KeyHandler = (event) => {
      received.push(event);
      return 'handled';
    };

    dispatcher.addKeyHandler(handler);
    dispatcher.removeKeyHandler(handler);
    dispatcher.dispatchKeyEvent(createKeyEvent('a'));

    expect(received).toHaveLength(0);
  });

  it('should call multiple key handlers in order', () => {
    const dispatcher = EventDispatcher.instance;
    const order: number[] = [];

    dispatcher.addKeyHandler(() => { order.push(1); return 'ignored'; });
    dispatcher.addKeyHandler(() => { order.push(2); return 'ignored'; });
    dispatcher.addKeyHandler(() => { order.push(3); return 'ignored'; });

    dispatcher.dispatchKeyEvent(createKeyEvent('a'));

    expect(order).toEqual([1, 2, 3]);
  });

  it('should stop key handler chain when one returns handled', () => {
    const dispatcher = EventDispatcher.instance;
    const order: number[] = [];

    dispatcher.addKeyHandler(() => { order.push(1); return 'ignored'; });
    dispatcher.addKeyHandler(() => { order.push(2); return 'handled'; });
    dispatcher.addKeyHandler(() => { order.push(3); return 'ignored'; });

    const result = dispatcher.dispatchKeyEvent(createKeyEvent('a'));

    expect(order).toEqual([1, 2]);
    expect(result).toBe('handled');
  });

  it('should return ignored when no key handler handles event', () => {
    const dispatcher = EventDispatcher.instance;
    dispatcher.addKeyHandler(() => 'ignored');
    dispatcher.addKeyHandler(() => 'ignored');

    const result = dispatcher.dispatchKeyEvent(createKeyEvent('a'));
    expect(result).toBe('ignored');
  });

  // --- Key interceptors ---

  it('should run key interceptors before regular handlers', () => {
    const dispatcher = EventDispatcher.instance;
    const order: string[] = [];

    dispatcher.addKeyHandler(() => { order.push('handler'); return 'ignored'; });
    dispatcher.addKeyInterceptor(() => { order.push('interceptor'); return 'ignored'; });

    dispatcher.dispatchKeyEvent(createKeyEvent('a'));

    expect(order).toEqual(['interceptor', 'handler']);
  });

  it('should stop dispatch when key interceptor returns handled', () => {
    const dispatcher = EventDispatcher.instance;
    const order: string[] = [];

    dispatcher.addKeyInterceptor(() => { order.push('interceptor'); return 'handled'; });
    dispatcher.addKeyHandler(() => { order.push('handler'); return 'ignored'; });

    const result = dispatcher.dispatchKeyEvent(createKeyEvent('a'));

    expect(order).toEqual(['interceptor']);
    expect(result).toBe('handled');
  });

  it('should remove key interceptors', () => {
    const dispatcher = EventDispatcher.instance;
    const calls: string[] = [];
    const interceptor: KeyHandler = () => { calls.push('interceptor'); return 'handled'; };

    dispatcher.addKeyInterceptor(interceptor);
    dispatcher.removeKeyInterceptor(interceptor);
    dispatcher.dispatchKeyEvent(createKeyEvent('a'));

    expect(calls).toHaveLength(0);
  });

  // --- Mouse handler registration and dispatch ---

  it('should register and dispatch mouse events', () => {
    const dispatcher = EventDispatcher.instance;
    const received: TMouseEvent[] = [];
    const handler: MouseHandler = (event) => { received.push(event); };

    dispatcher.addMouseHandler(handler);
    const event = createMouseEvent('press', 0, 10, 5);
    dispatcher.dispatchMouseEvent(event);

    expect(received).toHaveLength(1);
    expect(received[0]!.x).toBe(10);
    expect(received[0]!.y).toBe(5);
  });

  it('should remove mouse handlers', () => {
    const dispatcher = EventDispatcher.instance;
    const received: TMouseEvent[] = [];
    const handler: MouseHandler = (event) => { received.push(event); };

    dispatcher.addMouseHandler(handler);
    dispatcher.removeMouseHandler(handler);
    dispatcher.dispatchMouseEvent(createMouseEvent('press', 0, 10, 5));

    expect(received).toHaveLength(0);
  });

  it('should call multiple mouse handlers', () => {
    const dispatcher = EventDispatcher.instance;
    const order: number[] = [];

    dispatcher.addMouseHandler(() => { order.push(1); });
    dispatcher.addMouseHandler(() => { order.push(2); });

    dispatcher.dispatchMouseEvent(createMouseEvent('press', 0, 0, 0));

    expect(order).toEqual([1, 2]);
  });

  // --- Resize handler registration and dispatch ---

  it('should register and dispatch resize events', () => {
    const dispatcher = EventDispatcher.instance;
    const received: { width: number; height: number }[] = [];
    const handler: ResizeHandler = (w, h) => { received.push({ width: w, height: h }); };

    dispatcher.addResizeHandler(handler);
    dispatcher.dispatchResizeEvent(createResizeEvent(120, 40));

    expect(received).toHaveLength(1);
    expect(received[0]!.width).toBe(120);
    expect(received[0]!.height).toBe(40);
  });

  it('should remove resize handlers', () => {
    const dispatcher = EventDispatcher.instance;
    const calls: number[] = [];
    const handler: ResizeHandler = () => { calls.push(1); };

    dispatcher.addResizeHandler(handler);
    dispatcher.removeResizeHandler(handler);
    dispatcher.dispatchResizeEvent(createResizeEvent(80, 24));

    expect(calls).toHaveLength(0);
  });

  // --- Paste event dispatch ---

  it('should dispatch paste events to paste handlers', () => {
    const dispatcher = EventDispatcher.instance;
    const received: string[] = [];

    dispatcher.addPasteHandler((event) => { received.push(event.text); });
    dispatcher.dispatchPasteEvent(createPasteEvent('Hello, world!'));

    expect(received).toEqual(['Hello, world!']);
  });

  it('should remove paste handlers', () => {
    const dispatcher = EventDispatcher.instance;
    const calls: string[] = [];
    const handler = (event: any) => { calls.push(event.text); };

    dispatcher.addPasteHandler(handler);
    dispatcher.removePasteHandler(handler);
    dispatcher.dispatchPasteEvent(createPasteEvent('test'));

    expect(calls).toHaveLength(0);
  });

  // --- Focus event dispatch ---

  it('should dispatch focus events to focus handlers', () => {
    const dispatcher = EventDispatcher.instance;
    const received: boolean[] = [];

    dispatcher.addFocusHandler((event) => { received.push(event.focused); });
    dispatcher.dispatchFocusEvent(createFocusEvent(true));
    dispatcher.dispatchFocusEvent(createFocusEvent(false));

    expect(received).toEqual([true, false]);
  });

  it('should remove focus handlers', () => {
    const dispatcher = EventDispatcher.instance;
    const calls: boolean[] = [];
    const handler = (event: any) => { calls.push(event.focused); };

    dispatcher.addFocusHandler(handler);
    dispatcher.removeFocusHandler(handler);
    dispatcher.dispatchFocusEvent(createFocusEvent(true));

    expect(calls).toHaveLength(0);
  });

  // --- Global release callbacks ---

  it('should fire global release callbacks on mouse release', () => {
    const dispatcher = EventDispatcher.instance;
    const received: TMouseEvent[] = [];

    const callback = (event: TMouseEvent) => { received.push(event); };
    dispatcher.addGlobalReleaseCallback(callback);

    // Release event should trigger callback
    dispatcher.dispatchMouseEvent(createMouseEvent('release', 0, 5, 5));
    expect(received).toHaveLength(1);

    // Press event should NOT trigger release callback
    dispatcher.dispatchMouseEvent(createMouseEvent('press', 0, 5, 5));
    expect(received).toHaveLength(1); // still 1
  });

  it('should remove global release callbacks', () => {
    const dispatcher = EventDispatcher.instance;
    const calls: number[] = [];
    const callback = () => { calls.push(1); };

    dispatcher.addGlobalReleaseCallback(callback);
    dispatcher.removeGlobalReleaseCallback(callback);
    dispatcher.dispatchMouseEvent(createMouseEvent('release', 0, 0, 0));

    expect(calls).toHaveLength(0);
  });

  it('should fire release callbacks AND mouse handlers on release', () => {
    const dispatcher = EventDispatcher.instance;
    const order: string[] = [];

    dispatcher.addGlobalReleaseCallback(() => { order.push('release-callback'); });
    dispatcher.addMouseHandler(() => { order.push('mouse-handler'); });

    dispatcher.dispatchMouseEvent(createMouseEvent('release', 0, 0, 0));

    expect(order).toEqual(['release-callback', 'mouse-handler']);
  });

  // --- dispatch() routing ---

  it('should route key events via dispatch()', () => {
    const dispatcher = EventDispatcher.instance;
    const received: string[] = [];

    dispatcher.addKeyHandler((event) => { received.push(event.key); return 'handled'; });
    dispatcher.dispatch(createKeyEvent('Enter'));

    expect(received).toEqual(['Enter']);
  });

  it('should route mouse events via dispatch()', () => {
    const dispatcher = EventDispatcher.instance;
    const received: string[] = [];

    dispatcher.addMouseHandler((event) => { received.push(event.action); });
    dispatcher.dispatch(createMouseEvent('press', 0, 10, 10));

    expect(received).toEqual(['press']);
  });

  it('should route resize events via dispatch()', () => {
    const dispatcher = EventDispatcher.instance;
    const sizes: { w: number; h: number }[] = [];

    dispatcher.addResizeHandler((w, h) => { sizes.push({ w, h }); });
    dispatcher.dispatch(createResizeEvent(132, 43));

    expect(sizes).toEqual([{ w: 132, h: 43 }]);
  });

  it('should route paste events via dispatch()', () => {
    const dispatcher = EventDispatcher.instance;
    const texts: string[] = [];

    dispatcher.addPasteHandler((event) => { texts.push(event.text); });
    dispatcher.dispatch(createPasteEvent('pasted text'));

    expect(texts).toEqual(['pasted text']);
  });

  it('should route focus events via dispatch()', () => {
    const dispatcher = EventDispatcher.instance;
    const focused: boolean[] = [];

    dispatcher.addFocusHandler((event) => { focused.push(event.focused); });
    dispatcher.dispatch(createFocusEvent(true));

    expect(focused).toEqual([true]);
  });

  // --- Edge cases ---

  it('should handle dispatch with no handlers registered', () => {
    const dispatcher = EventDispatcher.instance;

    // Should not throw
    dispatcher.dispatch(createKeyEvent('a'));
    dispatcher.dispatch(createMouseEvent('press', 0, 0, 0));
    dispatcher.dispatch(createResizeEvent(80, 24));
    dispatcher.dispatch(createPasteEvent('text'));
    dispatcher.dispatch(createFocusEvent(true));
  });

  it('should handle removing a handler that was not added', () => {
    const dispatcher = EventDispatcher.instance;
    const handler: KeyHandler = () => 'ignored';

    // Should not throw
    dispatcher.removeKeyHandler(handler);
    dispatcher.removeKeyInterceptor(handler);
    dispatcher.removeMouseHandler(() => {});
    dispatcher.removeResizeHandler(() => {});
  });

  it('should not fire release callbacks for non-release mouse actions', () => {
    const dispatcher = EventDispatcher.instance;
    let releaseCount = 0;

    dispatcher.addGlobalReleaseCallback(() => { releaseCount++; });

    dispatcher.dispatchMouseEvent(createMouseEvent('press', 0, 0, 0));
    dispatcher.dispatchMouseEvent(createMouseEvent('move', 0, 5, 5));
    dispatcher.dispatchMouseEvent(createMouseEvent('scroll', 64, 0, 0));

    expect(releaseCount).toBe(0);
  });
});

// ==========================================================================
// InputBridge Tests
// ==========================================================================

describe('InputBridge', () => {
  beforeEach(() => {
    EventDispatcher.reset();
  });

  afterEach(() => {
    EventDispatcher.reset();
  });

  it('should connect parser to dispatcher and feed raw bytes', () => {
    const dispatcher = EventDispatcher.instance;
    const received: InputEvent[] = [];

    dispatcher.addKeyHandler((event) => {
      received.push(event);
      return 'handled';
    });

    const bridge = new InputBridge(undefined, dispatcher);
    bridge.feed('a');

    expect(received).toHaveLength(1);
    expect((received[0] as KeyEvent).key).toBe('a');
    bridge.dispose();
  });

  it('should dispatch arrow key escape sequences', () => {
    const dispatcher = EventDispatcher.instance;
    const received: KeyEvent[] = [];

    dispatcher.addKeyHandler((event) => {
      received.push(event);
      return 'handled';
    });

    const bridge = new InputBridge(undefined, dispatcher);
    // ESC [ A = ArrowUp
    bridge.feed('\x1b[A');

    expect(received).toHaveLength(1);
    expect(received[0]!.key).toBe('ArrowUp');
    bridge.dispose();
  });

  it('should dispatch mouse events from SGR sequences', () => {
    const dispatcher = EventDispatcher.instance;
    const received: TMouseEvent[] = [];

    dispatcher.addMouseHandler((event) => {
      received.push(event);
    });

    const bridge = new InputBridge(undefined, dispatcher);
    // SGR mouse press at column 10, row 5 (1-based in protocol)
    bridge.feed('\x1b[<0;10;5M');

    expect(received).toHaveLength(1);
    expect(received[0]!.action).toBe('press');
    expect(received[0]!.x).toBe(9);  // 0-based
    expect(received[0]!.y).toBe(4);  // 0-based
    bridge.dispose();
  });

  it('should dispatch focus events from escape sequences', () => {
    const dispatcher = EventDispatcher.instance;
    const focused: boolean[] = [];

    dispatcher.addFocusHandler((event) => {
      focused.push(event.focused);
    });

    const bridge = new InputBridge(undefined, dispatcher);
    // ESC [ I = focus in, ESC [ O = focus out
    bridge.feed('\x1b[I');
    bridge.feed('\x1b[O');

    expect(focused).toEqual([true, false]);
    bridge.dispose();
  });

  it('should dispatch paste events from bracketed paste', () => {
    const dispatcher = EventDispatcher.instance;
    const texts: string[] = [];

    dispatcher.addPasteHandler((event) => {
      texts.push(event.text);
    });

    const bridge = new InputBridge(undefined, dispatcher);
    // Bracketed paste: ESC[200~ ... ESC[201~
    bridge.feed('\x1b[200~Hello World\x1b[201~');

    expect(texts).toEqual(['Hello World']);
    bridge.dispose();
  });

  it('should accept custom parser and dispatcher', () => {
    const events: InputEvent[] = [];
    const parser = new InputParser((event) => { events.push(event); });
    const dispatcher = EventDispatcher.instance;

    const bridge = new InputBridge(parser, dispatcher);
    expect(bridge.parser).toBe(parser);
    expect(bridge.dispatcher).toBe(dispatcher);
    bridge.dispose();
  });

  it('should not dispatch after dispose', () => {
    const dispatcher = EventDispatcher.instance;
    const received: InputEvent[] = [];

    dispatcher.addKeyHandler((event) => {
      received.push(event);
      return 'handled';
    });

    const bridge = new InputBridge(undefined, dispatcher);
    bridge.dispose();
    bridge.feed('a');

    expect(received).toHaveLength(0);
  });

  it('should handle multiple characters in one feed call', () => {
    const dispatcher = EventDispatcher.instance;
    const received: KeyEvent[] = [];

    dispatcher.addKeyHandler((event) => {
      received.push(event);
      return 'ignored';
    });

    const bridge = new InputBridge(undefined, dispatcher);
    bridge.feed('abc');

    expect(received).toHaveLength(3);
    expect(received[0]!.key).toBe('a');
    expect(received[1]!.key).toBe('b');
    expect(received[2]!.key).toBe('c');
    bridge.dispose();
  });

  it('should handle ctrl key sequences', () => {
    const dispatcher = EventDispatcher.instance;
    const received: KeyEvent[] = [];

    dispatcher.addKeyHandler((event) => {
      received.push(event);
      return 'handled';
    });

    const bridge = new InputBridge(undefined, dispatcher);
    // Ctrl+C = 0x03
    bridge.feed('\x03');

    expect(received).toHaveLength(1);
    expect(received[0]!.key).toBe('c');
    expect(received[0]!.ctrlKey).toBe(true);
    bridge.dispose();
  });
});

// ==========================================================================
// HitTest Tests
// ==========================================================================

describe('RenderBox.hitTest (via BoxHitTestResult)', () => {
  it('should find a single render box at a position', () => {
    const box = new TestRenderBox(80, 24, 0, 0);
    box.layout(BoxConstraints.tight(new Size(80, 24)));

    const result = new BoxHitTestResult();
    box.hitTest(result, new Offset(10, 5));

    expect(result.path).toHaveLength(1);
    expect(result.path[0]!.target).toBe(box);
    expect(result.path[0]!.localPosition.col).toBe(10);
    expect(result.path[0]!.localPosition.row).toBe(5);
  });

  it('should return empty path for miss', () => {
    const box = new TestRenderBox(10, 5, 0, 0);
    box.layout(BoxConstraints.tight(new Size(10, 5)));

    const result = new BoxHitTestResult();
    box.hitTest(result, new Offset(15, 10));
    expect(result.path).toHaveLength(0);
  });

  it('should find parent and child in path', () => {
    const root = new TestContainerRenderBox(80, 24, 0, 0);
    const child = new TestRenderBox(40, 12, 5, 3);

    root.addTestChild(child);
    root.layout(BoxConstraints.tight(new Size(80, 24)));

    const result = new BoxHitTestResult();
    root.hitTest(result, new Offset(10, 5));

    expect(result.path.length).toBeGreaterThanOrEqual(2);
    const targets = result.path.map((e) => e.target);
    expect(targets).toContain(root);
    expect(targets).toContain(child);
  });

  it('should handle nested containers', () => {
    const root = new TestContainerRenderBox(80, 24, 0, 0);
    const middle = new TestContainerRenderBox(60, 20, 2, 1);
    const leaf = new TestRenderBox(20, 10, 5, 3);

    root.addTestChild(middle);
    middle.addTestChild(leaf);
    root.layout(BoxConstraints.tight(new Size(80, 24)));

    const result = new BoxHitTestResult();
    root.hitTest(result, new Offset(12, 8));

    expect(result.path.length).toBeGreaterThanOrEqual(3);
    const targets = result.path.map((e) => e.target);
    expect(targets).toContain(leaf);
    expect(targets).toContain(middle);
    expect(targets).toContain(root);
  });

  it('should miss when outside root bounds', () => {
    const root = new TestRenderBox(40, 20, 0, 0);
    root.layout(BoxConstraints.tight(new Size(40, 20)));

    const r1 = new BoxHitTestResult();
    root.hitTest(r1, new Offset(-1, 0));
    expect(r1.path).toHaveLength(0);

    const r2 = new BoxHitTestResult();
    root.hitTest(r2, new Offset(0, -1));
    expect(r2.path).toHaveLength(0);

    const r3 = new BoxHitTestResult();
    root.hitTest(r3, new Offset(40, 0));
    expect(r3.path).toHaveLength(0);

    const r4 = new BoxHitTestResult();
    root.hitTest(r4, new Offset(0, 20));
    expect(r4.path).toHaveLength(0);
  });

  it('should return only parent when click misses all children', () => {
    const root = new TestContainerRenderBox(80, 24, 0, 0);
    const child = new TestRenderBox(10, 5, 50, 15);

    root.addTestChild(child);
    root.layout(BoxConstraints.tight(new Size(80, 24)));

    const result = new BoxHitTestResult();
    root.hitTest(result, new Offset(5, 5));

    expect(result.path).toHaveLength(1);
    expect(result.path[0]!.target).toBe(root);
  });

  it('should prefer front-most child (last in children array)', () => {
    const root = new TestContainerRenderBox(80, 24, 0, 0);
    const back = new TestRenderBox(20, 10, 5, 5);
    const front = new TestRenderBox(20, 10, 10, 5);

    root.addTestChild(back);
    root.addTestChild(front);
    root.layout(BoxConstraints.tight(new Size(80, 24)));

    const result = new BoxHitTestResult();
    root.hitTest(result, new Offset(15, 7));

    const targets = result.path.map((e) => e.target);
    expect(targets).toContain(front);
  });

  it('should handle zero-size render objects', () => {
    const box = new TestRenderBox(0, 0, 0, 0);
    box.layout(BoxConstraints.tight(new Size(0, 0)));

    const result = new BoxHitTestResult();
    box.hitTest(result, new Offset(0, 0));
    expect(result.path).toHaveLength(0);
  });
});

describe('RenderBox.hitTestSelf', () => {
  it('should return true for point inside bounds', () => {
    const box = new TestRenderBox(10, 5, 0, 0);
    box.layout(BoxConstraints.tight(new Size(10, 5)));

    expect(box.hitTestSelf(0, 0)).toBe(true);
    expect(box.hitTestSelf(5, 3)).toBe(true);
    expect(box.hitTestSelf(9, 4)).toBe(true);
  });

  it('should return false for point outside bounds', () => {
    const box = new TestRenderBox(10, 5, 0, 0);
    box.layout(BoxConstraints.tight(new Size(10, 5)));

    expect(box.hitTestSelf(-1, 0)).toBe(false);
    expect(box.hitTestSelf(0, -1)).toBe(false);
    expect(box.hitTestSelf(10, 0)).toBe(false);
    expect(box.hitTestSelf(0, 5)).toBe(false);
    expect(box.hitTestSelf(10, 5)).toBe(false);
  });

  it('should handle boundary exactly at width/height', () => {
    const box = new TestRenderBox(1, 1, 0, 0);
    box.layout(BoxConstraints.tight(new Size(1, 1)));

    expect(box.hitTestSelf(0, 0)).toBe(true);
    expect(box.hitTestSelf(1, 0)).toBe(false);
    expect(box.hitTestSelf(0, 1)).toBe(false);
  });
});

// ==========================================================================
// Integration Tests
// ==========================================================================

describe('Event Dispatch Pipeline Integration', () => {
  beforeEach(() => {
    EventDispatcher.reset();
  });

  afterEach(() => {
    EventDispatcher.reset();
  });

  it('should dispatch key interceptor for Ctrl+C global shortcut', () => {
    const dispatcher = EventDispatcher.instance;
    let ctrlCHandled = false;

    // Register global Ctrl+C interceptor
    dispatcher.addKeyInterceptor((event) => {
      if (event.key === 'c' && event.ctrlKey) {
        ctrlCHandled = true;
        return 'handled';
      }
      return 'ignored';
    });

    // Regular handler should NOT see Ctrl+C
    let regularHandlerCalled = false;
    dispatcher.addKeyHandler(() => {
      regularHandlerCalled = true;
      return 'ignored';
    });

    const bridge = new InputBridge(undefined, dispatcher);
    bridge.feed('\x03'); // Ctrl+C

    expect(ctrlCHandled).toBe(true);
    expect(regularHandlerCalled).toBe(false);
    bridge.dispose();
  });

  it('should handle full mouse press/release cycle with global callbacks', () => {
    const dispatcher = EventDispatcher.instance;
    const events: string[] = [];

    dispatcher.addGlobalReleaseCallback(() => { events.push('release-callback'); });
    dispatcher.addMouseHandler((event) => { events.push(`handler:${event.action}`); });

    const bridge = new InputBridge(undefined, dispatcher);

    // SGR mouse press
    bridge.feed('\x1b[<0;10;5M');
    expect(events).toEqual(['handler:press']);

    // SGR mouse release
    bridge.feed('\x1b[<0;10;5m');
    expect(events).toEqual(['handler:press', 'release-callback', 'handler:release']);
    bridge.dispose();
  });

  it('should dispatch resize events through the full pipeline', () => {
    const dispatcher = EventDispatcher.instance;
    const sizes: { w: number; h: number }[] = [];

    dispatcher.addResizeHandler((w, h) => { sizes.push({ w, h }); });

    // Resize events are not from escape sequences, they come from SIGWINCH
    // Test direct dispatch
    dispatcher.dispatch(createResizeEvent(120, 40));
    expect(sizes).toEqual([{ w: 120, h: 40 }]);
  });

  it('should handle mixed event types in sequence', () => {
    const dispatcher = EventDispatcher.instance;
    const log: string[] = [];

    dispatcher.addKeyHandler((event) => { log.push(`key:${event.key}`); return 'ignored'; });
    dispatcher.addMouseHandler((event) => { log.push(`mouse:${event.action}`); });
    dispatcher.addFocusHandler((event) => { log.push(`focus:${event.focused}`); });

    const bridge = new InputBridge(undefined, dispatcher);

    bridge.feed('a');                    // key event
    bridge.feed('\x1b[<0;1;1M');        // mouse press
    bridge.feed('\x1b[I');              // focus in

    expect(log).toEqual(['key:a', 'mouse:press', 'focus:true']);
    bridge.dispose();
  });
});
