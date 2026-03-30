// Element tree — Element base, ComponentElement, RenderObjectElement, updateChild, updateChildren, InheritedElement
// Amp ref: T$ (Element), lU0 (StatelessElement), V_0 (StatefulElement), Z_0 (InheritedElement),
//          oj (RenderObjectElement), uv (SingleChildRenderObjectElement), rJ (MultiChildRenderObjectElement),
//          O$ (LeafRenderObjectElement), iU0 (ParentDataElement)
// Source: amp-strings.txt:529716, 530350
// Reference: .reference/element-tree.md

import {
  Widget,
  StatelessWidget,
  StatefulWidget,
  State,
  InheritedWidget,
  ProxyWidget,
  type BuildContext,
  type AbstractConstructor,
} from './widget';
import { Key, GlobalKey } from '../core/key';
import type {
  RenderObject,
  RenderObjectWidget,
  SingleChildRenderObjectWidget,
  MultiChildRenderObjectWidget,
  LeafRenderObjectWidget,
} from './render-object';
import { isSingleChildRenderObject, isContainerRenderObject } from './render-object';
import type { MediaQueryData } from '../widgets/media-query';

// ---------------------------------------------------------------------------
// BuildOwner interface (forward reference — full impl in Plan 03-03)
// Amp ref: NB0 — uses Set for dirty elements
// ---------------------------------------------------------------------------

export interface BuildOwner {
  scheduleBuildFor(element: Element): void;
}

// ---------------------------------------------------------------------------
// Element lifecycle states
// NOTE: deactivate()/activate() is NOT present in the original Amp binary.
// This is a deliberate extension to support GlobalKey reparenting,
// matching Flutter's Element lifecycle.
// Amp ref deviation: See .gap/02-deactivate-lifecycle.md
// ---------------------------------------------------------------------------

export enum _ElementLifecycleState {
  initial = 'initial',       // Element created but never mounted
  active = 'active',         // Element is in the tree and mounted
  inactive = 'inactive',     // Element removed from tree but potentially reactivatable this frame
  defunct = 'defunct',        // Element permanently removed, dispose() has been called
}

// ---------------------------------------------------------------------------
// Element base class (Amp: T$)
//
// Lifecycle states: initial -> active -> inactive -> defunct
// NOTE: The original Amp binary does NOT have deactivate(). This extension
// enables GlobalKey reparenting, matching Flutter's Element lifecycle.
// Amp ref deviation: See .gap/02-deactivate-lifecycle.md
//
// - depth is lazy-computed and cached, invalidated on reparent
// - _inheritedDependencies tracks which InheritedElements this depends on
// - BuildContext (jd) is a separate concrete class in Amp, but in our TS version
//   Element subclasses serve as context (passed to build methods)
// ---------------------------------------------------------------------------

export class Element {
  widget: Widget;
  parent: Element | undefined = undefined;
  _children: Element[] = [];
  _inheritedDependencies: Set<InheritedElement> = new Set();
  // Extension: _inheritedWidgets map for O(1) inherited lookup.
  // Amp uses O(d) parent walk (T$.dependOnInheritedWidgetOfExactType).
  // Flutter uses Map<Type, InheritedElement> on each Element.
  // See .gap/07-inherited-widget-map.md
  _inheritedWidgets: Map<Function, InheritedElement> | null = null;
  _dirty: boolean = false;
  _cachedDepth: number | undefined = undefined;
  _lifecycleState: _ElementLifecycleState = _ElementLifecycleState.initial;

  constructor(widget: Widget) {
    this.widget = widget;
  }

  get children(): Element[] {
    return this._children;
  }

  // --- Depth (lazy, invalidated on reparent) ---
  // Amp ref: T$.depth — walks up parent chain, caches result
  get depth(): number {
    if (this._cachedDepth !== undefined) return this._cachedDepth;
    let d = 0;
    let p = this.parent;
    while (p) {
      d++;
      p = p.parent;
    }
    this._cachedDepth = d;
    return d;
  }

  _invalidateDepth(): void {
    this._cachedDepth = undefined;
    for (const child of this._children) {
      child._invalidateDepth();
    }
  }

  get dirty(): boolean {
    return this._dirty;
  }

  get mounted(): boolean {
    return this._lifecycleState === _ElementLifecycleState.active;
  }

  // Base returns undefined — overridden by RenderObjectElement
  get renderObject(): RenderObject | undefined {
    return undefined;
  }

  // --- mount(): base no-op ---
  // Subclasses (StatelessElement, StatefulElement, RenderObjectElement, etc.) override this.
  // Having mount() on the base class eliminates duck-typing checks in _mountChild helpers.
  mount(): void {
    // Base no-op; overridden by subclasses
  }

  // --- update(): just swaps the widget reference ---
  // Amp ref: T$.update(newWidget)
  update(newWidget: Widget): void {
    this.widget = newWidget;
  }

  // --- Child management ---
  // Amp ref: T$.addChild, T$.removeChild, T$.removeAllChildren
  // Extension: propagate/clear _inheritedWidgets map. See .gap/07-inherited-widget-map.md
  addChild(child: Element): void {
    child.parent = this;
    child._invalidateDepth();
    // Propagate inherited widgets map to child.
    // Non-InheritedElement children share their parent's map reference.
    // InheritedElement overrides _updateInheritedWidgets() to extend the map.
    child._updateInheritedWidgets(this._inheritedWidgets);
    this._children.push(child);
  }

  removeChild(child: Element): void {
    const idx = this._children.indexOf(child);
    if (idx !== -1) {
      this._children.splice(idx, 1);
      child.parent = undefined;
      child._invalidateDepth();
      child._inheritedWidgets = null;
    }
  }

  removeAllChildren(): void {
    for (const child of this._children) {
      child.parent = undefined;
      child._invalidateDepth();
      child._inheritedWidgets = null;
    }
    this._children.length = 0;
  }

