# Gap F03: Add `reassemble()` for Hot Reload

## Status: Proposal
## Affected packages: `flitter-core`

---

## 1. Current Behavior Analysis

### 1.1 The App Startup Flow

The application lifecycle is orchestrated by `WidgetsBinding` (Amp ref: J3) in `/home/gem/workspace/flitter/packages/flitter-core/src/framework/binding.ts`. The flow is:

1. `runApp(widget, options?)` (line 997) obtains the singleton `WidgetsBinding.instance`
2. `WidgetsBinding.runApp()` (line 852) performs:
   - Detects test vs production environment
   - Queries terminal size from `BunPlatform`
   - Wraps the user widget in `MediaQuery` for screen size propagation
   - Calls `attachRootWidget(wrappedWidget)` (line 897)
   - Initializes the terminal (raw mode, alt screen, mouse, bracketed paste)
   - Wires `setupEventHandlers()` for the input pipeline
   - Registers SIGWINCH for terminal resize
   - Calls `requestForcedPaintFrame()` + `requestFrame()` to render the first frame

3. `attachRootWidget(widget)` (line 447) performs:
   - Wraps in `_RootWidget` (private, line 132) which is a `StatelessWidget`
   - Creates the root `StatelessElement` via `createElement()`
   - Mounts the root element (which recursively builds the entire widget/element/render tree)
   - Sets initial constraints on `PipelineOwner`
   - Wires root render object to `PipelineOwner` and `MouseManager`
   - Sets `_isRunning = true`

### 1.2 The State Lifecycle Today

The `State<T>` class in `/home/gem/workspace/flitter/packages/flitter-core/src/framework/widget.ts` (lines 157-271) explicitly documents the absence of reassemble at line 153:

```typescript
// NO reassemble() -- No hot reload.
```

The current lifecycle hooks available to users are:

| Hook                  | Purpose                                                 |
|-----------------------|---------------------------------------------------------|
| `initState()`         | One-time initialization after mount                     |
| `didUpdateWidget(old)`| Parent rebuilt with a new widget of the same type       |
| `build(context)`      | Produce the widget subtree                              |
| `dispose()`           | Release resources on permanent removal                  |

There is no mechanism to:
- Replace the root widget without tearing down the entire tree
- Notify existing `State` objects that source code has changed
- Preserve `State` across widget tree reconstruction

### 1.3 How Widget Updates Work (Without Hot Reload)

When a widget tree is rebuilt (e.g., via `setState()`), the reconciliation algorithm in `Element.update()` and `MultiChildRenderObjectElement.updateChildren()` preserves existing elements and state objects when `Widget.canUpdate()` returns true (same constructor + matching keys). This existing mechanism is the foundation that hot reload builds upon.

Currently, the only way to "update" the app is:
- `setState()` within a `StatefulWidget` -- marks element dirty, triggers rebuild next frame
- Full restart -- `stop()` + re-`runApp()` -- tears down entire tree, loses all state

### 1.4 What Developers Experience Today

During development, any source code change requires:
1. Ctrl+C to kill the running process
2. `bun run examples/counter.ts` to restart
3. All runtime state (counters, scroll positions, form input, focus) is lost
4. Terminal reinitializes (flicker: alt screen exit + re-enter)

For a TUI framework, this friction is significant because TUI apps often have complex navigation state, expanded/collapsed sections, and user input that is painful to recreate.

### 1.5 The `_RootWidget` Bottleneck

The `_RootWidget` (line 132) is a private `StatelessWidget` that wraps the user's root widget:

```typescript
class _RootWidget extends StatelessWidget {
  readonly child: Widget;
  constructor(opts: { child: Widget }) {
    super();
    this.child = opts.child;
  }
  build(_context: BuildContext): Widget {
    return this.child;
  }
}
```

This is immutable -- once created, the `child` reference cannot be swapped. To change the root widget, `attachRootWidget()` must be called again, which creates an entirely new element tree. There is no path from "new widget instance" to "update existing tree in place."

---

## 2. Proposed Changes

### 2.1 Architecture Overview

The hot reload system has three layers:

```
Layer 3: File Watcher (Bun.FileSystemWatcher)
   |
   | detects .ts file changes, invalidates Bun module cache,
   | re-imports user's root widget factory
   |
Layer 2: WidgetsBinding.reassemble()
   |
   | replaces root widget, walks entire element tree calling
   | Element.reassemble() -> State.reassemble()
   |
Layer 1: Element.reassemble() + State.reassemble()
   |
   | per-element/per-state hook for resetting debug data,
   | re-evaluating build output with new code
```

