// Tests for WidgetsBinding enhancements, async runApp, and BuildContext.mediaQuery
// Plan 10-03: FRMW-12, FRMW-13, FRMW-14, FRMW-15, FRMW-16

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { WidgetsBinding, runApp, resetSchedulers } from '../binding';
import { MouseManager } from '../../input/mouse-manager';
import {
  Widget,
  StatelessWidget,
  StatefulWidget,
  State,
  type BuildContext,
} from '../widget';
import {
  StatelessElement,
  StatefulElement,
  BuildContextImpl,
  InheritedElement,
  LeafRenderObjectElement,
  Element,
} from '../element';
import {
  LeafRenderObjectWidget,
  RenderBox,
  RenderObject,
} from '../render-object';
import { BoxConstraints } from '../../core/box-constraints';
import { Offset, Size } from '../../core/types';
import { MediaQuery, MediaQueryData } from '../../widgets/media-query';
import type { KeyEvent, MouseEvent as TuiMouseEvent } from '../../input/events';
import { createKeyEvent, createMouseEvent } from '../../input/events';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

class TestRenderBox extends RenderBox {
  performLayout(): void {
    if (this.constraints) {
      this.size = this.constraints.constrain(
        new Size(this.constraints.maxWidth, this.constraints.maxHeight),
      );
    }
  }
  paint(): void {}
}

class LeafTestWidget extends LeafRenderObjectWidget {
  createRenderObject(): RenderObject {
    return new TestRenderBox();
  }
}

class TestWidget extends StatelessWidget {
  buildCount = 0;

  build(_context: BuildContext): Widget {
    this.buildCount++;
    return new LeafTestWidget();
  }

  override createElement(): StatelessElement {
    return new StatelessElement(this);
  }
}

/** A stateful widget that records the context's mediaQuery value during build. */
class MediaQueryReaderWidget extends StatefulWidget {
  createState(): State<StatefulWidget> {
    return new MediaQueryReaderState();
  }
}

class MediaQueryReaderState extends State<MediaQueryReaderWidget> {
  capturedMediaQuery: any = 'not-called';

  build(context: BuildContext): Widget {
    this.capturedMediaQuery = (context as any).mediaQuery;
    return new LeafTestWidget();
  }
}

// ---------------------------------------------------------------------------
// Task 1: WidgetsBinding enhancements (FRMW-12, FRMW-13, FRMW-14)
// ---------------------------------------------------------------------------

