# Gap F05: No `ErrorWidget` Fallback for Build-Time Errors

## 1. Problem Statement

When a widget's `build()` method throws an exception during the element tree build phase, the error is caught and logged in `BuildOwner.buildScope()`, but **no `ErrorWidget` substitution occurs**. The failed element's dirty flag is cleared (to prevent infinite loops), but the element subtree is left in whatever state it was in prior to the failed rebuild. This can result in:

1. **Stale subtrees**: The old child from a previous successful build remains visible even though it no longer reflects the current state.
2. **Missing subtrees**: If the error occurs during the first build (mount), the element has no child at all -- the subtree is empty, and the parent render object may have a null child slot, leading to layout/paint anomalies.
3. **Silent failures**: The error is logged to `V.error()` but there is no visual indication in the TUI that a build error occurred. Users and developers see a broken UI with no explanation.
4. **Inconsistent element tree state**: Half-completed child replacements (where the old child was unmounted but the new one failed to inflate) leave the element tree in a structurally invalid state.

### Current Error Handling Behavior

#### In `BuildOwner.buildScope()` (`build-owner.ts:128-138`)

```typescript
for (const element of elements) {
  if (element.dirty) {
    try {
      element.performRebuild();
      element._dirty = false;
      rebuiltCount++;
    } catch (_error) {
      // Amp ref: catch (a) { V.error(...); s._dirty = !1; }
      // Clear dirty even on error to prevent infinite loops
      element._dirty = false;
    }
  }
}
```

The catch block clears `_dirty` but does nothing to the element's child subtree. The error object is discarded (assigned to `_error`).

#### In `StatelessElement.rebuild()` (`element.ts:263-293`)

```typescript
rebuild(): void {
  if (!this._context) {
    throw new Error('Cannot rebuild unmounted element');
  }
  const newWidget = this.statelessWidget.build(this._context); // <-- THROWS HERE
  // ... child diffing logic follows, never reached on error
}
```

If `build()` throws, the exception propagates up to `BuildOwner.buildScope()`. The child diffing logic never executes. If this was a first build, `this._child` remains `undefined`. If this was a rebuild, `this._child` retains the stale child from the last successful build.

#### In `StatefulElement.rebuild()` (`element.ts:375-398`)

The same pattern applies: `this._state.build(this._context)` can throw, leaving `this._child` in its previous state.

#### The Existing `ErrorWidget` (`error-widget.ts`)

A skeleton `ErrorWidget` class already exists:

```typescript
export class ErrorWidget extends StatelessWidget {
  readonly message: string;
  readonly error?: Error;

  build(_context: BuildContext): Widget {
    return this; // Returns self -- acts as leaf for now.
  }
}
```

This widget is **never instantiated by the framework**. It exists as a placeholder. Its `build()` method returns `this` (a self-referential leaf pattern), which means it produces no render object and therefore has no visual presence in the terminal. It also extends `StatelessWidget` rather than `LeafRenderObjectWidget`, so it cannot paint anything.

---

## 2. Proposed Solution

### 2.1 Architecture Overview

The solution has four components:

1. **`ErrorWidget`** -- Rewrite as a `LeafRenderObjectWidget` that renders a visible error indicator in the terminal.
2. **`RenderErrorBox`** -- A `RenderBox` that paints a red error message with a distinctive visual style.
3. **Build error interception** -- Modify `StatelessElement.rebuild()` and `StatefulElement.rebuild()` to catch `build()` exceptions and substitute an `ErrorWidget`.
4. **`ErrorWidget.builder` static hook** -- A customizable factory that allows application code to override the default error presentation.

### 2.2 `ErrorWidget` Rewrite

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/framework/error-widget.ts`

```typescript
// ErrorWidget -- displayed when a build fails
// Amp ref: Error handling in buildScopes() -- catches errors, logs, continues
// In Flutter, ErrorWidget replaces a failed subtree to show error info.

import { Key } from '../core/key';
import { Color } from '../core/color';
import { TextStyle } from '../core/text-style';
import { TextSpan } from '../core/text-span';
import { Offset, Size } from '../core/types';
import { BoxConstraints } from '../core/box-constraints';
import { LeafRenderObjectWidget, RenderBox, PaintContext } from './render-object';
import { Widget } from './widget';

// ---------------------------------------------------------------------------
// RenderErrorBox -- renders a visible error indicator
// ---------------------------------------------------------------------------

export class RenderErrorBox extends RenderBox {
  private _message: string;