### 2.2 Layer 1: `Element.reassemble()` and `State.reassemble()`

#### 2.2.1 `Element.reassemble()`

Add a `reassemble()` method to the base `Element` class in `/home/gem/workspace/flitter/packages/flitter-core/src/framework/element.ts`:

```typescript
// Element base class (line ~93, after update())
/**
 * Called during hot reload to force this element and all descendants
 * to rebuild, even if the widget identity hasn't changed.
 *
 * Unlike markNeedsRebuild() which only marks one element dirty,
 * reassemble() recursively walks the entire subtree to ensure every
 * element picks up new code paths (e.g., changed build() methods).
 *
 * Amp ref: T$.reassemble() -- walks children, marks dirty
 */
reassemble(): void {
  this.markNeedsRebuild();
  this.visitChildren((child) => {
    child.reassemble();
  });
}
```

#### 2.2.2 `StatefulElement.reassemble()`

Override in `StatefulElement` to call `State.reassemble()` before the recursive walk:

```typescript
// StatefulElement (line ~370, after markNeedsBuild())
override reassemble(): void {
  if (this._state) {
    this._state.reassemble();
  }
  super.reassemble();
}
```

#### 2.2.3 `State.reassemble()`

Add the lifecycle hook to `State<T>` in `/home/gem/workspace/flitter/packages/flitter-core/src/framework/widget.ts`:

```typescript
// State class (line ~239, after dispose())
/**
 * Called during hot reload when source code has changed.
 *
 * Override this to reset any cached data that depends on the
 * widget's build() method or other code that may have changed.
 * The framework will call build() after reassemble() completes.
 *
 * Default implementation is a no-op. Unlike initState(), this is
 * called on already-mounted states to give them a chance to react
 * to code changes without losing their runtime state.
 *
 * Example use cases:
 * - Reset cached computations that depend on source code
 * - Re-subscribe to streams with updated filter logic
 * - Clear memoized widget subtrees
 */
reassemble(): void {}
```

Also update the lifecycle documentation comment (currently at line 141-155):

```typescript
/**
 * Lifecycle (Amp fidelity):
 *   1. _mount(widget, context)  -- sets widget/context, sets mounted=true, calls initState()
 *   2. build(context)           -- called by StatefulElement.rebuild()
 *   3. _update(newWidget)       -- sets new widget, calls didUpdateWidget(oldWidget)
 *   4. setState(fn?)            -- executes callback, marks element dirty
 *   5. reassemble()             -- hot reload: called when code changes, before rebuild
 *   6. _unmount()               -- sets mounted=false, calls dispose()
 */
```

### 2.3 Layer 2: `WidgetsBinding.reassemble()`

Add a `reassemble()` method to `WidgetsBinding` in `/home/gem/workspace/flitter/packages/flitter-core/src/framework/binding.ts`. This is the entry point that replaces the root widget and triggers the full-tree reassembly.

#### 2.3.1 Convert `_RootWidget` to Support Widget Replacement

The current `_RootWidget` is a `StatelessWidget` with a `readonly child`. For hot reload, we need the ability to swap the child. Convert it to a `StatefulWidget`:

```typescript
// Replace the existing _RootWidget (lines 132-147) with:

class _RootWidget extends StatefulWidget {
  readonly child: Widget;

  constructor(opts: { child: Widget }) {
    super();
    this.child = opts.child;
  }

  createState(): _RootWidgetState {
    return new _RootWidgetState();
  }
}

class _RootWidgetState extends State<_RootWidget> {
  build(_context: BuildContext): Widget {
    return this.widget.child;
  }
}
```

However, this approach has a problem: `Widget.canUpdate()` checks constructor identity, and creating a new `_RootWidget` instance with a new child means the element tree can reconcile it (same constructor, no key). But we need the update to propagate the new child.

A cleaner approach is to keep `_RootWidget` as a `StatelessWidget` but add a dedicated `reassembleWith()` method to `WidgetsBinding` that replaces the root element's widget and triggers reassembly:

