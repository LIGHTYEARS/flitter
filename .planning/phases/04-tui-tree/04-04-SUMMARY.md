---
phase: 4
plan: 04
status: complete
---

# Element Base Class -- Summary

## One-Liner
Implemented the Element abstract base class for the element tree, managing Widget references, parent-child relationships, mount/unmount lifecycle, dirty/rebuild scheduling via BuildOwner, and ancestor/render-object lookup.

## What Was Built
- Forward declaration interfaces: `Key` (with optional `equals`) and `Widget` (with `key`, `canUpdate`, `createElement`) in `element.ts`
- Abstract `Element` class with:
  - Protected fields: `_widget`, `_parent`, `_children`, `_dirty` (initially true), `_mounted` (initially false), `_depth`
  - Property accessors: `widget` getter/setter, `parent`, `children` (readonly), `dirty`, `mounted`, `depth`, `renderObject` (returns undefined, overridden by RenderObjectElement)
  - Tree operations: `addChild()`, `removeChild()`, `removeAllChildren()`
  - Lifecycle: `mount(parent?)` sets parent/depth/mounted, `unmount()` recursively unmounts children then clears state, `update(newWidget)` replaces widget reference
  - Rebuild: `markNeedsRebuild()` guards against duplicate dirty, calls `getBuildOwner()?.scheduleBuildFor(this)`, `performRebuild()` clears dirty flag (subclass hook)
  - Lookup: `findAncestorElementOfType(type)` walks parent chain with instanceof, `findRenderObject()` depth-first searches children

## Key Decisions
- `_dirty` starts as `true` so newly created elements are built on first mount
- `markNeedsRebuild()` short-circuits if already dirty, preventing duplicate BuildOwner registrations
- `unmount()` iterates a copy of children to safely handle mutation during recursive unmount
- `findAncestorElementOfType` uses a constructor/Function parameter cast to `new (...args: unknown[]) => Element` for instanceof checking
- `findRenderObject()` returns `this.renderObject` if present, otherwise recurses into children depth-first

## Test Coverage
30 tests across 6 describe blocks covering constructor (saves widget, initial dirty/mounted), mount/unmount (sets mounted/parent/depth, root depth=0, unmount clears state, recursive unmount), tree operations (addChild to children/parent/depth, removeChild from children/parent, removeAllChildren), dirty/rebuild (markNeedsRebuild sets dirty, calls BuildOwner mock, no duplicate when already dirty, performRebuild clears dirty, update changes widget), lookup (findAncestorElementOfType finds correct type, returns null when not found, findRenderObject returns undefined in base class), and supplemental tests (rebuild hook counter, widget setter, children initial empty, renderObject undefined, TestWidget.canUpdate, createElement).

## Artifacts
- `packages/tui/src/tree/element.ts`
- `packages/tui/src/tree/element.test.ts`
