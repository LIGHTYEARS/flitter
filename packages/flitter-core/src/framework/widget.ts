// Widget, StatelessWidget, StatefulWidget, State, InheritedWidget, BuildContext
// Amp ref: Sf (Widget), H3 (StatelessWidget), H8 (StatefulWidget), _8 (State), Bt (InheritedWidget), jd (BuildContext)
// Source: amp-strings.txt:529716, 530350

import { Key } from '../core/key';
import type { RenderObject } from './render-object';
import type { MediaQueryData } from '../widgets/media-query';

// Element types are imported lazily to avoid circular dependency issues at module
// evaluation time. The actual element.ts imports from this file, but createElement()
// calls only happen at runtime, so the circular ref resolves fine in ES modules.
// We use inline require-style lazy imports in createElement() methods.

/** A constructable type (for instanceof checks). */
export type AbstractConstructor<T = unknown> = abstract new (...args: unknown[]) => T;

/** Minimal Element interface for forward reference. */
export interface ElementLike {
  readonly widget: Widget;
  readonly mounted: boolean;
  markNeedsBuild?(): void;
  markNeedsRebuild?(): void;
  mount(): void;
  unmount(): void;
  readonly renderObject?: RenderObject;
  readonly children: ElementLike[];
}

/** Minimal BuildContext interface for forward reference. */
export interface BuildContext {
  readonly widget: Widget;
  readonly mounted: boolean;
  /** Convenience shortcut: returns MediaQueryData from nearest ancestor MediaQuery, or undefined. */
  readonly mediaQuery?: MediaQueryData;
}

// ---------------------------------------------------------------------------
// Widget (Amp: Sf)
// ---------------------------------------------------------------------------

/**
 * Abstract base class for all widgets.
 * A widget describes the configuration for an Element.
 *
 * Amp ref: class Sf, amp-strings.txt:529716
 */
export abstract class Widget {
  readonly key?: Key;

  constructor(opts?: { key?: Key }) {
    if (new.target === Widget) {
      throw new Error('Widget is abstract and cannot be instantiated directly');
    }
    this.key = opts?.key;
  }

  /**
   * Creates the Element that manages this widget in the tree.
   * Concrete subclasses (StatelessWidget, StatefulWidget, etc.) override this.
   */
  abstract createElement(): ElementLike;

  /**
   * Whether an existing element can be updated with a new widget,
   * vs needing to create a replacement element.
   *
   * Two conditions must hold:
   * 1. Same constructor (runtimeType in Dart)
   * 2. Matching keys (both undefined, or both present and equal)
   *
   * Amp ref: Sf.canUpdate (instance method in Amp, static in Flutter)
   * We provide BOTH a static and an instance method for compatibility.
   */
  static canUpdate(oldWidget: Widget, newWidget: Widget): boolean {
    if (oldWidget.constructor !== newWidget.constructor) return false;
    if (oldWidget.key === undefined && newWidget.key === undefined) return true;
    if (oldWidget.key === undefined || newWidget.key === undefined) return false;
    return oldWidget.key.equals(newWidget.key);
  }

  /**
   * Instance-level canUpdate matching Amp's Sf.canUpdate(other).
   * Delegates to the static method.
   */
  canUpdate(other: Widget): boolean {
    return Widget.canUpdate(this, other);
  }

  toString(): string {
    const keyStr = this.key ? `, key: ${this.key}` : '';
    return `${this.constructor.name}(${keyStr})`;
  }
}

// ---------------------------------------------------------------------------
// StatelessWidget (Amp: H3)
// ---------------------------------------------------------------------------

/**
 * A widget that has no mutable state.
 * Subclasses must implement build(context).
 *
 * Amp ref: class H3 extends Sf, amp-strings.txt:530350
 */
export abstract class StatelessWidget extends Widget {
  constructor(opts?: { key?: Key }) {
    super(opts);
  }

  createElement(): ElementLike {
    // Amp ref: H3.createElement() -> new lU0(this)
    // Lazy import to avoid circular dependency at module evaluation time
    const { StatelessElement } = require('./element');
    return new StatelessElement(this);
  }

  /** Build the widget tree for this widget. */
  abstract build(context: BuildContext): Widget;
}