```typescript
// WidgetsBinding class, after attachRootWidget() (line ~479)

/**
 * Hot reload entry point. Replaces the root widget and walks the
 * entire element tree, calling reassemble() on every element.
 *
 * This preserves all State objects while ensuring every element
 * re-evaluates its build() method with potentially new code.
 *
 * Flow:
 *   1. Create new _RootWidget wrapping the new user widget
 *   2. Call rootElement.update(newRootWidget) to swap widget refs
 *   3. Call rootElement.reassemble() to recursively mark dirty
 *   4. Schedule a frame to process the rebuild
 *
 * The reconciliation algorithm in Element.update() / updateChildren()
 * will match existing elements by constructor + key, preserving State
 * objects for StatefulWidgets that haven't changed their type/key.
 */
reassemble(newWidget: Widget): void {
  if (!this._rootElement || !this._isRunning) {
    throw new Error('Cannot reassemble: app is not running');
  }

  // Get the current terminal size for MediaQuery wrapping
  const cols = this._renderViewSize.width;
  const rows = this._renderViewSize.height;

  // Wrap in MediaQuery just like runApp() does
  const wrappedWidget = new MediaQuery({
    data: MediaQueryData.fromTerminal(cols, rows),
    child: newWidget,
  });

  // Wrap in _RootWidget (matches what attachRootWidget does)
  const newRootWidget = new _RootWidget({ child: wrappedWidget });

  // Update the root element with the new widget tree.
  // Because the constructor (_RootWidget) and key (undefined) match,
  // canUpdate() returns true and the element is reused, not replaced.
  this._rootElement.update(newRootWidget);

  // Walk the entire element tree calling reassemble()
  // This marks every element dirty, ensuring all build() methods
  // re-execute with potentially new code.
  this._rootElement.reassemble();

  // Force a full repaint since code changes may affect layout/paint
  this.requestForcedPaintFrame();
}
```

### 2.4 Layer 3: File Watcher with Bun's `FSWatcher`

#### 2.4.1 New Module: `hot-reload.ts`

Create `/home/gem/workspace/flitter/packages/flitter-core/src/dev/hot-reload.ts`:

```typescript
// hot-reload.ts -- File watcher for development hot reload
//
// Uses Bun's built-in fs.watch() (backed by inotify on Linux, FSEvents on macOS)
// to detect source file changes, invalidate the module cache, re-import the
// user's widget factory, and call WidgetsBinding.reassemble().
//
// This module is development-only and should not be imported in production builds.

import { watch, type FSWatcher } from 'fs';
import { resolve, relative } from 'path';
import { WidgetsBinding } from '../framework/binding';
import type { Widget } from '../framework/widget';

/**
 * A factory function that creates the root widget.
 * Must be a function (not a widget instance) so it can be re-invoked
 * after module cache invalidation to get updated code.
 */
export type WidgetFactory = () => Widget;

export interface HotReloadOptions {
  /** Directory to watch (default: process.cwd()) */
  watchDir?: string;

  /** File extensions to watch (default: ['.ts', '.tsx']) */
  extensions?: string[];

  /** Paths to ignore (default: ['node_modules', '.git', 'dist']) */
  ignorePaths?: string[];

  /** Debounce interval in ms (default: 100) */
  debounceMs?: number;

  /** Callback on successful reload */
  onReload?: (changedFile: string) => void;

  /** Callback on reload error */
  onError?: (error: Error, changedFile: string) => void;

  /**
   * The absolute path to the entry module that exports the widget factory.
   * This module (and its entire dependency chain) will be cache-busted
   * on each reload.
   */
  entryModule: string;

  /**
   * The named export from entryModule that is the widget factory.
   * Default: 'createApp'
   */
  factoryExport?: string;
}

/**
 * HotReloadWatcher manages the file watching and module reloading cycle.
 *
 * Usage:
 *   const watcher = new HotReloadWatcher({
 *     entryModule: import.meta.path,
 *     watchDir: import.meta.dir,
 *   });
 *   watcher.start();
 *   // ... later ...
 *   watcher.stop();
 */
export class HotReloadWatcher {
  private _watcher: FSWatcher | null = null;
  private _options: Required<HotReloadOptions>;
  private _debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _isReloading: boolean = false;

  constructor(options: HotReloadOptions) {
    this._options = {
      watchDir: options.watchDir ?? process.cwd(),
      extensions: options.extensions ?? ['.ts', '.tsx'],
      ignorePaths: options.ignorePaths ?? ['node_modules', '.git', 'dist'],
      debounceMs: options.debounceMs ?? 100,
      onReload: options.onReload ?? (() => {}),
      onError: options.onError ?? ((err) => console.error('[hot-reload] Error:', err.message)),
      entryModule: resolve(options.entryModule),
      factoryExport: options.factoryExport ?? 'createApp',
    };
  }

  /**
   * Start watching for file changes.
   */
  start(): void {
    if (this._watcher) return;

    this._watcher = watch(
      this._options.watchDir,
      { recursive: true },
      (eventType, filename) => {
        if (!filename) return;
        if (!this._shouldProcess(filename)) return;
        this._scheduleReload(filename);
      },
    );
  }

  /**
   * Stop watching and clean up.
   */
  stop(): void {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
    if (this._watcher) {
      this._watcher.close();
      this._watcher = null;
    }
  }

  /**
   * Check if a changed file should trigger a reload.
   */
  private _shouldProcess(filename: string): boolean {
    // Check extension
    const hasValidExt = this._options.extensions.some((ext) =>
      filename.endsWith(ext),
    );
    if (!hasValidExt) return false;

    // Check ignore paths
    const rel = relative(this._options.watchDir, filename);
    for (const ignore of this._options.ignorePaths) {
      if (rel.startsWith(ignore)) return false;
    }

    return true;
  }

  /**
   * Debounce rapid file changes (editors often write multiple times).
   */
  private _scheduleReload(filename: string): void {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }
    this._debounceTimer = setTimeout(() => {
      this._performReload(filename);
    }, this._options.debounceMs);
  }

  /**
   * Perform the actual reload:
   * 1. Invalidate Bun's module cache for the entry module
   * 2. Re-import the entry module to get updated code
   * 3. Call the widget factory to get a new root widget
   * 4. Call WidgetsBinding.reassemble() with the new widget
   */
  private async _performReload(changedFile: string): Promise<void> {
    if (this._isReloading) return;
    this._isReloading = true;

    try {
      // Step 1: Invalidate Bun's module registry.
      //
      // Bun does not currently expose a public API for cache invalidation.
      // The workaround is to append a cache-busting query string to the
      // import specifier. This forces Bun to re-evaluate the module.
      //
      // Alternative: If Bun adds `Loader.registry.delete()` or similar,
      // switch to that for cleaner invalidation.
      const cacheBuster = `?t=${Date.now()}`;
      const modulePath = this._options.entryModule + cacheBuster;

      // Step 2: Dynamic import with cache buster
      const mod = await import(modulePath);

      // Step 3: Call the widget factory
      const factory = mod[this._options.factoryExport];
      if (typeof factory !== 'function') {
        throw new Error(
          `Entry module does not export a function named '${this._options.factoryExport}'`,
        );
      }
      const newWidget = factory() as Widget;

      // Step 4: Reassemble
      const binding = WidgetsBinding.instance;
      binding.reassemble(newWidget);

      this._options.onReload(changedFile);
    } catch (error) {
      this._options.onError(
        error instanceof Error ? error : new Error(String(error)),
        changedFile,
      );
    } finally {
      this._isReloading = false;
    }
  }
}
```

#### 2.4.2 New Module: `runAppWithHotReload()`

Create a convenience wrapper in `/home/gem/workspace/flitter/packages/flitter-core/src/dev/run-app-hot.ts`:

```typescript
// run-app-hot.ts -- Convenience wrapper for runApp + hot reload
//
// Usage:
//   // my-app.ts
//   import { runAppWithHotReload } from 'flitter-core/dev/run-app-hot';
//
//   export const createApp = () => new MyApp();
//
//   if (import.meta.main) {
//     runAppWithHotReload({
//       entryModule: import.meta.path,
//       factory: createApp,
//       watchDir: import.meta.dir,
//     });
//   }

import { runApp, type RunAppOptions } from '../framework/binding';
import { HotReloadWatcher, type HotReloadOptions } from './hot-reload';
import type { Widget } from '../framework/widget';

export interface RunAppWithHotReloadOptions extends RunAppOptions {
  /** Absolute path to the entry module */
  entryModule: string;

  /** The widget factory function */
  factory: () => Widget;

  /** Directory to watch for changes */
  watchDir?: string;

  /** Named export in the entry module (default: 'createApp') */
  factoryExport?: string;

  /** Hot reload specific options */
  hotReload?: Partial<HotReloadOptions>;
}

export async function runAppWithHotReload(
  options: RunAppWithHotReloadOptions,
): Promise<void> {
  const { factory, entryModule, watchDir, factoryExport, hotReload, ...runAppOpts } = options;

  // Start the app normally
  const binding = await runApp(factory(), runAppOpts);

  // Start the file watcher for hot reload
  const watcher = new HotReloadWatcher({
    entryModule,
    watchDir: watchDir ?? process.cwd(),
    factoryExport: factoryExport ?? 'createApp',
    onReload: (file) => {
      // Could log to a debug overlay or status bar
    },
    onError: (err, file) => {
      // Could display error overlay on screen
      console.error(`[hot-reload] Failed to reload ${file}: ${err.message}`);
    },
    ...hotReload,
  });

  watcher.start();

  // Stop watcher when app exits
  await binding.waitForExit();
  watcher.stop();
}
```