  // --- Lifecycle: mount ---
  // Amp ref: T$.markMounted()
  // Extended: Also registers GlobalKey association.
  // Amp ref deviation: See .gap/02-deactivate-lifecycle.md
  markMounted(): void {
    this._lifecycleState = _ElementLifecycleState.active;
    // GlobalKey registration
    if (this.widget.key instanceof GlobalKey) {
      this.widget.key._setElement(this);
    }
  }

  // --- Lifecycle: deactivate ---
  // NOTE: deactivate() is NOT present in the original Amp binary.
  // This is a deliberate extension to support GlobalKey reparenting,
  // matching Flutter's Element lifecycle.
  // Amp ref deviation: See .gap/02-deactivate-lifecycle.md
  //
  // Moves element from active -> inactive state.
  // Called when element is removed from the tree but may be reactivated
  // via GlobalKey reparenting within the same frame.
  deactivate(): void {
    this._lifecycleState = _ElementLifecycleState.inactive;
    // Unsubscribe from all inherited dependencies (will re-subscribe on activate)
    for (const dep of this._inheritedDependencies) {
      dep.removeDependent(this);
    }
    this._inheritedDependencies.clear();
  }

  // --- Lifecycle: activate ---
  // NOTE: activate() is NOT present in the original Amp binary.
  // This is a deliberate extension to support GlobalKey reparenting,
  // matching Flutter's Element lifecycle.
  // Amp ref deviation: See .gap/02-deactivate-lifecycle.md
  //
  // Moves element from inactive -> active state.
  // Called when a deactivated element is reinserted via GlobalKey reparenting.
  activate(): void {
    this._lifecycleState = _ElementLifecycleState.active;
    this._dirty = true; // Force rebuild to re-subscribe to inherited widgets
    // Depth will be recomputed lazily from new parent
    this._cachedDepth = undefined;
  }

  // --- Lifecycle: unmount (permanent removal) ---
  // Transitions from inactive -> defunct. Called at end of frame for
  // elements that were not reactivated via GlobalKey.
  // Amp ref: T$.unmount()
  unmount(): void {
    // Deregister GlobalKey
    if (this.widget.key instanceof GlobalKey) {
      this.widget.key._clearElement();
    }
    this._lifecycleState = _ElementLifecycleState.defunct;
    this._dirty = false;
    this._cachedDepth = undefined;
    this._inheritedWidgets = null; // Extension: release map reference. See .gap/07-inherited-widget-map.md
    // Clear inherited dependencies (may already be cleared by deactivate,
    // but defensively clear again for direct unmount paths)
    for (const dep of this._inheritedDependencies) {
      dep.removeDependent(this);
    }
    this._inheritedDependencies.clear();
  }

  // --- Dirty flag / rebuild scheduling ---
  // Amp ref: T$.markNeedsRebuild() — sets _dirty, calls XG8().scheduleBuildFor
  markNeedsRebuild(): void {
    if (this._lifecycleState !== _ElementLifecycleState.active) return;
    this._dirty = true;
    // Amp ref: XG8().scheduleBuildFor(this)
    // Uses dynamic require to avoid circular import (element <-> binding)
    const { getBuildScheduler } = require('./binding');
    getBuildScheduler().scheduleBuildFor(this);
  }

  // Alias used by StatefulElement
  // Amp ref: V_0.markNeedsBuild() -> this.markNeedsRebuild()
  markNeedsBuild(): void {
    this.markNeedsRebuild();
  }

  /**
   * Called by InheritedElement when a dependency changes.
   * Base implementation simply marks the element dirty.
   * StatefulElement overrides to also fire State.didChangeDependencies().
   *
   * Extension: added for Flutter API parity (not in Amp).
   * See .gap/01-did-change-dependencies.md
   */
  didChangeDependencies(): void {
    this.markNeedsRebuild();
  }

  // --- performRebuild ---
  // Base no-op; overridden by subclasses
  performRebuild(): void {}

  // --- InheritedWidget lookup ---
  // Amp ref: T$.dependOnInheritedWidgetOfExactType(widgetType)
  // Extension: Uses _inheritedWidgets map for O(1) lookup instead of O(d) parent walk.
  // See .gap/07-inherited-widget-map.md
  dependOnInheritedWidgetOfExactType(widgetType: Function): InheritedElement | null {
    const ancestor = this._inheritedWidgets?.get(widgetType) ?? null;
    if (ancestor !== null) {
      ancestor.addDependent(this);
      this._inheritedDependencies.add(ancestor);
      return ancestor;
    }
    return null;
  }

  /**
   * Look up an InheritedModel<T> ancestor and register a dependency
   * on a specific aspect. If aspect is undefined, registers an
   * unconditional dependency (same as dependOnInheritedWidgetOfExactType).
   *
   * Gap ref: .gap/08-inherited-model.md
   */
  dependOnInheritedModel<T>(widgetType: Function, aspect?: T): InheritedElement | null {
    const ancestor = this._inheritedWidgets?.get(widgetType) ?? null;
    if (ancestor !== null) {
      if (ancestor instanceof InheritedModelElement) {
        (ancestor as InheritedModelElement<T>).addDependentWithAspect(this, aspect);
      } else {
        // Fallback: regular InheritedElement, register unconditional
        ancestor.addDependent(this);
      }
      this._inheritedDependencies.add(ancestor);
      return ancestor;
    }
    return null;
  }

  // --- Ancestor queries ---
  // Amp ref: T$.findAncestorElementOfType
  findAncestorElementOfType<T extends Element>(elementType: AbstractConstructor<T>): T | null {
    let t = this.parent;
    while (t) {
      if (t instanceof elementType) return t;
      t = t.parent;
    }
    return null;
  }