// ---------------------------------------------------------------------------
// StatefulWidget (Amp: H8)
// ---------------------------------------------------------------------------

/**
 * A widget that has mutable state managed by a State object.
 * Subclasses must implement createState().
 *
 * Amp ref: class H8 extends Sf, amp-strings.txt:529716
 */
export abstract class StatefulWidget extends Widget {
  constructor(opts?: { key?: Key }) {
    super(opts);
  }

  createElement(): ElementLike {
    // Amp ref: H8.createElement() -> new V_0(this)
    const { StatefulElement } = require('./element');
    return new StatefulElement(this);
  }

  /** Create the mutable State for this widget. */
  abstract createState(): State<StatefulWidget>;
}

// ---------------------------------------------------------------------------
// State<T> (Amp: _8)
// ---------------------------------------------------------------------------

/**
 * The mutable state for a StatefulWidget.
 *
 * Lifecycle (extended beyond Amp fidelity):
 *   1. _mount(widget, context)  -- sets widget/context, mounted=true,
 *                                  calls initState(), then didChangeDependencies()
 *   2. didChangeDependencies()  -- called when inherited dependencies change
 *   3. build(context)           -- called by StatefulElement.rebuild()
 *   4. _update(newWidget)       -- sets new widget, calls didUpdateWidget(oldWidget)
 *   5. setState(fn?)            -- executes callback, marks element dirty
 *   6. reassemble()             -- hot reload: called when code changes, before rebuild
 *   7. _deactivate()            -- calls deactivate() (element removed but may be reactivated)
 *   8. _activate()              -- restores mounted, calls activate() (element reinserted via GlobalKey)
 *   9. _unmount()               -- sets mounted=false, calls dispose()
 *
 * NOTE: deactivate()/activate() are NOT present in the original Amp binary.
 * This is a deliberate extension to support GlobalKey reparenting,
 * matching Flutter's State lifecycle.
 * Amp ref deviation: See .gap/02-deactivate-lifecycle.md
 *
 * Amp ref: class _8, amp-strings.txt:529716
 * Extension: didChangeDependencies() added for Flutter API parity (not in Amp).
 */
export abstract class State<T extends StatefulWidget = StatefulWidget> {
  private _widget?: T;
  private _element?: ElementLike;
  private _mounted: boolean = false;
  private _dependenciesChanged: boolean = false;

  /** The current widget configuration. */
  get widget(): T {
    return this._widget!;
  }

  /** The BuildContext for this state (the element itself in Amp). */
  get context(): BuildContext {
    return this._element as unknown as BuildContext;
  }

  /** Whether this State is currently in the tree. */
  get mounted(): boolean {
    return this._mounted;
  }

  // --- Internal lifecycle methods (called by the framework) ---

  /**
   * Called by StatefulElement during mount.
   * Sets widget and context, marks as mounted, then calls initState()
   * and didChangeDependencies().
   *
   * Amp ref: _8._mount(widget, context)
   * Extension: didChangeDependencies() added for Flutter API parity.
   */
  _mount(widget: T, context: BuildContext): void {
    this._widget = widget;
    this._element = context as unknown as ElementLike;
    this._mounted = true;
    this.initState();
    this.didChangeDependencies();
  }

  /**
   * Called by StatefulElement during update.
   * Saves old widget, sets new widget, calls didUpdateWidget(oldWidget).
   *
   * Amp ref: _8._update(newWidget)
   */
  _update(newWidget: T): void {
    const oldWidget = this._widget!;
    this._widget = newWidget;
    this.didUpdateWidget(oldWidget);
  }

  /**
   * Called by StatefulElement during unmount.
   * Marks as unmounted, then calls dispose().
   *
   * Amp ref: _8._unmount()
   */
  _unmount(): void {
    this._mounted = false;
    this.dispose();
  }

  /**
   * Called by StatefulElement during deactivation.
   * Delegates to the user-overridable deactivate() hook.
   *
   * NOTE: Not present in Amp binary. Extension for GlobalKey reparenting.
   * Amp ref deviation: See .gap/02-deactivate-lifecycle.md
   */
  _deactivate(): void {
    this.deactivate();
  }