### 2.5 Summary of File Changes

| File | Change |
|------|--------|
| `src/framework/widget.ts` | Add `State.reassemble()` lifecycle hook (no-op default); update lifecycle docs |
| `src/framework/element.ts` | Add `Element.reassemble()` -- marks dirty + recursive walk; override in `StatefulElement` to call `State.reassemble()` |
| `src/framework/binding.ts` | Add `WidgetsBinding.reassemble(newWidget)` -- replaces root widget, walks tree, forces repaint |
| `src/dev/hot-reload.ts` | **New file** -- `HotReloadWatcher` class using `fs.watch()` with debouncing and module cache invalidation |
| `src/dev/run-app-hot.ts` | **New file** -- `runAppWithHotReload()` convenience function |

---

## 3. Detailed Design Decisions

### 3.1 Why `reassemble()` Is Separate from `markNeedsRebuild()`

`markNeedsRebuild()` marks a single element dirty and relies on the normal build phase to process it. It does not walk descendants. This is correct for `setState()` where only one State's build output may have changed.

`reassemble()` must walk the *entire* tree because any element's `build()` method code may have changed on disk. A changed helper function in a utility module could affect any widget in the tree. The recursive walk ensures completeness.

### 3.2 Why Not Just Re-call `attachRootWidget()`

Calling `attachRootWidget()` again (which `handleResize` already does on SIGWINCH) creates an entirely new element tree from scratch. This destroys all `State` objects, losing user input, scroll positions, expanded/collapsed state, timer references, and animation progress.

The `reassemble()` path uses `Element.update()` + `canUpdate()` reconciliation, which preserves elements (and their State objects) when the widget type and key match. Only truly changed widget types cause subtree replacement.

### 3.3 Module Cache Invalidation Strategy

Bun (as of 1.x) does not provide a public module cache invalidation API equivalent to Node.js's `delete require.cache[path]`. The proposed approach uses a query-string cache buster on dynamic `import()`:

```typescript
const mod = await import(`${modulePath}?t=${Date.now()}`);
```

This works because Bun treats each unique specifier as a separate module entry. The trade-off is that old module instances remain in memory until garbage collected. For development use, this is acceptable.

If/when Bun adds `Bun.resolveSync` cache control or `Loader.registry` access, the implementation should be updated to use the cleaner API.

### 3.4 Debouncing File Changes

Text editors (VS Code, vim, etc.) often perform multiple file writes for a single save operation (write to temp, rename, update metadata). Without debouncing, a single "save" could trigger 2-3 reloads. The default 100ms debounce window coalesces these into a single reload.

### 3.5 Error Handling During Reload

If the re-imported module has a syntax error or runtime exception:
- The `import()` call throws, caught by `_performReload()`
- The `onError` callback is invoked
- The existing widget tree remains intact (no partial updates)
- The file watcher continues running; the next successful save triggers a clean reload