  // Amp ref: T$.findAncestorWidgetOfType
  findAncestorWidgetOfType<T extends Widget>(widgetType: AbstractConstructor<T>): T | null {
    let t = this.parent;
    while (t) {
      if (t.widget instanceof widgetType) return t.widget;
      t = t.parent;
    }
    return null;
  }

  /**
   * Receive the inherited widgets map from the parent.
   * Base implementation shares the parent's map reference directly.
   * InheritedElement overrides to extend the map with itself.
   *
   * Extension: _inheritedWidgets map for O(1) inherited lookup.
   * Not present in Amp (T$ class). See .gap/07-inherited-widget-map.md
   */
  _updateInheritedWidgets(parentMap: Map<Function, InheritedElement> | null): void {
    this._inheritedWidgets = parentMap;
  }

  // --- Visitor ---
  visitChildren(visitor: (child: Element) => void): void {
    for (const child of this._children) {
      visitor(child);
    }
  }

  // --- Hot reload: reassemble ---

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
}

// ---------------------------------------------------------------------------
// StatelessElement (Amp: lU0)
// ---------------------------------------------------------------------------

export class StatelessElement extends Element {
  _child: Element | undefined = undefined;
  _context: BuildContextImpl | undefined = undefined;

  constructor(widget: StatelessWidget) {
    super(widget);
  }

  get statelessWidget(): StatelessWidget {
    return this.widget as StatelessWidget;
  }

  get child(): Element | undefined {
    return this._child;
  }

  override get renderObject(): RenderObject | undefined {
    return this._child?.renderObject;
  }

  // Amp ref: lU0.mount()
  mount(): void {
    this._context = new BuildContextImpl(this, this.widget);
    this.rebuild();
    this.markMounted();
  }

  // Amp ref: lU0.unmount()
  // Extended with deactivate() for lifecycle support.
  // Amp ref deviation: See .gap/02-deactivate-lifecycle.md
  override deactivate(): void {
    if (this._child) {
      this._child.deactivate();
    }
    super.deactivate();
  }

  override unmount(): void {
    if (this._child) {
      this._child.unmount();
      this.removeChild(this._child);
      this._child = undefined;
    }
    this._context = undefined;
    super.unmount();
  }

  // Amp ref: lU0.update(newWidget) — identity check, then rebuild
  override update(newWidget: Widget): void {
    if (this.widget === newWidget) return;
    super.update(newWidget);
    if (this._context) this._context.widget = newWidget;
    this.rebuild();
  }

  override performRebuild(): void {
    this.rebuild();
  }

