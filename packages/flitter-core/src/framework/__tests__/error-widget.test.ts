// Tests for ErrorWidget (Gap F05): LeafRenderObjectWidget with RenderErrorBox,
// and build error -> ErrorWidget substitution in StatelessElement and StatefulElement.
// Gap ref: .gap/05-error-widget.md

import { describe, it, expect, afterEach } from 'bun:test';
import { ErrorWidget, RenderErrorBox, type FlutterErrorDetails } from '../error-widget';
import { Widget, StatelessWidget, StatefulWidget, State, type BuildContext } from '../widget';
import {
  StatelessElement,
  StatefulElement,
  LeafRenderObjectElement,
  Element,
} from '../element';
import {
  LeafRenderObjectWidget,
  RenderBox,
  type RenderObject,
} from '../render-object';
import { BoxConstraints } from '../../core/box-constraints';
import { Offset, Size } from '../../core/types';
import { Color } from '../../core/color';
import { Key } from '../../core/key';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** A minimal render box for testing. */
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

/** A leaf widget that creates a render object -- terminates the tree. */
class LeafTestWidget extends LeafRenderObjectWidget {
  createRenderObject(): RenderObject {
    return new TestRenderBox();
  }
}

/** Absolute leaf -- a Widget with a simple Element that mounts itself. */
class TestTerminalLeaf extends Widget {
  readonly text: string;
  constructor(opts?: { key?: Key; text?: string }) {
    super({ key: opts?.key });
    this.text = opts?.text ?? 'terminal';
  }
  createElement(): any {
    return new SimpleLeafElement(this);
  }
}

class SimpleLeafElement extends Element {
  constructor(widget: Widget) {
    super(widget);
  }
  mount(): void {
    this.markMounted();
  }
  override unmount(): void {
    super.unmount();
  }
}

// ---------------------------------------------------------------------------
// ErrorWidget construction tests
// ---------------------------------------------------------------------------

describe('ErrorWidget', () => {
  describe('construction', () => {
    it('stores message and error', () => {
      const err = new Error('test error');
      const widget = new ErrorWidget({ message: 'test', error: err });
      expect(widget.message).toBe('test');
      expect(widget.error).toBe(err);
    });

    it('creates from Error via static factory', () => {
      const err = new Error('something broke');
      const widget = ErrorWidget.fromError(err);
      expect(widget.message).toBe('something broke');
      expect(widget.error).toBe(err);
    });

    it('works without an error', () => {
      const widget = new ErrorWidget({ message: 'no error object' });
      expect(widget.message).toBe('no error object');
      expect(widget.error).toBeUndefined();
    });
  });

  describe('createElement', () => {
    it('creates a LeafRenderObjectElement', () => {
      const widget = new ErrorWidget({ message: 'test' });
      const element = widget.createElement();
      expect(element).toBeInstanceOf(LeafRenderObjectElement);
    });
  });

  describe('createRenderObject', () => {
    it('creates a RenderErrorBox with the message', () => {
      const widget = new ErrorWidget({ message: 'test error' });
      const renderObj = widget.createRenderObject();
      expect(renderObj).toBeInstanceOf(RenderErrorBox);
      expect(renderObj.message).toBe('test error');
    });
  });

  describe('updateRenderObject', () => {
    it('updates the message on the RenderErrorBox', () => {
      const widget = new ErrorWidget({ message: 'new message' });
      const renderObj = new RenderErrorBox('old message');
      widget.updateRenderObject(renderObj);
      expect(renderObj.message).toBe('new message');
    });
  });

  describe('ErrorWidget.builder', () => {
    // Save and restore the default builder around each test
    const originalBuilder = ErrorWidget.builder;
    afterEach(() => {
      ErrorWidget.builder = originalBuilder;
    });

    it('default builder creates an ErrorWidget', () => {
      const result = ErrorWidget.builder({
        exception: new Error('test'),
        message: 'test error',
      });
      expect(result).toBeInstanceOf(ErrorWidget);
      expect((result as ErrorWidget).message).toBe('test error');
    });

    it('default builder stores Error as error property', () => {
      const err = new Error('typed error');
      const result = ErrorWidget.builder({
        exception: err,
        message: 'typed error',
      });
      expect((result as ErrorWidget).error).toBe(err);
    });

    it('default builder handles non-Error exception', () => {
      const result = ErrorWidget.builder({
        exception: 'string error',
        message: 'string error',
      });
      expect((result as ErrorWidget).error).toBeUndefined();
    });

    it('can be overridden with a custom builder', () => {
      let calledWith: FlutterErrorDetails | undefined;
      ErrorWidget.builder = (details) => {
        calledWith = details;
        return new ErrorWidget({ message: 'custom: ' + details.message });
      };

      const result = ErrorWidget.builder({
        exception: new Error('oops'),
        message: 'oops',
        widgetType: 'MyWidget',
      });

      expect(calledWith!.widgetType).toBe('MyWidget');
      expect((result as ErrorWidget).message).toBe('custom: oops');
    });
  });
});

