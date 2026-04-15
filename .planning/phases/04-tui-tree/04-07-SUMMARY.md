---
phase: 4
plan: 07
status: complete
---

# StatelessWidget, StatefulWidget, and State -- Summary

## One-Liner
Implemented the StatelessWidget/StatefulWidget/State trio providing the developer-facing widget abstraction with full State lifecycle (initState, didUpdateWidget, setState, dispose) and BuildContext integration.

## What Was Built
- `stateless-widget.ts`:
  - `BuildContext` interface with `widget` property and `findRenderObject()` method
  - Abstract `StatelessWidget extends Widget`: abstract `build(context: BuildContext)`, `createElement()` returns `StatelessElement`
  - `StatelessElement extends ComponentElement`: `build()` delegates to `(widget as StatelessWidget).build(this as BuildContext)`
- `stateful-widget.ts`:
  - Abstract `State<T extends StatefulWidget>` with:
    - Internal fields: `_widget`, `_element`, `_mounted`
    - Getters: `widget`, `context` (returns element as BuildContext), `mounted`
    - Lifecycle hooks: `initState()`, `didUpdateWidget(oldWidget)`, `dispose()` (all empty defaults)
    - `setState(fn?)`: throws if not mounted, executes fn synchronously, then `_element!.markNeedsRebuild()`
    - Abstract `build(context: BuildContext): Widget`
    - Internal methods: `_mount()`, `_update()`, `_unmount()`
  - Abstract `StatefulWidget extends Widget`: abstract `createState()`, `createElement()` returns `StatefulElement`
  - `StatefulElement extends ComponentElement`:
    - `mount()`: creates State via `createState()`, calls `_mount()`, `initState()`, then `super.mount()` triggering first build
    - `build()`: delegates to `_state.build(this as BuildContext)`
    - `update()`: calls `_state._update(newWidget)` triggering `didUpdateWidget`, then super.update, marks dirty, performs rebuild
    - `unmount()`: calls `_state._unmount()` triggering `dispose`, then `super.unmount()`
    - `state` getter for external access (used by GlobalKey.currentState)

## Key Decisions
- Element itself serves as BuildContext (via cast) rather than creating a separate wrapper object, keeping the implementation lightweight
- `setState()` synchronously executes the callback before marking dirty, ensuring state mutations are visible in the subsequent build
- `setState()` throws "setState called after dispose" if `_mounted` is false, catching common lifecycle errors
- State._mount() is called before initState(), so `widget` and `context` are available inside initState
- `StatefulElement.update()` explicitly sets `_dirty = true` and calls `performRebuild()` after super.update to ensure rebuild on widget config change

## Test Coverage
21 tests across 6 describe blocks covering StatelessWidget (createElement returns StatelessElement, mount calls build, rebuild calls build again, build receives BuildContext), State lifecycle (createState creates new instances, mount calls initState, widget accessible in initState, mounted=true in initState, didUpdateWidget receives old widget, dispose called on unmount), dispose state (mounted=false after dispose), setState (executes callback, marks element dirty, calls BuildOwner.scheduleBuildFor, no-callback also marks dirty, throws after dispose), StatefulElement update (same-type update calls didUpdateWidget+rebuild, state persists across update, different-type canUpdate returns false), and BuildContext (context.widget returns current widget, findRenderObject returns undefined for ComponentElement).

## Artifacts
- `packages/tui/src/tree/stateless-widget.ts`
- `packages/tui/src/tree/stateful-widget.ts`
- `packages/tui/src/tree/stateful-widget.test.ts`