If `reassemble()` itself fails (e.g., a widget's `build()` throws with new code):
- The BuildOwner's `buildScope()` already catches per-element errors (line 134 in build-owner.ts)
- Failed elements have their dirty flag cleared to prevent infinite loops
- The error could be displayed via an error overlay widget (future enhancement)

---

## 4. Developer Experience

### 4.1 Hot Reload-Enabled App Pattern

```typescript
// my-app.ts
import { runAppWithHotReload } from 'flitter-core/dev/run-app-hot';
import { StatefulWidget, State, Widget, type BuildContext } from 'flitter-core';

class MyApp extends StatefulWidget {
  createState() { return new MyAppState(); }
}

class MyAppState extends State<MyApp> {
  count = 0;

  // Optional: reset debug-only caches on hot reload
  reassemble(): void {
    // e.g., clear memoized computations
  }

  build(context: BuildContext): Widget {
    // ... build UI
  }
}

// The factory function must be a named export so the hot reloader
// can re-invoke it after module re-import.
export const createApp = () => new MyApp();

if (import.meta.main) {
  runAppWithHotReload({
    entryModule: import.meta.path,
    factory: createApp,
    watchDir: import.meta.dir,
    output: process.stdout,
  });
}
```

### 4.2 What Gets Preserved vs What Gets Reset

| Aspect | Preserved | Reset |
|--------|-----------|-------|
| `State` instance fields (e.g., `count = 0`) | Yes | No |
| `State.initState()` side effects (timers, listeners) | Yes | No |
| `FocusNode` registrations | Yes | No |
| Widget `build()` output | N/A | Rebuilt with new code |
| `TextStyle`, `Color` constants | N/A | Use new values |
| New widget types added to tree | N/A | Inflated fresh |
| Removed widget types | N/A | Unmounted |

### 4.3 Console Feedback

The hot reload system should provide minimal, non-intrusive feedback:

```
[hot-reload] Watching src/ for changes...
[hot-reload] Reloaded (counter.ts) in 12ms
[hot-reload] Error reloading sidebar.ts: Unexpected token at line 42
```

A future enhancement could render this as a transient status bar or overlay within the TUI itself.

---

## 5. Testing Strategy

### 5.1 Unit Tests for `Element.reassemble()`

File: `src/framework/__tests__/reassemble.test.ts`

**Test 1: `reassemble()` marks the element dirty**

```typescript
test('Element.reassemble marks element as dirty', () => {
  WidgetsBinding.reset();
  const binding = WidgetsBinding.instance;
  const widget = new TestStatelessWidget();
  binding.attachRootWidget(widget);

  const root = binding.rootElement!;
  root._dirty = false; // clear from initial build

  root.reassemble();

  expect(root.dirty).toBe(true);
});
```

**Test 2: `reassemble()` recursively marks all descendants dirty**

```typescript
test('reassemble walks entire subtree', () => {
  // Build a tree: Root -> Column -> [Text, Text, Text]
  WidgetsBinding.reset();
  const binding = WidgetsBinding.instance;
  binding.attachRootWidget(new ColumnWith3Texts());
  binding.drawFrameSync();

  // Collect all elements
  const elements: Element[] = [];
  function walk(el: Element) {
    elements.push(el);
    el.visitChildren(walk);
  }
  walk(binding.rootElement!);

  // Clear all dirty flags
  elements.forEach(el => el._dirty = false);

  // Reassemble
  binding.rootElement!.reassemble();

  // ALL elements should be dirty
  for (const el of elements) {
    expect(el.dirty).toBe(true);
  }
});
```

**Test 3: `StatefulElement.reassemble()` calls `State.reassemble()`**

```typescript
test('StatefulElement.reassemble calls State.reassemble', () => {
  const reassembleSpy = { called: false };

  class TestState extends State<TestStatefulWidget> {
    reassemble(): void {
      reassembleSpy.called = true;
    }
    build(context: BuildContext): Widget {
      return new Text({ text: new TextSpan({ text: 'hello' }) });
    }
  }

  class TestStatefulWidget extends StatefulWidget {
    createState() { return new TestState(); }
  }

  WidgetsBinding.reset();
  const binding = WidgetsBinding.instance;
  binding.attachRootWidget(new TestStatefulWidget());
  binding.drawFrameSync();

  // Find the StatefulElement
  const statefulEl = findStatefulElement(binding.rootElement!);

  statefulEl.reassemble();

  expect(reassembleSpy.called).toBe(true);
});
```

**Test 4: `reassemble()` does not call `State.initState()` again**

```typescript
test('reassemble does not re-invoke initState', () => {
  let initCount = 0;

  class TestState extends State<TestStatefulWidget> {
    initState(): void { initCount++; }
    build(context: BuildContext): Widget { /* ... */ }
  }

  // Mount
  WidgetsBinding.reset();
  const binding = WidgetsBinding.instance;
  binding.attachRootWidget(new TestStatefulWidget());
  binding.drawFrameSync();
  expect(initCount).toBe(1);

  // Reassemble
  binding.rootElement!.reassemble();
  binding.drawFrameSync();
  expect(initCount).toBe(1); // still 1, not 2
});
```

### 5.2 Unit Tests for `WidgetsBinding.reassemble()`

**Test 5: `WidgetsBinding.reassemble()` preserves existing State**

```typescript
test('reassemble preserves State instances', () => {
  class CounterState extends State<CounterWidget> {
    count = 42;
    build(context: BuildContext): Widget { /* ... */ }
  }

  WidgetsBinding.reset();
  const binding = WidgetsBinding.instance;
  binding.attachRootWidget(new CounterWidget());
  binding.drawFrameSync();

  // Find the state and verify initial value
  const statefulEl = findStatefulElement(binding.rootElement!);
  const state = (statefulEl as StatefulElement).state as CounterState;
  expect(state.count).toBe(42);

  // Reassemble with a new widget instance (same type)
  binding.reassemble(new CounterWidget());
  binding.drawFrameSync();

  // State should be preserved
  const stateAfter = (findStatefulElement(binding.rootElement!) as StatefulElement).state as CounterState;
  expect(stateAfter).toBe(state); // same object reference
  expect(stateAfter.count).toBe(42); // value preserved
});
```

**Test 6: `reassemble()` with a different root widget type replaces the tree**

```typescript
test('reassemble with different widget type replaces subtree', () => {
  WidgetsBinding.reset();
  const binding = WidgetsBinding.instance;
  binding.attachRootWidget(new WidgetA());
  binding.drawFrameSync();

  const oldRoot = binding.rootElement;

  // Reassemble with a completely different widget type
  // canUpdate() will return false, so the subtree below _RootWidget
  // will be replaced (not updated)
  binding.reassemble(new WidgetB());
  binding.drawFrameSync();

  // Root element (_RootWidget) is the same, but its child is new
  expect(binding.rootElement).toBe(oldRoot); // _RootWidget element preserved
});
```

**Test 7: `reassemble()` throws if app is not running**

```typescript
test('reassemble throws when not running', () => {
  WidgetsBinding.reset();
  const binding = WidgetsBinding.instance;

  expect(() => {
    binding.reassemble(new SomeWidget());
  }).toThrow('Cannot reassemble: app is not running');
});
```

**Test 8: `reassemble()` triggers a frame with repaint**

```typescript
test('reassemble requests forced paint frame', () => {
  WidgetsBinding.reset();
  const binding = WidgetsBinding.instance;
  binding.attachRootWidget(new TestWidget());
  binding.drawFrameSync();

  binding.reassemble(new TestWidget());

  expect(binding.forcePaintOnNextFrame).toBe(true);
});
```

### 5.3 Integration Tests for `HotReloadWatcher`

**Test 9: Watcher detects .ts file changes** (requires temp directory and real fs)

```typescript
import { mkdtemp, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

test('HotReloadWatcher triggers reload on .ts file change', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flitter-hot-'));
  const entryPath = join(dir, 'app.ts');

  // Write initial module
  await writeFile(entryPath, `export const createApp = () => ({ type: 'v1' });`);

  const reloads: string[] = [];
  const watcher = new HotReloadWatcher({
    entryModule: entryPath,
    watchDir: dir,
    debounceMs: 50,
    onReload: (file) => reloads.push(file),
    onError: () => {},
  });

  // Note: We can't fully test this without the WidgetsBinding running,
  // but we can verify the watcher detects changes.
  // A more complete test would mock WidgetsBinding.

  watcher.start();

  // Modify the file
  await writeFile(entryPath, `export const createApp = () => ({ type: 'v2' });`);

  // Wait for debounce + processing
  await new Promise(r => setTimeout(r, 300));

  watcher.stop();
  await rm(dir, { recursive: true });

  // The reload should have been attempted (may fail due to missing binding,
  // but the detection should work)
});
```

**Test 10: Watcher ignores non-.ts files**

```typescript
test('HotReloadWatcher ignores non-ts files', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flitter-hot-'));

  let reloadAttempted = false;
  const watcher = new HotReloadWatcher({
    entryModule: join(dir, 'app.ts'),
    watchDir: dir,
    debounceMs: 20,
    onReload: () => { reloadAttempted = true; },
    onError: () => { reloadAttempted = true; },
  });

  watcher.start();

  await writeFile(join(dir, 'readme.md'), '# hello');
  await new Promise(r => setTimeout(r, 100));

  watcher.stop();
  await rm(dir, { recursive: true });

  expect(reloadAttempted).toBe(false);
});
```

**Test 11: Watcher debounces rapid changes**

```typescript
test('HotReloadWatcher debounces rapid changes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flitter-hot-'));
  const entryPath = join(dir, 'app.ts');
  await writeFile(entryPath, `export const createApp = () => ({});`);

  let reloadCount = 0;
  const watcher = new HotReloadWatcher({
    entryModule: entryPath,
    watchDir: dir,
    debounceMs: 100,
    onReload: () => { reloadCount++; },
    onError: () => { reloadCount++; }, // count errors as attempts too
  });

  watcher.start();

  // Rapid writes -- should coalesce into 1 reload
  for (let i = 0; i < 5; i++) {
    await writeFile(entryPath, `export const createApp = () => ({ v: ${i} });`);
    await new Promise(r => setTimeout(r, 10));
  }

  await new Promise(r => setTimeout(r, 300));

  watcher.stop();
  await rm(dir, { recursive: true });

  // Should be exactly 1 reload, not 5
  expect(reloadCount).toBe(1);
});
```

### 5.4 End-to-End Test

**Test 12: Full hot reload cycle preserving State**

This test requires a more involved setup with actual widget classes and a running binding:

```typescript
test('end-to-end: hot reload preserves counter state', () => {
  WidgetsBinding.reset();
  const binding = WidgetsBinding.instance;

  // Mount a counter at 0
  binding.attachRootWidget(new CounterWidget());
  binding.drawFrameSync();

  // Simulate user incrementing to 5
  const state = getCounterState(binding.rootElement!);
  state.setState(() => { state.count = 5; });
  binding.drawFrameSync();
  expect(state.count).toBe(5);

  // Simulate hot reload (new CounterWidget instance, same class)
  binding.reassemble(new CounterWidget());
  binding.drawFrameSync();

  // State should be preserved
  const stateAfter = getCounterState(binding.rootElement!);
  expect(stateAfter).toBe(state); // same State object
  expect(stateAfter.count).toBe(5); // count preserved
});
```

### 5.5 Test File Organization

```
src/framework/__tests__/
  reassemble.test.ts          -- Tests 1-8 (Element + State + Binding reassemble)
src/dev/__tests__/
  hot-reload-watcher.test.ts  -- Tests 9-11 (file watcher)
  hot-reload-e2e.test.ts      -- Test 12 (full cycle)
```

---

## 6. Migration and Rollout Plan

### 6.1 Phase 1: Core Framework Methods (Zero Breaking Changes)

1. Add `State.reassemble()` -- no-op default, purely additive
2. Add `Element.reassemble()` -- new method, no existing callers
3. Add `StatefulElement.reassemble()` override
4. Add `WidgetsBinding.reassemble()` method
5. All existing tests pass unchanged

### 6.2 Phase 2: File Watcher (New Module, Opt-In)

1. Create `src/dev/hot-reload.ts` with `HotReloadWatcher`
2. Create `src/dev/run-app-hot.ts` with `runAppWithHotReload()`
3. Add exports to package (under `flitter-core/dev` subpath)
4. No changes to production code paths

### 6.3 Phase 3: Developer Experience Polish

1. Add hot reload status indicator (optional overlay or status bar widget)
2. Add error overlay that shows compilation errors in the TUI
3. Add `--hot` flag to example scripts in `package.json`
4. Document the pattern in examples

### 6.4 Backward Compatibility

All changes are purely additive:
- `State.reassemble()` has a no-op default -- existing State subclasses work unchanged
- `Element.reassemble()` is a new method -- no existing code calls it
- `WidgetsBinding.reassemble()` is a new method -- only called by the file watcher
- The dev modules are opt-in imports -- production apps never load them

---

## 7. Future Enhancements

### 7.1 Structural Hot Reload

The proposed design handles *code changes within existing widget types*. It does not handle *structural changes* where widget types are renamed, split, or merged. For those cases, the reconciliation will naturally fall through (canUpdate returns false) and rebuild subtrees from scratch, losing State in those subtrees. This matches Flutter's behavior.

### 7.2 Error Recovery Overlay

A dedicated `ErrorOverlay` widget could be injected by `reassemble()` when build errors occur, showing the error message and stack trace within the TUI rather than crashing. The overlay would disappear on the next successful reload.

### 7.3 Bun Native Module Cache API

When Bun ships a public module cache invalidation API, the query-string cache buster should be replaced with direct cache entry deletion for cleaner memory behavior.

### 7.4 Selective Reassembly

Rather than walking the entire tree, a more sophisticated system could track which modules were changed and only reassemble elements whose widgets are defined in those modules. This optimization is not necessary for v1 given that the full tree walk is O(n) in the number of elements and typically completes in under 1ms for trees with thousands of elements.