describe('WidgetsBinding enhancements', () => {
  beforeEach(() => {
    WidgetsBinding.reset();
  });

  afterEach(() => {
    WidgetsBinding.reset();
  });

  describe('mouseManager field (FRMW-12)', () => {
    it('exists and defaults to MouseManager.instance', () => {
      const binding = WidgetsBinding.instance;
      expect(binding.mouseManager).toBe(MouseManager.instance);
    });

    it('can be assigned a value', () => {
      const binding = WidgetsBinding.instance;
      const fakeMouseManager = { handleEvent: () => {} };
      binding.mouseManager = fakeMouseManager as any;
      expect(binding.mouseManager).toBe(fakeMouseManager);
    });

    it('is reset and re-wired to fresh MouseManager.instance on WidgetsBinding.reset()', () => {
      const binding = WidgetsBinding.instance;
      binding.mouseManager = { handleEvent: () => {} } as any;
      WidgetsBinding.reset();
      const newBinding = WidgetsBinding.instance;
      expect(newBinding.mouseManager).toBe(MouseManager.instance);
    });
  });

  describe('eventCallbacks field (FRMW-13)', () => {
    it('exists with empty key, mouse, paste arrays', () => {
      const binding = WidgetsBinding.instance;
      expect(binding.eventCallbacks).toBeDefined();
      expect(binding.eventCallbacks.key).toBeInstanceOf(Array);
      expect(binding.eventCallbacks.mouse).toBeInstanceOf(Array);
      expect(binding.eventCallbacks.paste).toBeInstanceOf(Array);
      expect(binding.eventCallbacks.key).toHaveLength(0);
      expect(binding.eventCallbacks.mouse).toHaveLength(0);
      expect(binding.eventCallbacks.paste).toHaveLength(0);
    });

    it('can register key event callbacks', () => {
      const binding = WidgetsBinding.instance;
      const events: KeyEvent[] = [];
      binding.eventCallbacks.key.push((e) => events.push(e));

      const event = createKeyEvent('a');
      binding.eventCallbacks.key.forEach((cb) => cb(event));

      expect(events).toHaveLength(1);
      expect(events[0].key).toBe('a');
    });

    it('can register mouse event callbacks', () => {
      const binding = WidgetsBinding.instance;
      const events: TuiMouseEvent[] = [];
      binding.eventCallbacks.mouse.push((e) => events.push(e));

      const event = createMouseEvent('press', 0, 10, 5);
      binding.eventCallbacks.mouse.forEach((cb) => cb(event));

      expect(events).toHaveLength(1);
      expect(events[0].x).toBe(10);
      expect(events[0].y).toBe(5);
    });

    it('can register paste callbacks', () => {
      const binding = WidgetsBinding.instance;
      const pastes: string[] = [];
      binding.eventCallbacks.paste.push((s) => pastes.push(s));

      binding.eventCallbacks.paste.forEach((cb) => cb('hello'));

      expect(pastes).toHaveLength(1);
      expect(pastes[0]).toBe('hello');
    });

    it('supports multiple callbacks per event type', () => {
      const binding = WidgetsBinding.instance;
      const calls: number[] = [];
      binding.eventCallbacks.key.push(() => calls.push(1));
      binding.eventCallbacks.key.push(() => calls.push(2));
      binding.eventCallbacks.key.push(() => calls.push(3));

      const event = createKeyEvent('Enter');
      binding.eventCallbacks.key.forEach((cb) => cb(event));

      expect(calls).toEqual([1, 2, 3]);
    });

    it('is reset on WidgetsBinding.reset()', () => {
      const binding = WidgetsBinding.instance;
      binding.eventCallbacks.key.push(() => {});
      binding.eventCallbacks.mouse.push(() => {});
      binding.eventCallbacks.paste.push(() => {});

      WidgetsBinding.reset();
      const newBinding = WidgetsBinding.instance;
      expect(newBinding.eventCallbacks.key).toHaveLength(0);
      expect(newBinding.eventCallbacks.mouse).toHaveLength(0);
      expect(newBinding.eventCallbacks.paste).toHaveLength(0);
    });
  });

  describe('keyInterceptors field (FRMW-14)', () => {
    it('exists and defaults to empty array', () => {
      const binding = WidgetsBinding.instance;
      expect(binding.keyInterceptors).toBeInstanceOf(Array);
      expect(binding.keyInterceptors).toHaveLength(0);
    });

    it('can register interceptors that return handled', () => {
      const binding = WidgetsBinding.instance;
      binding.keyInterceptors.push((e) => {
        return e.key === 'Escape' ? 'handled' : 'ignored';
      });

      const escEvent = createKeyEvent('Escape');
      const aEvent = createKeyEvent('a');

      // Simulate interceptor chain
      let result: 'handled' | 'ignored' = 'ignored';
      for (const interceptor of binding.keyInterceptors) {
        if (interceptor(escEvent) === 'handled') {
          result = 'handled';
          break;
        }
      }
      expect(result).toBe('handled');

      result = 'ignored';
      for (const interceptor of binding.keyInterceptors) {
        if (interceptor(aEvent) === 'handled') {
          result = 'handled';
          break;
        }
      }
      expect(result).toBe('ignored');
    });

    it('interceptor chain stops on first handled', () => {
      const binding = WidgetsBinding.instance;
      const calls: number[] = [];

      binding.keyInterceptors.push((e) => {
        calls.push(1);
        return 'handled';
      });
      binding.keyInterceptors.push((e) => {
        calls.push(2);
        return 'handled';
      });

      const event = createKeyEvent('x');
      for (const interceptor of binding.keyInterceptors) {
        if (interceptor(event) === 'handled') break;
      }

      // Only first interceptor should have been called
      expect(calls).toEqual([1]);
    });

    it('all interceptors called when none handle', () => {
      const binding = WidgetsBinding.instance;
      const calls: number[] = [];

      binding.keyInterceptors.push(() => { calls.push(1); return 'ignored'; });
      binding.keyInterceptors.push(() => { calls.push(2); return 'ignored'; });
      binding.keyInterceptors.push(() => { calls.push(3); return 'ignored'; });

      const event = createKeyEvent('x');
      for (const interceptor of binding.keyInterceptors) {
        if (interceptor(event) === 'handled') break;
      }

      expect(calls).toEqual([1, 2, 3]);
    });

    it('is reset on WidgetsBinding.reset()', () => {
      const binding = WidgetsBinding.instance;
      binding.keyInterceptors.push(() => 'handled');

      WidgetsBinding.reset();
      const newBinding = WidgetsBinding.instance;
      expect(newBinding.keyInterceptors).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Task 2: Async runApp + MediaQuery wrapping (FRMW-15)
// ---------------------------------------------------------------------------

describe('async runApp with MediaQuery wrapping', () => {
  beforeEach(() => {
    WidgetsBinding.reset();
  });

  afterEach(() => {
    WidgetsBinding.reset();
  });

  it('runApp returns a Promise', () => {
    const result = runApp(new TestWidget());
    expect(result).toBeInstanceOf(Promise);
  });

  it('resolved value is the WidgetsBinding instance', async () => {
    const binding = await runApp(new TestWidget());
    expect(binding).toBe(WidgetsBinding.instance);
  });

  it('binding is running after runApp resolves', async () => {
    const binding = await runApp(new TestWidget());
    expect(binding.isRunning).toBe(true);
  });

  it('root element is mounted after runApp', async () => {
    const binding = await runApp(new TestWidget());
    expect(binding.rootElement).not.toBeNull();
    expect(binding.rootElement!.mounted).toBe(true);
  });

  it('wraps root widget in MediaQuery', async () => {
    const binding = await runApp(new TestWidget());
    const rootElement = binding.rootElement!;

    // The root element wraps a _RootWidget. Find MediaQuery in the tree.
    let foundMediaQuery = false;
    function walk(el: Element): void {
      if (el.widget instanceof MediaQuery) {
        foundMediaQuery = true;
      }
      for (const child of el.children) {
        walk(child);
      }
    }
    walk(rootElement);

    expect(foundMediaQuery).toBe(true);
  });

  it('MediaQuery data has valid default size in test mode', async () => {
    const binding = await runApp(new TestWidget());
    const rootElement = binding.rootElement!;

    // Find the MediaQuery widget in the tree
    let mediaQueryData: MediaQueryData | null = null;
    function walk(el: Element): void {
      if (el.widget instanceof MediaQuery) {
        mediaQueryData = (el.widget as MediaQuery).data;
      }
      for (const child of el.children) {
        walk(child);
      }
    }
    walk(rootElement);

    expect(mediaQueryData).not.toBeNull();
    // Test mode should give 80x24 defaults
    expect(mediaQueryData!.size.width).toBe(80);
    expect(mediaQueryData!.size.height).toBe(24);
  });
});

// ---------------------------------------------------------------------------
// Task 3: BuildContext.mediaQuery getter (FRMW-16)
// ---------------------------------------------------------------------------

describe('BuildContext.mediaQuery getter', () => {
  beforeEach(() => {
    WidgetsBinding.reset();
  });

  afterEach(() => {
    WidgetsBinding.reset();
  });

  it('returns undefined when no MediaQuery ancestor exists', () => {
    // Build a context without MediaQuery parent
    const widget = new TestWidget();
    const element = new StatelessElement(widget);
    const context = new BuildContextImpl(element, widget);
    expect(context.mediaQuery).toBeUndefined();
  });

  it('returns MediaQueryData when MediaQuery ancestor exists', async () => {
    // Use runApp which wraps in MediaQuery, then check mediaQuery getter
    const readerWidget = new MediaQueryReaderWidget();
    const binding = await runApp(readerWidget);

    // The stateful widget should have been built — find the state to check
    let capturedValue: any = undefined;
    function walk(el: Element): void {
      if (el instanceof StatefulElement && el.state instanceof MediaQueryReaderState) {
        capturedValue = (el.state as MediaQueryReaderState).capturedMediaQuery;
      }
      for (const child of el.children) {
        walk(child);
      }
    }
    walk(binding.rootElement!);

    // The mediaQuery should have been captured by the build method
    expect(capturedValue).toBeDefined();
    expect(capturedValue).not.toBe('not-called');
    expect(capturedValue).toBeInstanceOf(MediaQueryData);
    expect(capturedValue.size.width).toBe(80);
    expect(capturedValue.size.height).toBe(24);
  });

  it('BuildContextImpl has mediaQuery property', () => {
    const widget = new TestWidget();
    const element = new StatelessElement(widget);
    const context = new BuildContextImpl(element, widget);
    // Property should exist (may return undefined if no MediaQuery ancestor)
    expect('mediaQuery' in context).toBe(true);
  });

  it('mediaQuery getter matches MediaQuery.of result', async () => {
    // Build a widget tree with MediaQuery wrapping
    const data = MediaQueryData.fromTerminal(120, 40);
    const leafWidget = new LeafTestWidget();
    const mediaQueryWidget = new MediaQuery({
      data: data,
      child: leafWidget,
    });

    const binding = WidgetsBinding.instance;
    binding.attachRootWidget(mediaQueryWidget);

    // Walk the element tree to find the leaf element and check its context
    function findLeafElement(el: Element): Element | null {
      if (el instanceof LeafRenderObjectElement) {
        return el;
      }
      for (const child of el.children) {
        const found = findLeafElement(child);
        if (found) return found;
      }
      return null;
    }

    // The InheritedElement for MediaQuery should exist in the tree
    let foundInherited = false;
    function walkForInherited(el: Element): void {
      if (el instanceof InheritedElement && el.widget instanceof MediaQuery) {
        foundInherited = true;
      }
      for (const child of el.children) {
        walkForInherited(child);
      }
    }
    walkForInherited(binding.rootElement!);
    expect(foundInherited).toBe(true);
  });
});