  constructor(message: string) {
    super();
    this._message = message;
  }

  get message(): string {
    return this._message;
  }

  set message(value: string) {
    if (this._message === value) return;
    this._message = value;
    this.markNeedsLayout();
  }

  // Layout: takes 1 row of height, fills available width.
  // If message is longer than available width, truncates with ellipsis.
  performLayout(): void {
    const constraints = this.constraints!;
    // Error indicator takes exactly 1 row, full available width
    const width = constraints.maxWidth === Infinity
      ? Math.min(this._message.length + 4, 80) // "[!] " prefix + message
      : constraints.maxWidth;
    const height = constraints.constrainHeight(1);
    this.size = new Size(width, height);
  }

  // Paint: red background with white bold text "[!] <message>"
  paint(context: PaintContext, offset: Offset): void {
    const ctx = context as any;
    if (!ctx.drawChar) return;

    const errorStyle: any = {
      foreground: Color.white,
      background: Color.red,
      bold: true,
    };

    const prefix = '[!] ';
    const availWidth = this.size.width;
    const fullText = prefix + this._message;

    for (let col = 0; col < availWidth; col++) {
      const ch = col < fullText.length ? fullText[col]! : ' ';
      ctx.drawChar(offset.col + col, offset.row, ch, errorStyle);
    }
  }
}

// ---------------------------------------------------------------------------
// ErrorWidget
// ---------------------------------------------------------------------------

export type ErrorWidgetBuilder = (details: FlutterErrorDetails) => Widget;

export interface FlutterErrorDetails {
  exception: unknown;
  message: string;
  stack?: string;
  widgetType?: string;
  context?: string;
}

export class ErrorWidget extends LeafRenderObjectWidget {
  readonly message: string;
  readonly error?: Error;

  /**
   * Customizable builder. Applications can override this to provide
   * their own error display widget. Default creates an ErrorWidget.
   *
   * In Flutter: ErrorWidget.builder
   */
  static builder: ErrorWidgetBuilder = (details: FlutterErrorDetails) => {
    return new ErrorWidget({
      message: details.message,
      error: details.exception instanceof Error ? details.exception : undefined,
    });
  };

  constructor(opts: { message: string; error?: Error; key?: Key }) {
    super(opts.key !== undefined ? { key: opts.key } : undefined);
    this.message = opts.message;
    this.error = opts.error;
  }

  /** Factory: create ErrorWidget from an error */
  static fromError(error: Error): ErrorWidget {
    return new ErrorWidget({ message: error.message, error });
  }

  createRenderObject(): RenderErrorBox {
    return new RenderErrorBox(this.message);
  }

  updateRenderObject(renderObject: RenderErrorBox): void {
    renderObject.message = this.message;
  }
}
```

### Key design decisions:

- **`LeafRenderObjectWidget`** instead of `StatelessWidget`: This gives `ErrorWidget` its own `RenderErrorBox` render object, which can paint visible error text into the terminal's screen buffer. The current `StatelessWidget`-based implementation returns `this` from `build()`, creating a leaf element with no render object -- invisible.
- **`RenderErrorBox`**: A minimal `RenderBox` that takes 1 row of terminal height and paints `[!] <error message>` with a red background and white bold foreground. This is immediately recognizable as an error.
- **`ErrorWidget.builder` static hook**: Matches Flutter's `ErrorWidget.builder` pattern. Applications can override the default error presentation. For example, a development mode could show a multi-line stack trace, while production mode shows a minimal indicator.
- **`FlutterErrorDetails` interface**: A structured error report that includes the exception, a human-readable message, optional stack trace, and the failing widget's type name. This is passed to the `builder` function.

### 2.3 Build Error Interception in Component Elements

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/framework/element.ts`

The `rebuild()` methods of both `StatelessElement` and `StatefulElement` must be wrapped in try/catch blocks that substitute `ErrorWidget` on failure.

#### `StatelessElement.rebuild()` -- proposed change:

```typescript
rebuild(): void {
  if (!this._context) {
    throw new Error('Cannot rebuild unmounted element');
  }

  let newWidget: Widget;
  try {
    newWidget = this.statelessWidget.build(this._context);
  } catch (error) {
    // Build failed -- substitute an ErrorWidget
    const errorDetails: FlutterErrorDetails = {
      exception: error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      widgetType: this.widget.constructor.name,
      context: 'building ' + this.widget.toString(),
    };

    // Log the error (matching Amp's V.error pattern)
    console.error('Build error in', this.widget.constructor.name + ':', errorDetails.message);
    if (errorDetails.stack) {
      console.error(errorDetails.stack);
    }

    // Use the customizable builder to create an error widget
    newWidget = ErrorWidget.builder(errorDetails);
  }

  // Self-referential build: widget.build() returned itself.
  if (newWidget === this.widget) {
    return;
  }

  if (this._child) {
    if (this._child.widget === newWidget) return;
    if (this._child.widget.canUpdate(newWidget)) {
      this._child.update(newWidget);
    } else {
      this._child.unmount();
      this.removeChild(this._child);
      this._child = newWidget.createElement();
      this.addChild(this._child);
      this._mountChild(this._child);
    }
  } else {
    this._child = newWidget.createElement();
    this.addChild(this._child);
    this._mountChild(this._child);
  }
}
```

#### `StatefulElement.rebuild()` -- proposed change:

```typescript
rebuild(): void {
  if (!this._context || !this._state) {
    throw new Error('Cannot rebuild unmounted element');
  }

  let newWidget: Widget;
  try {
    newWidget = this._state.build(this._context);
  } catch (error) {
    const errorDetails: FlutterErrorDetails = {
      exception: error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      widgetType: this.widget.constructor.name,
      context: 'building ' + this.widget.toString(),
    };

    console.error('Build error in', this.widget.constructor.name + ':', errorDetails.message);
    if (errorDetails.stack) {
      console.error(errorDetails.stack);
    }

    newWidget = ErrorWidget.builder(errorDetails);
  }

  if (this._child) {
    if (this._child.widget.canUpdate(newWidget)) {
      this._child.update(newWidget);
    } else {
      this._child.unmount();
      this.removeChild(this._child);
      this._child = newWidget.createElement();
      this.addChild(this._child);
      this._mountChild(this._child);
    }
  } else {
    this._child = newWidget.createElement();
    this.addChild(this._child);
    this._mountChild(this._child);
  }
}
```

### 2.4 Import Considerations

The `ErrorWidget` import in `element.ts` must use a lazy `require()` to avoid circular dependencies, since `error-widget.ts` imports from `widget.ts` which is also imported by `element.ts`. The pattern is already established in the codebase (see how `StatelessElement` is imported in `widget.ts`):

```typescript
// At the top of the rebuild() catch block:
const { ErrorWidget } = require('./error-widget');
```

### 2.5 `BuildOwner.buildScope()` Error Handling Interaction

The current `BuildOwner.buildScope()` catch block remains as a **last-resort safety net**. With the proposed changes, most build errors will be caught inside `StatelessElement.rebuild()` / `StatefulElement.rebuild()` and substituted with `ErrorWidget` before the error propagates up. The `BuildOwner` catch should rarely be reached, but it still serves as protection against errors in the child diffing logic itself (e.g., errors in `canUpdate`, `createElement`, or `mount`).

The `BuildOwner.buildScope()` catch block should be updated to log the full error details (currently it silently discards `_error`):

```typescript
} catch (error) {
  // Amp ref: catch (a) { V.error(...); s._dirty = !1; }
  console.error('Element rebuild error:', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    elementType: element.widget?.constructor?.name,
  });
  element._dirty = false;
}
```

---

## 3. Integration with the Build Pipeline

### 3.1 Build Phase Flow (Before)

```
FrameScheduler.executeFrame()
  -> BuildOwner.buildScope()
    -> for each dirty element (depth-sorted):
       -> element.performRebuild()
         -> StatelessElement.rebuild()
           -> widget.build(context)        // THROWS
           [exception propagates to BuildOwner catch]
           [element._dirty = false]
           [stale/missing subtree remains]
```

### 3.2 Build Phase Flow (After)

```
FrameScheduler.executeFrame()
  -> BuildOwner.buildScope()
    -> for each dirty element (depth-sorted):
       -> element.performRebuild()
         -> StatelessElement.rebuild()
           -> try: widget.build(context)    // THROWS
           -> catch: newWidget = ErrorWidget.builder(details)
           -> child diffing proceeds with ErrorWidget
           -> ErrorWidget.createElement() -> LeafRenderObjectElement
           -> RenderErrorBox created, attached to render tree
    -> Layout phase: RenderErrorBox.performLayout() -> Size(width, 1)
    -> Paint phase: RenderErrorBox.paint() -> "[!] Error message" in red
    -> Render phase: visible error indicator in terminal
```

### 3.3 Error Recovery