// ---------------------------------------------------------------------------
// RenderErrorBox tests
// ---------------------------------------------------------------------------

describe('RenderErrorBox', () => {
  it('stores and retrieves message', () => {
    const box = new RenderErrorBox('error msg');
    expect(box.message).toBe('error msg');
  });

  it('updates message via setter', () => {
    const box = new RenderErrorBox('old');
    box.message = 'new';
    expect(box.message).toBe('new');
  });

  it('setter is a no-op for the same value', () => {
    const box = new RenderErrorBox('same');
    // Access internals to verify no unnecessary markNeedsLayout
    box.message = 'same';
    expect(box.message).toBe('same');
  });

  it('performLayout produces size with height 1 (constrained)', () => {
    const box = new RenderErrorBox('test');
    // Use constraints that allow height=1 (maxWidth=40, height range 0-10)
    box.layout(new BoxConstraints({
      minWidth: 40, maxWidth: 40,
      minHeight: 0, maxHeight: 10,
    }));
    expect(box.size.height).toBe(1);
    expect(box.size.width).toBe(40);
  });

  it('performLayout handles unconstrained width', () => {
    const box = new RenderErrorBox('short');
    box.layout(new BoxConstraints({
      minWidth: 0, maxWidth: Infinity,
      minHeight: 0, maxHeight: 10,
    }));
    expect(box.size.height).toBe(1);
    // "[!] " prefix (4 chars) + "short" (5 chars) = 9 chars, capped at 80
    expect(box.size.width).toBe(9);
    expect(box.size.width).toBeLessThanOrEqual(80);
  });

  it('performLayout caps at 80 for long messages with unconstrained width', () => {
    const longMsg = 'A'.repeat(200);
    const box = new RenderErrorBox(longMsg);
    box.layout(new BoxConstraints({
      minWidth: 0, maxWidth: Infinity,
      minHeight: 0, maxHeight: 10,
    }));
    expect(box.size.width).toBe(80);
  });
});

// ---------------------------------------------------------------------------
// RenderErrorBox paint tests
// ---------------------------------------------------------------------------

describe('RenderErrorBox paint', () => {
  it('paints error message with red background and white foreground', () => {
    const box = new RenderErrorBox('test error');
    box.layout(BoxConstraints.tight(new Size(20, 1)));

    const painted: { col: number; row: number; char: string; style: any }[] = [];
    const mockContext = {
      drawChar(col: number, row: number, char: string, style: any) {
        painted.push({ col, row, char, style });
      },
    };

    box.paint(mockContext as any, new Offset(0, 0));

    // Should have painted 20 characters (full width)
    expect(painted.length).toBe(20);

    // First characters should be "[!] test error"
    const text = painted.map(p => p.char).join('');
    expect(text.startsWith('[!] test error')).toBe(true);

    // Remaining characters should be spaces
    for (let i = 14; i < 20; i++) {
      expect(painted[i]!.char).toBe(' ');
    }

    // All styles should have red background and white foreground
    for (const p of painted) {
      expect(p.style.background).toBe(Color.red);
      expect(p.style.foreground).toBe(Color.white);
      expect(p.style.bold).toBe(true);
    }
  });

  it('paints at the given offset', () => {
    const box = new RenderErrorBox('X');
    box.layout(BoxConstraints.tight(new Size(5, 1)));

    const painted: { col: number; row: number }[] = [];
    const mockContext = {
      drawChar(col: number, row: number, _char: string, _style: any) {
        painted.push({ col, row });
      },
    };

    box.paint(mockContext as any, new Offset(10, 5));

    expect(painted[0]!.col).toBe(10);
    expect(painted[0]!.row).toBe(5);
  });

  it('does nothing if context has no drawChar', () => {
    const box = new RenderErrorBox('test');
    box.layout(BoxConstraints.tight(new Size(10, 1)));

    // Should not throw
    box.paint({} as any, new Offset(0, 0));
  });
});

// ---------------------------------------------------------------------------
// Build error -> ErrorWidget substitution (integration tests)
// ---------------------------------------------------------------------------