  // Amp ref: lU0.rebuild() — calls widget.build(context), diffs child via canUpdate
  // Gap ref: .gap/05-error-widget.md — build() wrapped in try/catch for ErrorWidget substitution
  rebuild(): void {
    if (!this._context) {
      throw new Error('Cannot rebuild unmounted element');
    }

    let newWidget: Widget;
    try {
      newWidget = this.statelessWidget.build(this._context);
    } catch (error) {
      // Build failed -- substitute an ErrorWidget
      // Lazy require to avoid circular imports (error-widget -> render-object -> widget <- element)
      const { ErrorWidget } = require('./error-widget');
      const errorDetails = {
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

    // Self-referential build: widget.build() returned itself.
    // This is a leaf StatelessWidget pattern — no child to inflate.
    if (newWidget === this.widget) {
      return;
    }

    if (this._child) {
      if (this._child.widget === newWidget) return; // identity shortcut
      if (this._child.widget.canUpdate(newWidget)) {
        this._child.update(newWidget);
      } else {
        // Replace child: unmount old, inflate new
        this._child.unmount();
        this.removeChild(this._child);
        this._child = newWidget.createElement();
        this.addChild(this._child);
        this._mountChild(this._child);
      }
    } else {
      // First build: inflate
      this._child = newWidget.createElement();
      this.addChild(this._child);
      this._mountChild(this._child);
    }
  }

  /** Mount a child element (calls mount() if it has one). */
  private _mountChild(child: Element): void {
    child.mount();
  }
}

// ---------------------------------------------------------------------------
// StatefulElement (Amp: V_0)
// ---------------------------------------------------------------------------

export class StatefulElement extends Element {
  _state: State<StatefulWidget> | undefined = undefined;
  _child: Element | undefined = undefined;
  _context: BuildContextImpl | undefined = undefined;

  constructor(widget: StatefulWidget) {
    super(widget);
  }

  get statefulWidget(): StatefulWidget {
    return this.widget as StatefulWidget;
  }

  get state(): State<StatefulWidget> | undefined {
    return this._state;
  }

  get child(): Element | undefined {
    return this._child;
  }

  override get renderObject(): RenderObject | undefined {
    return this._child?.renderObject;
  }

  // Amp ref: V_0.mount()
  mount(): void {
    this._context = new BuildContextImpl(this, this.widget);
    this._state = this.statefulWidget.createState();
    this._state._mount(this.statefulWidget, this._context);
    this.rebuild();
    this.markMounted();
  }

  // Amp ref: V_0.unmount()
  // Extended with deactivate()/activate() for lifecycle support.
  // Amp ref deviation: See .gap/02-deactivate-lifecycle.md
  override deactivate(): void {
    if (this._state) {
      this._state._deactivate();
    }
    if (this._child) {
      this._child.deactivate();
    }
    super.deactivate();
  }

  // Override activate to notify State
  override activate(): void {
    super.activate();
    if (this._state) {
      this._state._activate();
    }
    // Child will be activated when the element is reinserted and rebuilt
  }

  override unmount(): void {
    if (this._child) {
      this._child.unmount();
      this.removeChild(this._child);
      this._child = undefined;
    }
    if (this._state) {
      this._state._unmount();
      this._state = undefined;
    }
    this._context = undefined;
    super.unmount();
  }

  // Amp ref: V_0.update(newWidget)
  override update(newWidget: Widget): void {
    if (this.widget === newWidget) return;
    super.update(newWidget);
    if (this._state) this._state._update(this.statefulWidget);
    if (this._context) this._context.widget = newWidget;
    this.rebuild();
  }

  override performRebuild(): void {
    this.rebuild();
  }

  // Amp ref: V_0.markNeedsBuild -> this.markNeedsRebuild()
  override markNeedsBuild(): void {
    this.markNeedsRebuild();
  }

  /**
   * Override reassemble for StatefulElement to call State.reassemble()
   * before the recursive walk. This gives State objects a chance to
   * reset cached data that depends on source code.
   *
   * Amp ref: V_0.reassemble() -- calls state.reassemble(), then super
   */
  override reassemble(): void {
    if (this._state) {
      this._state.reassemble();
    }
    super.reassemble();
  }

  /**
   * Called when an InheritedWidget that this element depends on changes.
   * Sets the State's dependency-changed flag before marking dirty.
   *
   * Extension: added for Flutter API parity (not in Amp).
   * See .gap/01-did-change-dependencies.md
   */
  override didChangeDependencies(): void {
    if (this._state) {
      this._state._notifyDependenciesChanged();
    }
    this.markNeedsRebuild();
  }

  // Amp ref: V_0.rebuild() — calls state.build(context), diffs child via canUpdate
  // Gap ref: .gap/05-error-widget.md — build() wrapped in try/catch for ErrorWidget substitution
  rebuild(): void {
    if (!this._context || !this._state) {
      throw new Error('Cannot rebuild unmounted element');
    }
    // If dependencies changed, fire the lifecycle hook before building
    this._state._maybeCallDidChangeDependencies();

    let newWidget: Widget;
    try {
      newWidget = this._state.build(this._context);
    } catch (error) {
      // Build failed -- substitute an ErrorWidget
      // Lazy require to avoid circular imports
      const { ErrorWidget } = require('./error-widget');
      const errorDetails = {
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
        // Replace child
        this._child.unmount();
        this.removeChild(this._child);
        this._child = newWidget.createElement();
        this.addChild(this._child);
        this._mountChild(this._child);
      }
    } else {
      // First build: inflate
      this._child = newWidget.createElement();
      this.addChild(this._child);
      this._mountChild(this._child);
    }
  }

  private _mountChild(child: Element): void {
    child.mount();
  }
}

// ---------------------------------------------------------------------------
// ProxyElement -- abstract base for single-child pass-through elements
//
// Factors out the shared child lifecycle (mount, unmount, update, renderObject
// delegation) used by both InheritedElement and ParentDataElement.
//
// NOTE: This is a flitter-specific structural enhancement, NOT an Amp ref.
// ---------------------------------------------------------------------------

export abstract class ProxyElement extends Element {
  _child: Element | undefined = undefined;

  constructor(widget: ProxyWidget) {
    super(widget);
  }

  get proxyWidget(): ProxyWidget {
    return this.widget as ProxyWidget;
  }

  get child(): Element | undefined {
    return this._child;
  }

  override get renderObject(): RenderObject | undefined {
    return this._child?.renderObject;
  }

  mount(): void {
    const childWidget = this.proxyWidget.child;
    this._child = childWidget.createElement();
    this.addChild(this._child);
    this._mountChild(this._child);
    this.markMounted();
  }

  override deactivate(): void {
    if (this._child) {
      this._child.deactivate();
    }
    super.deactivate();
  }

  override unmount(): void {
    if (this._child) {
      this._child.unmount();
      this.removeChild(this._child);
      this._child = undefined;
    }
    super.unmount();
  }

  /**
   * Base update logic: swap widget, then update child.
   * Subclasses (InheritedElement, ParentDataElement) can override update()
   * and use _swapWidget()/_updateChild() to insert logic between widget
   * swap and child update.
   */
  override update(newWidget: Widget): void {
    this._swapWidget(newWidget);
    this._updateChild();
  }

  /** Swap the widget reference (calls Element.prototype.update). */
  protected _swapWidget(newWidget: Widget): void {
    Element.prototype.update.call(this, newWidget);
  }

  /** Update or replace the child element based on canUpdate(). */
  protected _updateChild(): void {
    const newChildWidget = this.proxyWidget.child;
    if (this._child && this._child.widget.canUpdate(newChildWidget)) {
      this._child.update(newChildWidget);
    } else {
      if (this._child) {
        this._child.unmount();
        this.removeChild(this._child);
      }
      this._child = newChildWidget.createElement();
      this.addChild(this._child);
      this._mountChild(this._child);
    }
  }

  override performRebuild(): void {}

  protected _mountChild(child: Element): void {
    child.mount();
  }
}

// ---------------------------------------------------------------------------
// InheritedElement (Amp: Z_0)
// NOTE: In Amp, Z_0 extends T$ directly. We extend ProxyElement for DRY.
// ---------------------------------------------------------------------------

export class InheritedElement extends ProxyElement {
  _dependents: Set<Element> = new Set();
  /**
   * Captures the previous widget during update(), so that subclasses
   * (InheritedModelElement) can access it in notifyDependents().
   * Set just before notifyDependents() and cleared immediately after.
   */
  _previousWidget: InheritedWidget | undefined = undefined;

  constructor(widget: InheritedWidget) {
    super(widget);
  }

  get inheritedWidget(): InheritedWidget {
    return this.widget as InheritedWidget;
  }

  /**
   * Extend the inherited widgets map with this InheritedElement.
   * Creates a new Map that includes all entries from the parent map
   * plus this element keyed by its widget's constructor.
   *
   * Extension: _inheritedWidgets map for O(1) inherited lookup.
   * Not present in Amp (Z_0 class). See .gap/07-inherited-widget-map.md
   */
  override _updateInheritedWidgets(
    parentMap: Map<Function, InheritedElement> | null
  ): void {
    const newMap = new Map(parentMap ?? undefined);
    newMap.set(this.widget.constructor, this);
    this._inheritedWidgets = newMap;
  }

  /**
   * Override mount to ensure _inheritedWidgets is initialized before
   * children are added. If this InheritedElement is at the root of the
   * tree (no parent called addChild), _inheritedWidgets will still be null.
   * We initialize it here so children receive a valid map.
   *
   * Extension: _inheritedWidgets map. See .gap/07-inherited-widget-map.md
   */
  override mount(): void {
    // If _inheritedWidgets is still null (e.g., root InheritedElement
    // or element not yet added to a tree), initialize the map now.
    if (this._inheritedWidgets === null) {
      this._updateInheritedWidgets(null);
    }
    super.mount();
  }

  override unmount(): void {
    this._dependents.clear();
    super.unmount();
  }

  // Amp ref: Z_0.update(newWidget)
  // Note: updateShouldNotify is called with the OLD widget (before widget swap)
  // but BEFORE the child is updated. We use the split _swapWidget/_updateChild
  // pattern to insert notification logic between widget swap and child update.
  override update(newWidget: Widget): void {
    const oldWidget = this.inheritedWidget;
    this._previousWidget = oldWidget;
    this._swapWidget(newWidget);

    // Notify dependents if data changed
    if (this.inheritedWidget.updateShouldNotify(oldWidget)) {
      this.notifyDependents();
    }

    this._previousWidget = undefined;

    // Now update the child
    this._updateChild();
  }

  addDependent(element: Element): void {
    this._dependents.add(element);
  }

  removeDependent(element: Element): void {
    this._dependents.delete(element);
  }

  // Amp ref: Z_0.notifyDependents()
  // Extension: calls didChangeDependencies() instead of markNeedsRebuild()
  // so StatefulElement can fire State.didChangeDependencies() before next build.
  // See .gap/01-did-change-dependencies.md
  notifyDependents(): void {
    for (const dep of this._dependents) {
      dep.didChangeDependencies();
    }
  }
}

// ---------------------------------------------------------------------------
// InheritedModelElement<T> — aspect-aware InheritedElement
//
// Extends InheritedElement with per-dependent aspect tracking. Instead of
// a flat Set<Element> for dependents, this uses a Map<Element, Set<T> | null>
// where:
//   - null means "unconditional dependency" (rebuild on any change)
//   - Set<T> means "only rebuild if one of these aspects changed"
//
// Flutter ref: InheritedModelElement<T>
// Gap ref: .gap/08-inherited-model.md
// ---------------------------------------------------------------------------

export class InheritedModelElement<T> extends InheritedElement {
  /**
   * Maps each dependent element to its set of aspects, or null for
   * unconditional (full) dependencies.
   */
  _aspectDependents: Map<Element, Set<T> | null> = new Map();

  constructor(widget: InheritedWidget) {
    super(widget);
  }

  /**
   * Register a dependent with an optional aspect.
   * If aspect is undefined, the dependent is unconditional (always notified).
   * If aspect is provided, it is added to the dependent's aspect set.
   *
   * Calling this multiple times with different aspects accumulates them.
   * Calling once with no aspect makes it unconditional regardless of
   * previous aspect registrations.
   */
  addDependentWithAspect(element: Element, aspect?: T): void {
    // Also register in the base class's _dependents set for unmount cleanup
    super.addDependent(element);

    const existing = this._aspectDependents.get(element);

    if (aspect === undefined) {
      // Unconditional dependency -- overrides any previous aspects
      this._aspectDependents.set(element, null);
    } else if (existing === null) {
      // Already unconditional -- adding an aspect doesn't narrow it
      return;
    } else if (existing) {
      // Add to existing aspect set
      existing.add(aspect);
    } else {
      // First aspect for this dependent
      this._aspectDependents.set(element, new Set([aspect]));
    }
  }

  /**
   * Override addDependent to also track in _aspectDependents as unconditional.
   * This handles the case where a consumer uses the basic
   * dependOnInheritedWidgetOfExactType (no aspect) on an InheritedModel.
   */
  override addDependent(element: Element): void {
    super.addDependent(element);
    // Register as unconditional if not already tracked
    if (!this._aspectDependents.has(element)) {
      this._aspectDependents.set(element, null);
    }
  }

  override removeDependent(element: Element): void {
    super.removeDependent(element);
    this._aspectDependents.delete(element);
  }

  /**
   * Override notifyDependents to perform aspect-aware filtering.
   *
   * For each dependent:
   *   - If aspects is null (unconditional), always notify.
   *   - If aspects is a Set<T>, call updateShouldNotifyDependent()
   *     on the InheritedModel widget to check whether those specific
   *     aspects changed.
   */
  override notifyDependents(): void {
    // Lazy import to avoid circular dependency
    const { InheritedModel } = require('./widget');
    const oldWidget = this._previousWidget;

    for (const [dep, aspects] of this._aspectDependents) {
      if (aspects === null) {
        // Unconditional dependency -- always rebuild
        dep.didChangeDependencies();
      } else if (oldWidget && this.widget instanceof InheritedModel) {
        // Aspect-filtered dependency -- ask the model
        if ((this.widget as any).updateShouldNotifyDependent(oldWidget, aspects)) {
          dep.didChangeDependencies();
        }
      } else {
        // No old widget to compare against (first build?) -- rebuild
        dep.didChangeDependencies();
      }
    }
  }

  override unmount(): void {
    this._aspectDependents.clear();
    super.unmount();
  }
}

// ---------------------------------------------------------------------------
// RenderObjectElement (Amp: oj) — base for render widgets
//
// RenderObject creation is deferred to Plan 03-02b.
// For now, `any` type is used for RenderObject references.
// ---------------------------------------------------------------------------

export class RenderObjectElement extends Element {
  _renderObject: RenderObject | undefined = undefined;

  constructor(widget: Widget) {
    super(widget);
  }

  get renderObjectWidget(): RenderObjectWidget {
    return this.widget as RenderObjectWidget;
  }

  override get renderObject(): RenderObject | undefined {
    return this._renderObject;
  }

  // Amp ref: oj.mount() — creates render object, attaches it
  mount(): void {
    const w = this.renderObjectWidget;
    this._renderObject = w.createRenderObject();
    this.markMounted();
  }

  // Amp ref: oj.unmount()
  // Extended with deactivate()/activate() for lifecycle support.
  // Amp ref deviation: See .gap/02-deactivate-lifecycle.md
  override deactivate(): void {
    // Detach render object from the render tree (but do NOT dispose yet)
    if (this._renderObject) {
      this._renderObject.detach();
    }
    super.deactivate();
  }

  override activate(): void {
    super.activate();
    // Re-attach render object when reactivated
    if (this._renderObject) {
      if (typeof this._renderObject.attach === 'function') {
        this._renderObject.attach();
      }
    }
  }

  override unmount(): void {
    if (this._renderObject) {
      this._renderObject.detach();
      this._renderObject = undefined;
    }
    super.unmount();
  }

  // Amp ref: oj.update(newWidget)
  override update(newWidget: Widget): void {
    super.update(newWidget);
    const w = this.renderObjectWidget;
    if (this._renderObject) {
      w.updateRenderObject(this._renderObject);
    }
  }

  override performRebuild(): void {} // no-op for RenderObjectElements
}

// ---------------------------------------------------------------------------
// SingleChildRenderObjectElement (Amp: uv)
// ---------------------------------------------------------------------------

export class SingleChildRenderObjectElement extends RenderObjectElement {
  _child: Element | undefined = undefined;

  constructor(widget: Widget) {
    super(widget);
  }

  get singleChildWidget(): SingleChildRenderObjectWidget {
    return this.widget as SingleChildRenderObjectWidget;
  }

  get child(): Element | undefined {
    return this._child;
  }

  // Amp ref: uv.mount()
  override mount(): void {
    super.mount();
    const w = this.singleChildWidget;
    if (w.child) {
      this._child = w.child.createElement();
      this.addChild(this._child);
      this._mountChild(this._child);
      if (this._child.renderObject && this.renderObject) {
        // Use the 'child' setter if available (e.g., RenderCenter, RenderPadding).
        // The setter handles both setting _child and calling adoptChild.
        // Fall back to adoptChild for render objects without a child setter.
        if (isSingleChildRenderObject(this.renderObject)) {
          this.renderObject.child = this._child.renderObject!;
        } else {
          this.renderObject.adoptChild(this._child.renderObject!);
        }
      }
    }
  }

  // Amp ref: uv.unmount()
  // Extended with deactivate() for lifecycle support.
  // Amp ref deviation: See .gap/02-deactivate-lifecycle.md
  override deactivate(): void {
    if (this._child) {
      this._child.deactivate();
    }
    super.deactivate();
  }

  override unmount(): void {
    if (this._child) {
      this._child.unmount();
      this.removeChild(this._child);
      this._child = undefined;
    }
    super.unmount();
  }

  // Amp ref: uv.update(newWidget) — 4-case updateChild logic inlined
  override update(newWidget: Widget): void {
    super.update(newWidget);
    const w = this.singleChildWidget;

    if (w.child && this._child) {
      // Case: (old=child, new=widget) -> canUpdate ? update : replace
      if (this._child.widget.canUpdate(w.child)) {
        this._child.update(w.child);
      } else {
        this._child.unmount();
        this.removeChild(this._child);
        this._child = w.child.createElement();
        this.addChild(this._child);
        this._mountChild(this._child);
        if (this.renderObject) {
          if (isContainerRenderObject(this.renderObject) && this.renderObject.removeAllChildren) {
            this.renderObject.removeAllChildren();
          }
          if (this._child.renderObject) {
            if (isSingleChildRenderObject(this.renderObject)) {
              this.renderObject.child = this._child.renderObject!;
            } else {
              this.renderObject.adoptChild(this._child.renderObject!);
            }
          }
        }
      }
    } else if (w.child && !this._child) {
      // Case: (old=null, new=widget) -> inflate
      this._child = w.child.createElement();
      this.addChild(this._child);
      this._mountChild(this._child);
      if (this.renderObject && this._child.renderObject) {
        this.renderObject.adoptChild(this._child.renderObject);
      }
    } else if (!w.child && this._child) {
      // Case: (old=child, new=null) -> unmount
      this._child.unmount();
      this.removeChild(this._child);
      this._child = undefined;
      if (this.renderObject && isContainerRenderObject(this.renderObject) && this.renderObject.removeAllChildren) {
        this.renderObject.removeAllChildren();
      }
    }
    // Case: (old=null, new=null) -> nothing (implicit)
  }

  override performRebuild(): void {}

  private _mountChild(child: Element): void {
    child.mount();
  }
}

// ---------------------------------------------------------------------------
// MultiChildRenderObjectElement (Amp: rJ)
// Uses updateChildren() — the THREE-PHASE O(N) algorithm
// ---------------------------------------------------------------------------

export class MultiChildRenderObjectElement extends RenderObjectElement {
  _childElements: Element[] = [];

  constructor(widget: Widget) {
    super(widget);
  }

  get multiChildWidget(): MultiChildRenderObjectWidget {
    return this.widget as MultiChildRenderObjectWidget;
  }

  override get children(): Element[] {
    return this._childElements;
  }

  // Amp ref: rJ.mount()
  override mount(): void {
    super.mount();
    const w = this.multiChildWidget;
    if (w.children) {
      for (const childWidget of w.children) {
        const elem = childWidget.createElement();
        this._childElements.push(elem);
        this.addChild(elem);
        this._mountChild(elem);
        if (elem.renderObject && this.renderObject) {
          // Use insert() for ContainerRenderBox which adds to _children and calls adoptChild.
          // Fall back to adoptChild for other render object types.
          if (isContainerRenderObject(this.renderObject)) {
            this.renderObject.insert(elem.renderObject!);
          } else {
            this.renderObject.adoptChild(elem.renderObject!);
          }
          // Re-apply parent data after insertion.
          // setupParentData (called by insert/adoptChild) may have created a fresh
          // FlexParentData, overwriting values set by ParentDataElement._applyParentData()
          // during _mountChild. Re-applying restores flex/fit values.
          this._reapplyParentData(elem);
        }
      }
    }
  }

  // Amp ref: rJ.unmount()
  // Extended with deactivate() for lifecycle support.
  // Amp ref deviation: See .gap/02-deactivate-lifecycle.md
  override deactivate(): void {
    for (const elem of this._childElements) {
      elem.deactivate();
    }
    super.deactivate();
  }

  override unmount(): void {
    for (const elem of this._childElements) {
      elem.unmount();
      this.removeChild(elem);
    }
    this._childElements.length = 0;
    super.unmount();
  }

  // Amp ref: rJ.update(newWidget)
  override update(newWidget: Widget): void {
    super.update(newWidget);
    const w = this.multiChildWidget;
    this.updateChildren(this._childElements, [...(w.children || [])]);
  }

  // =====================================================================
  // updateChildren(oldElements, newWidgets)
  //
  // Three-phase O(N) algorithm (Amp ref: rJ.updateChildren):
  //   Phase 1: Top-down scan (match from start while canUpdate)
  //   Phase 2: Bottom-up scan (match from end while canUpdate)
  //   Phase 3: Key-map middle reconciliation
  // =====================================================================
  updateChildren(oldElements: (Element | null)[], newWidgets: Widget[]): void {
    const result: Element[] = [];
    let oldStart = 0;
    let newStart = 0;
    let oldEnd = oldElements.length - 1;
    let newEnd = newWidgets.length - 1;

    // --- Phase 1: Top-down scan ---
    // Walk forward while old and new match (canUpdate)
    while (oldStart <= oldEnd && newStart <= newEnd) {
      const oldElem = oldElements[oldStart];
      const newWidget = newWidgets[newStart];
      if (!oldElem || !newWidget || !oldElem.widget.canUpdate(newWidget)) break;
      if (oldElem.widget !== newWidget) {
        oldElem.update(newWidget);
      }
      result.push(oldElem);
      oldStart++;
      newStart++;
    }

    // --- Phase 2: Bottom-up scan ---
    // Walk backward while old and new match (canUpdate)
    const bottomResult: Element[] = [];
    while (oldStart <= oldEnd && newStart <= newEnd) {
      const oldElem = oldElements[oldEnd];
      const newWidget = newWidgets[newEnd];
      if (!oldElem || !newWidget || !oldElem.widget.canUpdate(newWidget)) break;
      if (oldElem.widget !== newWidget) {
        oldElem.update(newWidget);
      }
      bottomResult.unshift(oldElem);
      oldEnd--;
      newEnd--;
    }

    // --- Phase 3: Middle reconciliation ---
    if (oldStart > oldEnd) {
      // All old elements matched; remaining new widgets are insertions
      for (let i = newStart; i <= newEnd; i++) {
        const w = newWidgets[i];
        if (w) {
          const elem = this.createChildElement(w);
          result.push(elem);
        }
      }
    } else if (newStart > newEnd) {
      // All new widgets matched; remaining old elements are removals
      for (let i = oldStart; i <= oldEnd; i++) {
        const elem = oldElements[i];
        if (elem) this.deactivateChild(elem);
      }
    } else {
      // Build key maps for the remaining old elements
      const oldKeyedChildren = new Map<string, Element>();
      const oldKeyedIndices = new Map<string, number>();

      for (let i = oldStart; i <= oldEnd; i++) {
        const elem = oldElements[i];
        if (elem && elem.widget.key) {
          const keyStr = elem.widget.key.toString();
          oldKeyedChildren.set(keyStr, elem);
          oldKeyedIndices.set(keyStr, i);
        }
      }

      // Match remaining new widgets against old elements
      for (let i = newStart; i <= newEnd; i++) {
        const newWidget = newWidgets[i];
        if (!newWidget) continue;

        let match: Element | undefined;

        if (newWidget.key) {
          // --- Keyed match ---
          const keyStr = newWidget.key.toString();
          match = oldKeyedChildren.get(keyStr);
          if (match) {
            oldKeyedChildren.delete(keyStr);
            const oldIdx = oldKeyedIndices.get(keyStr);
            if (oldIdx !== undefined) {
              oldElements[oldIdx] = null; // mark consumed
            }

            if (match.widget === newWidget) {
              // identity match, no update needed
            } else if (match.widget.canUpdate(newWidget)) {
              match.update(newWidget);
            } else {
              this.deactivateChild(match);
              match = this.createChildElement(newWidget);
            }
          } else {
            match = this.createChildElement(newWidget);
          }
        } else {
          // --- Non-keyed match: linear scan for compatible element ---
          let found = false;
          for (let j = oldStart; j <= oldEnd; j++) {
            const oldElem = oldElements[j];
            if (oldElem && !oldElem.widget.key) {
              if (oldElem.widget === newWidget) {
                match = oldElem;
                oldElements[j] = null;
                found = true;
                break;
              } else if (oldElem.widget.canUpdate(newWidget)) {
                match = oldElem;
                oldElements[j] = null;
                match.update(newWidget);
                found = true;
                break;
              }
            }
          }
          if (!found) {
            match = this.createChildElement(newWidget);
          }
        }

        if (match) result.push(match);
      }

      // Deactivate remaining unmatched old elements
      for (let i = oldStart; i <= oldEnd; i++) {
        const elem = oldElements[i];
        if (elem) this.deactivateChild(elem);
      }
      for (const elem of oldKeyedChildren.values()) {
        this.deactivateChild(elem);
      }
    }

    // Merge top + middle + bottom
    result.push(...bottomResult);
    this._childElements = result;
  }

  createChildElement(widget: Widget): Element {
    const elem = widget.createElement();
    this.addChild(elem);
    this._mountChild(elem);
    // Wire render object to parent
    if (elem.renderObject && this.renderObject) {
      if (isContainerRenderObject(this.renderObject)) {
        this.renderObject.insert(elem.renderObject!);
      } else {
        this.renderObject.adoptChild(elem.renderObject!);
      }
      // Re-apply parent data after insertion (see mount() comment)
      this._reapplyParentData(elem);
    }
    return elem;
  }

  deactivateChild(elem: Element): void {
    elem.deactivate();
    this.removeChild(elem);
    // Register with BuildOwner's inactive elements for end-of-frame cleanup
    try {
      const binding = require('./binding');
      const buildOwner = binding.getBuildOwner?.();
      if (buildOwner && typeof buildOwner._addToInactiveElements === 'function') {
        buildOwner._addToInactiveElements(elem);
      }
    } catch (_e) {
      // BuildOwner not yet initialized — skip inactive element registration
    }
  }

  override performRebuild(): void {}

  private _mountChild(child: Element): void {
    child.mount();
  }

  /**
   * Re-apply parent data after a child render object has been adopted.
   *
   * During mount, ParentDataElement._applyParentData() runs before the
   * render object is inserted into its parent. The insert/adoptChild call
   * triggers setupParentData which creates a fresh ParentData instance,
   * overwriting values like flex/fit. This method walks the child element
   * to find ParentDataElement ancestors and re-applies their data.
   */
  private _reapplyParentData(elem: Element): void {
    // If the element itself is a ParentDataElement-like (has _applyParentData),
    // call it directly to re-apply flex/fit/etc.
    const elemWithParentData = elem as unknown as { _applyParentData?: () => void };
    if (typeof elemWithParentData._applyParentData === 'function') {
      elemWithParentData._applyParentData();
    }
  }
}

// ---------------------------------------------------------------------------
// LeafRenderObjectElement (Amp: O$)
// ---------------------------------------------------------------------------

export class LeafRenderObjectElement extends RenderObjectElement {
  constructor(widget: Widget) {
    super(widget);
  }

  get leafWidget(): LeafRenderObjectWidget {
    return this.widget as LeafRenderObjectWidget;
  }

  override performRebuild(): void {} // no children to rebuild
}

// ---------------------------------------------------------------------------
// BuildContextImpl (Amp: jd)
//
// In Amp, BuildContext (jd) is a concrete class separate from Element.
// It stores element, widget, mediaQuery, parent references.
// We implement it here for use by component elements.
// ---------------------------------------------------------------------------

export class BuildContextImpl implements BuildContext {
  element: Element;
  widget: Widget;

  constructor(element: Element, widget: Widget) {
    this.element = element;
    this.widget = widget;
  }

  get mounted(): boolean {
    return this.element.mounted;
  }

  /**
   * Convenience shortcut: look up MediaQueryData from nearest ancestor MediaQuery.
   * Returns its data, or undefined if not found.
   * Amp ref: jd.mediaQuery field
   */
  get mediaQuery(): MediaQueryData | undefined {
    try {
      const { MediaQuery } = require('../widgets/media-query');
      const element = this.element.dependOnInheritedWidgetOfExactType(MediaQuery);
      if (element) {
        const mq = element.widget as { data?: MediaQueryData };
        return mq.data;
      }
    } catch (_e) {
      // MediaQuery module not available
    }
    return undefined;
  }

  // Amp ref: State._markNeedsBuild() calls this.context.element.markNeedsBuild()
  // We expose markNeedsBuild on the context so State._markNeedsBuild can find it.
  markNeedsBuild(): void {
    this.element.markNeedsBuild();
  }

  markNeedsRebuild(): void {
    this.element.markNeedsRebuild();
  }

  // Amp ref: jd.findAncestorElementOfType
  findAncestorElementOfType<T extends Element>(elementType: AbstractConstructor<T>): T | null {
    return this.element.findAncestorElementOfType(elementType);
  }

  // Amp ref: jd.findAncestorWidgetOfType
  findAncestorWidgetOfType<T extends Widget>(widgetType: AbstractConstructor<T>): T | null {
    return this.element.findAncestorWidgetOfType(widgetType);
  }

  // Amp ref: jd.dependOnInheritedWidgetOfExactType
  dependOnInheritedWidgetOfExactType(widgetType: Function): InheritedElement | null {
    return this.element.dependOnInheritedWidgetOfExactType(widgetType);
  }

  /**
   * Look up an InheritedModel<T> and register a dependency on a specific aspect.
   * Gap ref: .gap/08-inherited-model.md
   */
  dependOnInheritedModel<T>(widgetType: Function, aspect?: T): InheritedElement | null {
    return this.element.dependOnInheritedModel(widgetType, aspect);
  }

  // Amp ref: jd.findAncestorStateOfType
  findAncestorStateOfType<T extends State<StatefulWidget>>(stateType: AbstractConstructor<T>): T | null {
    let t = this.element.parent;
    while (t) {
      if (t instanceof StatefulElement && t.state instanceof stateType) {
        return t.state;
      }
      t = t.parent;
    }
    return null;
  }
}