When the underlying issue is fixed (e.g., state that caused the build error is corrected via `setState()`), the element will be marked dirty again. On the next rebuild:

1. `widget.build(context)` succeeds, returning the correct widget.
2. The child diffing logic sees that the current child is an `ErrorWidget` element.
3. Since the new widget has a different type than `ErrorWidget`, `canUpdate()` returns `false`.
4. The `ErrorWidget` element is unmounted and replaced with the correct element.
5. The `RenderErrorBox` is detached from the render tree and the correct render object takes its place.

This recovery is automatic and seamless -- no special logic is needed.

### 3.4 First Build vs. Rebuild

- **First build** (during `mount()`): `this._child` is `undefined`. The catch block creates an `ErrorWidget`, which gets inflated as the child. The element enters the tree with a visible error indicator instead of an empty subtree.
- **Rebuild** (during `performRebuild()`): `this._child` holds the previous child. The catch block creates an `ErrorWidget`, which replaces the previous child through the normal child diffing logic. The stale subtree is properly unmounted.

### 3.5 Nested Errors

If `ErrorWidget.builder` itself throws, the error propagates to `BuildOwner.buildScope()`, which catches it and clears the dirty flag. This is the expected behavior for a catastrophic error in the error handling path. The default `ErrorWidget.builder` implementation is trivially simple (just `new ErrorWidget(...)`) and should never throw.

If `RenderErrorBox.performLayout()` or `RenderErrorBox.paint()` throws, the error is caught by the layout/paint error handling in `PipelineOwner` (which already has its own try/catch). The `RenderErrorBox` implementation is deliberately minimal to minimize this risk.

---

## 4. Detailed Implementation Plan

### Step 1: Rewrite `ErrorWidget` as `LeafRenderObjectWidget`

- Replace the contents of `error-widget.ts` with the implementation from Section 2.2.
- Add `RenderErrorBox` class in the same file.
- Add `ErrorWidget.builder` static property.
- Add `FlutterErrorDetails` interface.
- Remove the `StatelessElement` import (no longer needed).
- Add imports for `LeafRenderObjectWidget`, `RenderBox`, `PaintContext`, `Color`, `TextStyle`, `Offset`, `Size`, `BoxConstraints`.

### Step 2: Modify `StatelessElement.rebuild()` to catch build errors

- Wrap the `this.statelessWidget.build(this._context)` call in try/catch.
- In the catch block, construct `FlutterErrorDetails` and call `ErrorWidget.builder()`.
- Use lazy `require('./error-widget')` to avoid circular imports.
- The rest of the method (child diffing) remains unchanged -- it operates on whatever widget was produced (normal or error).

### Step 3: Modify `StatefulElement.rebuild()` to catch build errors

- Same pattern as Step 2, wrapping `this._state.build(this._context)`.

### Step 4: Update `BuildOwner.buildScope()` error logging

- Change `_error` to `error` and add proper logging.
- This catch block is now a last-resort safety net.

### Step 5: Update exports

- Ensure `ErrorWidget`, `RenderErrorBox`, `FlutterErrorDetails`, and `ErrorWidgetBuilder` are exported from the package's public API.

---

## 5. Testing Strategy