describe('Build error -> ErrorWidget substitution', () => {
  const originalBuilder = ErrorWidget.builder;
  afterEach(() => {
    ErrorWidget.builder = originalBuilder;
  });

  it('StatelessElement substitutes ErrorWidget when build() throws', () => {
    class FailingWidget extends StatelessWidget {
      build(_context: BuildContext): Widget {
        throw new Error('intentional build failure');
      }
    }

    const widget = new FailingWidget();
    const element = widget.createElement() as StatelessElement;

    // Should not throw -- error is caught internally
    expect(() => element.mount()).not.toThrow();

    // The child should be an ErrorWidget element
    expect(element.child).toBeDefined();
    expect(element.child!.widget).toBeInstanceOf(ErrorWidget);
    expect((element.child!.widget as ErrorWidget).message)
      .toBe('intentional build failure');
  });

  it('StatefulElement substitutes ErrorWidget when build() throws', () => {
    class FailingState extends State<FailingStatefulWidget> {
      build(_context: BuildContext): Widget {
        throw new Error('state build failure');
      }
    }

    class FailingStatefulWidget extends StatefulWidget {
      createState(): FailingState {
        return new FailingState();
      }
    }

    const widget = new FailingStatefulWidget();
    const element = widget.createElement() as StatefulElement;

    expect(() => element.mount()).not.toThrow();
    expect(element.child).toBeDefined();
    expect(element.child!.widget).toBeInstanceOf(ErrorWidget);
    expect((element.child!.widget as ErrorWidget).message)
      .toBe('state build failure');
  });

  it('ErrorWidget.builder customization is used during build error', () => {
    ErrorWidget.builder = (details) => {
      return new ErrorWidget({
        message: `CUSTOM: ${details.widgetType}: ${details.message}`,
      });
    };

    class BrokenWidget extends StatelessWidget {
      build(_context: BuildContext): Widget {
        throw new Error('boom');
      }
    }

    const element = new BrokenWidget().createElement() as StatelessElement;
    element.mount();

    const errorWidget = element.child!.widget as ErrorWidget;
    expect(errorWidget.message).toContain('CUSTOM:');
    expect(errorWidget.message).toContain('BrokenWidget');
    expect(errorWidget.message).toContain('boom');
  });

  it('handles non-Error exceptions', () => {
    class StringThrowWidget extends StatelessWidget {
      build(_context: BuildContext): Widget {
        throw 'string error value';
      }
    }

    const element = new StringThrowWidget().createElement() as StatelessElement;
    element.mount();

    expect(element.child).toBeDefined();
    expect(element.child!.widget).toBeInstanceOf(ErrorWidget);
    expect((element.child!.widget as ErrorWidget).message)
      .toBe('string error value');
  });

  it('ErrorWidget child has a render object (RenderErrorBox)', () => {
    class FailingWidget extends StatelessWidget {
      build(_context: BuildContext): Widget {
        throw new Error('render object test');
      }
    }

    const element = new FailingWidget().createElement() as StatelessElement;
    element.mount();

    // The child is a LeafRenderObjectElement which creates a RenderErrorBox
    const child = element.child!;
    expect(child).toBeInstanceOf(LeafRenderObjectElement);
    expect(child.renderObject).toBeInstanceOf(RenderErrorBox);
    expect((child.renderObject as RenderErrorBox).message).toBe('render object test');
  });

  it('recovers when the error condition is fixed (StatelessElement)', () => {
    let shouldFail = true;
    const leaf = new TestTerminalLeaf({ text: 'success' });

    class ConditionalWidget extends StatelessWidget {
      build(_context: BuildContext): Widget {
        if (shouldFail) {
          throw new Error('conditional failure');
        }
        return leaf;
      }
    }

    const widget = new ConditionalWidget();
    const element = widget.createElement() as StatelessElement;
    element.mount();

    // First build: error -> ErrorWidget
    expect(element.child!.widget).toBeInstanceOf(ErrorWidget);

    // Fix the condition and rebuild
    shouldFail = false;
    element.rebuild();

    // Should now have the leaf, not an ErrorWidget
    expect(element.child!.widget).toBe(leaf);
    expect(element.child!.widget).not.toBeInstanceOf(ErrorWidget);
  });

  it('recovers when the error condition is fixed (StatefulElement)', () => {
    let shouldFail = true;
    const leaf = new TestTerminalLeaf({ text: 'success' });

    class ConditionalState extends State<ConditionalStatefulWidget> {
      build(_context: BuildContext): Widget {
        if (shouldFail) {
          throw new Error('conditional stateful failure');
        }
        return leaf;
      }
    }

    class ConditionalStatefulWidget extends StatefulWidget {
      createState(): ConditionalState {
        return new ConditionalState();
      }
    }

    const widget = new ConditionalStatefulWidget();
    const element = widget.createElement() as StatefulElement;
    element.mount();

    // First build: error -> ErrorWidget
    expect(element.child!.widget).toBeInstanceOf(ErrorWidget);

    // Fix the condition and rebuild
    shouldFail = false;
    element.rebuild();

    // Should now have the leaf, not an ErrorWidget
    expect(element.child!.widget).toBe(leaf);
  });

  it('replaces stale child with ErrorWidget on rebuild failure', () => {
    let shouldFail = false;
    const leaf = new TestTerminalLeaf({ text: 'initial' });

    class ToggleWidget extends StatelessWidget {
      build(_context: BuildContext): Widget {
        if (shouldFail) {
          throw new Error('later failure');
        }
        return leaf;
      }
    }

    const element = new ToggleWidget().createElement() as StatelessElement;
    element.mount();

    // First build succeeds
    expect(element.child!.widget).toBe(leaf);

    // Now make it fail on rebuild
    shouldFail = true;
    element.rebuild();

    // Should now have ErrorWidget replacing the old leaf
    expect(element.child!.widget).toBeInstanceOf(ErrorWidget);
    expect((element.child!.widget as ErrorWidget).message).toBe('later failure');
  });
});