  /**
   * Called by StatefulElement during reactivation.
   * Restores mounted state, then delegates to user-overridable activate() hook.
   *
   * NOTE: Not present in Amp binary. Extension for GlobalKey reparenting.
   * Amp ref deviation: See .gap/02-deactivate-lifecycle.md
   */
  _activate(): void {
    this._mounted = true;
    this.activate();
  }

  /**
   * Called by StatefulElement when inherited dependencies change.
   * Sets flag so didChangeDependencies() fires before next build().
   *
   * This is an internal framework method, not user-facing.
   * Extension: added for Flutter API parity (not in Amp).
   */
  _notifyDependenciesChanged(): void {
    this._dependenciesChanged = true;
  }

  /**
   * Called by StatefulElement.rebuild() before build().
   * If dependencies changed since last build, calls didChangeDependencies()
   * and resets the flag.
   *
   * This is an internal framework method, not user-facing.
   * Extension: added for Flutter API parity (not in Amp).
   */
  _maybeCallDidChangeDependencies(): void {
    if (this._dependenciesChanged) {
      this._dependenciesChanged = false;
      this.didChangeDependencies();
    }
  }

  // --- Lifecycle hooks (user-overridable) ---

  /**
   * Called once after the State is created and mounted.
   * Override to perform one-time initialization.
   */
  initState(): void {}

  /**
   * Called when a dependency of this State object changes.
   *
   * This is called immediately after initState() on the first mount,
   * and subsequently whenever an InheritedWidget that this State
   * depends on (via context.dependOnInheritedWidgetOfExactType)
   * changes.
   *
   * Safe to call BuildContext.dependOnInheritedWidgetOfExactType
   * from this method, unlike initState().
   *
   * Extension: added for Flutter API parity (not in Amp).
   * See .gap/01-did-change-dependencies.md
   */
  didChangeDependencies(): void {}

  /**
   * Called whenever the parent rebuilds with a new widget of the same type.
   * The old widget is passed so you can compare configurations.
   */
  didUpdateWidget(_oldWidget: T): void {}

  /**
   * Build the widget tree for this state.
   * Called by StatefulElement.rebuild().
   */
  abstract build(context: BuildContext): Widget;

  /**
   * Called when this state is permanently removed from the tree.
   * Override to release resources.
   */
  dispose(): void {}

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

  /**
   * Called when this State is temporarily removed from the tree.
   * May be followed by activate() (if GlobalKey reparenting) or dispose().
   * Override to clean up temporary resources that should be released
   * even if the State might be reinserted later.
   *
   * NOTE: Not present in Amp binary. Extension for GlobalKey reparenting.
   * Amp ref deviation: See .gap/02-deactivate-lifecycle.md
   */
  deactivate(): void {}

  /**
   * Called when a previously deactivated State is reinserted into the tree.
   * This happens during GlobalKey reparenting within the same frame.
   *
   * NOTE: Not present in Amp binary. Extension for GlobalKey reparenting.
   * Amp ref deviation: See .gap/02-deactivate-lifecycle.md
   */
  activate(): void {}

  // --- setState ---

  /**
   * Schedule a rebuild for this state's element.
   * Optionally executes a callback first to mutate state synchronously.
   * Throws if called after dispose().
   *
   * Amp ref: _8.setState(fn)
   */
  setState(fn?: () => void): void {
    if (!this._mounted) {
      throw new Error('setState() called after dispose()');
    }
    if (fn) fn();
    this._markNeedsBuild();
  }

  /**
   * Internal: delegates to the element's markNeedsBuild().
   * Amp ref: _8._markNeedsBuild()
   */
  private _markNeedsBuild(): void {
    if (
      this._element &&
      'markNeedsBuild' in this._element &&
      typeof this._element.markNeedsBuild === 'function'
    ) {
      this._element.markNeedsBuild();
    }
  }
}

// ---------------------------------------------------------------------------
// ProxyWidget -- abstract base for single-child pass-through widgets
//
// Flutter has this as an intermediate between Widget and InheritedWidget/
// ParentDataWidget. Amp does not have it (Bt and R_ both extend Sf directly),
// but we introduce it to reduce code duplication in Element subclasses.
//
// NOTE: This is a flitter-specific structural enhancement, NOT an Amp ref.
// ---------------------------------------------------------------------------