### 5.1 Unit Tests for `ErrorWidget`

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/framework/__tests__/error-widget.test.ts`

```typescript
import { describe, it, expect } from 'bun:test';
import { ErrorWidget, RenderErrorBox } from '../error-widget';

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
  });

  describe('createElement', () => {
    it('creates a LeafRenderObjectElement', () => {
      const widget = new ErrorWidget({ message: 'test' });
      const element = widget.createElement();
      expect(element.constructor.name).toBe('LeafRenderObjectElement');
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
    it('default builder creates an ErrorWidget', () => {
      const result = ErrorWidget.builder({
        exception: new Error('test'),
        message: 'test error',
      });
      expect(result).toBeInstanceOf(ErrorWidget);
      expect((result as ErrorWidget).message).toBe('test error');
    });

    it('can be overridden with a custom builder', () => {
      const original = ErrorWidget.builder;
      try {
        let calledWith: any;
        ErrorWidget.builder = (details) => {
          calledWith = details;
          return new ErrorWidget({ message: 'custom: ' + details.message });
        };

        const result = ErrorWidget.builder({
          exception: new Error('oops'),
          message: 'oops',
          widgetType: 'MyWidget',
        });

        expect(calledWith.widgetType).toBe('MyWidget');
        expect((result as ErrorWidget).message).toBe('custom: oops');
      } finally {
        ErrorWidget.builder = original;
      }
    });
  });
});
```

### 5.2 Unit Tests for `RenderErrorBox`

```typescript
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

  it('performLayout produces size with height 1', () => {
    const box = new RenderErrorBox('test');
    box.constraints = BoxConstraints.tight(new Size(40, 10));
    box.performLayout();
    expect(box.size.height).toBe(1);
    expect(box.size.width).toBe(40);
  });

  it('performLayout handles unconstrained width', () => {
    const box = new RenderErrorBox('short');
    box.constraints = new BoxConstraints({
      minWidth: 0, maxWidth: Infinity,
      minHeight: 0, maxHeight: 10,
    });
    box.performLayout();
    expect(box.size.height).toBe(1);
    expect(box.size.width).toBeLessThanOrEqual(80);
  });
});
```

### 5.3 Integration Tests for Build Error Substitution

```typescript
describe('Build error -> ErrorWidget substitution', () => {
  it('StatelessElement substitutes ErrorWidget when build() throws', () => {
    class FailingWidget extends StatelessWidget {
      build(_context: BuildContext): Widget {
        throw new Error('intentional build failure');
      }
    }

    const widget = new FailingWidget();
    const element = widget.createElement();

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
    const element = widget.createElement();

    expect(() => element.mount()).not.toThrow();
    expect(element.child).toBeDefined();
    expect(element.child!.widget).toBeInstanceOf(ErrorWidget);
  });

  it('recovers when the error condition is fixed', () => {
    let shouldFail = true;

    class ConditionalWidget extends StatelessWidget {
      build(_context: BuildContext): Widget {
        if (shouldFail) {
          throw new Error('conditional failure');
        }
        return new SizedBox({ width: 10, height: 1 });
      }
    }

    const widget = new ConditionalWidget();
    const element = widget.createElement();
    element.mount();

    // First build: error
    expect(element.child!.widget).toBeInstanceOf(ErrorWidget);

    // Fix the condition and rebuild
    shouldFail = false;
    element._dirty = true;
    element.performRebuild();

    // Should now have a SizedBox, not an ErrorWidget
    expect(element.child!.widget).toBeInstanceOf(SizedBox);
  });

  it('ErrorWidget.builder customization is used', () => {
    const original = ErrorWidget.builder;
    try {
      ErrorWidget.builder = (details) => {
        return new ErrorWidget({
          message: `CUSTOM: ${details.widgetType}: ${details.message}`,
        });
      };

      class BrokenWidget extends StatelessWidget {
        build(): Widget {
          throw new Error('boom');
        }
      }

      const element = new BrokenWidget().createElement();
      element.mount();

      const errorWidget = element.child!.widget as ErrorWidget;
      expect(errorWidget.message).toContain('CUSTOM:');
      expect(errorWidget.message).toContain('BrokenWidget');
      expect(errorWidget.message).toContain('boom');
    } finally {
      ErrorWidget.builder = original;
    }
  });
});
```

### 5.4 Integration Test for BuildOwner Error Handling

```typescript
describe('BuildOwner with ErrorWidget substitution', () => {
  it('buildScope completes without throwing when build() errors occur', () => {
    const owner = new BuildOwner();

    class FailWidget extends StatelessWidget {
      build(): Widget { throw new Error('fail'); }
    }

    const element = new FailWidget().createElement();
    element._mounted = true;
    element._dirty = true;
    owner.scheduleBuildFor(element);

    // buildScope should not throw
    expect(() => owner.buildScope()).not.toThrow();

    // Element should no longer be dirty
    expect(element.dirty).toBe(false);
  });
});
```

### 5.5 Visual/Paint Tests

```typescript
describe('RenderErrorBox paint', () => {
  it('paints error message with red background', () => {
    const box = new RenderErrorBox('test error');
    box.constraints = BoxConstraints.tight(new Size(20, 1));
    box.performLayout();

    const painted: { col: number; row: number; char: string; style: any }[] = [];
    const mockContext = {
      drawChar(col: number, row: number, char: string, style: any) {
        painted.push({ col, row, char, style });
      },
    };

    box.paint(mockContext, new Offset(0, 0));

    // Should have painted 20 characters (full width)
    expect(painted.length).toBe(20);

    // First characters should be "[!] test error"
    const text = painted.map(p => p.char).join('');
    expect(text.startsWith('[!] test error')).toBe(true);

    // Styles should have red background
    for (const p of painted) {
      expect(p.style.background).toBe(Color.red);
      expect(p.style.foreground).toBe(Color.white);
      expect(p.style.bold).toBe(true);
    }
  });
});
```

---

## 6. Amp Fidelity Analysis

The Amp binary's error handling in `NB0.buildScopes()` (reference: `element-tree.md:1301-1313`) catches rebuild errors, logs them with `V.error()`, and clears the dirty flag. Notably, **Amp does not substitute an ErrorWidget either** -- it follows the same "log and clear" pattern currently implemented in flitter.

However, the Amp binary is a production application, not a framework library. For a framework like flitter that will be used by third-party developers to build TUI applications, providing visual error feedback is essential for debuggability. Flutter itself provides `ErrorWidget` substitution for exactly this reason.

The proposed implementation:
- **Preserves** the Amp-faithful `BuildOwner.buildScope()` catch-and-clear behavior as a last-resort safety net.
- **Adds** error interception at the component element level (inside `rebuild()`), which is where Flutter performs its error substitution.
- **Does not change** the fundamental build/layout/paint pipeline order or any existing wiring.

This is documented as a **deliberate deviation** from Amp's behavior, justified by the framework's role as a reusable library. The deviation is minimal and additive -- it catches errors that Amp also catches, but substitutes a visible widget instead of silently dropping the error.

---

## 7. Edge Cases and Considerations

### 7.1 Error in `ErrorWidget.builder`

If the custom `ErrorWidget.builder` throws, the exception propagates to `BuildOwner.buildScope()`, which catches it and clears the dirty flag. The element is left with its previous child (or no child on first build). This is acceptable -- a broken error handler is a developer error, not a framework bug.

### 7.2 Error in `createElement()` or `mount()` of the ErrorWidget

The `ErrorWidget` uses `LeafRenderObjectWidget.createElement()` which creates a `LeafRenderObjectElement`. The `mount()` creates a `RenderErrorBox`. Both are trivially simple and should not throw. If they do, the error propagates to `BuildOwner.buildScope()`.

### 7.3 Infinite Error Loops

An error in `build()` -> `ErrorWidget` substitution -> next rebuild -> error in `build()` -> `ErrorWidget` substitution. This is not an infinite loop because each cycle produces a stable `ErrorWidget` child that does not trigger further rebuilds. The element is only re-dirtied if `setState()` or `markNeedsRebuild()` is called externally.

### 7.4 Thread Safety

Not applicable -- the framework is single-threaded (event loop).

### 7.5 Memory Leaks

The `ErrorWidget` and `RenderErrorBox` are lightweight objects. When the error is fixed and the element rebuilds successfully, the `ErrorWidget` element is unmounted and the `RenderErrorBox` is detached/disposed, releasing all references.

### 7.6 `InheritedElement`

`InheritedElement` does not have a `build()` method -- its child is specified directly on the `InheritedWidget`. Build errors in `InheritedElement` would only arise from `mount()` (inflating the child) or `update()` (updating the child). These errors are already caught by `BuildOwner.buildScope()`. No `ErrorWidget` substitution is needed for `InheritedElement`.

---

## 8. Migration and Backward Compatibility

- The `ErrorWidget` class retains its existing public API (`message`, `error`, `fromError()`).
- The constructor signature is unchanged: `{ message, error?, key? }`.
- The only breaking change is that `ErrorWidget` now extends `LeafRenderObjectWidget` instead of `StatelessWidget`. Code that checks `instanceof StatelessWidget` against an `ErrorWidget` will no longer match. This is unlikely to be a concern since `ErrorWidget` was never previously instantiated by the framework.
- The `ErrorWidget.builder` static property is new and defaults to the original behavior (creating an `ErrorWidget`), so it is backward-compatible.

---

## 9. File Manifest

| File | Change Type | Description |
|------|-------------|-------------|
| `src/framework/error-widget.ts` | **Rewrite** | `ErrorWidget` as `LeafRenderObjectWidget`, add `RenderErrorBox`, `FlutterErrorDetails`, `ErrorWidget.builder` |
| `src/framework/element.ts` | **Modify** | Wrap `build()` calls in `StatelessElement.rebuild()` and `StatefulElement.rebuild()` with try/catch + `ErrorWidget` substitution |
| `src/framework/build-owner.ts` | **Modify** | Update catch block to log full error details (minor) |
| `src/framework/__tests__/error-widget.test.ts` | **New** | Unit tests for `ErrorWidget`, `RenderErrorBox`, build error substitution, recovery, custom builder |