/**
 * Abstract base for widgets that have a single child and do not build
 * their own subtree. Both InheritedWidget and ParentDataWidget extend this.
 *
 * ProxyWidget does not add any behavior beyond holding the child reference.
 * Subclasses override createElement() to create the appropriate element.
 */
export abstract class ProxyWidget extends Widget {
  readonly child: Widget;

  constructor(opts: { key?: Key; child: Widget }) {
    super(opts.key !== undefined ? { key: opts.key } : undefined);
    this.child = opts.child;
  }
}

// ---------------------------------------------------------------------------
// InheritedWidget (Amp: Bt)
// ---------------------------------------------------------------------------

/**
 * A widget that propagates data to descendant widgets.
 * Descendants that depend on this widget will rebuild when it changes
 * (if updateShouldNotify returns true).
 *
 * Amp ref: class Bt extends Sf, amp-strings.txt:529716
 * NOTE: In Amp, Bt extends Sf directly. We extend ProxyWidget for DRY.
 */
export abstract class InheritedWidget extends ProxyWidget {
  constructor(opts: { key?: Key; child: Widget }) {
    super(opts);
  }

  createElement(): ElementLike {
    // Amp ref: Bt.createElement() -> new Z_0(this)
    const { InheritedElement } = require('./element');
    return new InheritedElement(this);
  }

  /**
   * Whether dependents should be notified when this widget is updated.
   * Called with the OLD widget; return true if data has changed.
   */
  abstract updateShouldNotify(oldWidget: InheritedWidget): boolean;
}

// ---------------------------------------------------------------------------
// InheritedModel<T> — InheritedWidget with aspect-based dependency tracking
//
// An InheritedWidget subclass that supports fine-grained dependency tracking
// via "aspects". Descendants can declare they only depend on specific aspects
// of the inherited data, and will only rebuild when those aspects change.
//
// Subclasses must implement:
//   - updateShouldNotify(oldWidget) -- coarse check (same as InheritedWidget)
//   - updateShouldNotifyDependent(oldWidget, dependencies) -- fine-grained check
//
// Consumers register aspect dependencies via:
//   InheritedModel.inheritFrom<MyModel>(context, { widgetType: MyModel, aspect: 'fieldName' })
//
// Flutter ref: InheritedModel<T> from package:flutter/widgets.dart
// Gap ref: .gap/08-inherited-model.md
// ---------------------------------------------------------------------------

export abstract class InheritedModel<T> extends InheritedWidget {
  constructor(opts: { key?: Key; child: Widget }) {
    super(opts);
  }

  createElement(): ElementLike {
    const { InheritedModelElement } = require('./element');
    return new InheritedModelElement<T>(this);
  }

  /**
   * Called for each dependent that registered with specific aspects.
   * Return true if the dependent should rebuild given the old widget
   * and the set of aspects that dependent declared interest in.
   *
   * @param oldWidget - The previous widget configuration
   * @param dependencies - The set of aspects this particular dependent cares about
   */
  abstract updateShouldNotifyDependent(
    oldWidget: InheritedModel<T>,
    dependencies: Set<T>,
  ): boolean;

  /**
   * Look up the nearest ancestor InheritedModel of the given type and
   * register a dependency on the specified aspect. If aspect is undefined,
   * a full (unconditional) dependency is registered.
   *
   * @param context - The BuildContext of the consuming widget
   * @param opts.widgetType - The constructor of the InheritedModel subclass
   * @param opts.aspect - Optional aspect to register interest in
   */
  static inheritFrom<M extends InheritedModel<A>, A>(
    context: BuildContext,
    opts: {
      widgetType: new (...args: any[]) => M;
      aspect?: A;
    },
  ): M | null {
    const ctx = context as any;
    if (typeof ctx.dependOnInheritedModel === 'function') {
      const element = ctx.dependOnInheritedModel(opts.widgetType, opts.aspect);
      return element ? (element.widget as M) : null;
    }
    // Fallback: use non-aspect-aware lookup
    if (typeof ctx.dependOnInheritedWidgetOfExactType === 'function') {
      const element = ctx.dependOnInheritedWidgetOfExactType(opts.widgetType);
      return element ? (element.widget as M) : null;
    }
    return null;
  }
}
