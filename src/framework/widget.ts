// Widget, StatelessWidget, StatefulWidget, State, InheritedWidget, BuildContext
// Amp ref: Sf (Widget), H3 (StatelessWidget), H8 (StatefulWidget), _8 (State), Bt (InheritedWidget), jd (BuildContext)
// Source: amp-strings.txt:529716, 530350

import { Key } from '../core/key';

// Element types are imported lazily to avoid circular dependency issues at module
// evaluation time. The actual element.ts imports from this file, but createElement()
// calls only happen at runtime, so the circular ref resolves fine in ES modules.
// We use inline require-style lazy imports in createElement() methods.

/** Minimal Element interface for forward reference. */
export interface ElementLike {
  readonly widget: Widget;
  readonly mounted: boolean;
  markNeedsBuild?(): void;
  markNeedsRebuild?(): void;
}

/** Minimal BuildContext interface for forward reference. */
export interface BuildContext {
  readonly widget: Widget;
  readonly mounted: boolean;
  /** Convenience shortcut: returns MediaQueryData from nearest ancestor MediaQuery, or undefined. */
  readonly mediaQuery?: any;
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
  abstract createElement(): any; // Returns Element -- typed as any until Element is defined

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

  createElement(): any {
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

  createElement(): any {
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
 * Lifecycle (Amp fidelity):
 *   1. _mount(widget, context)  -- sets widget/context, sets mounted=true, calls initState()
 *   2. build(context)           -- called by StatefulElement.rebuild()
 *   3. _update(newWidget)       -- sets new widget, calls didUpdateWidget(oldWidget)
 *   4. setState(fn?)            -- executes callback, marks element dirty
 *   5. _unmount()               -- sets mounted=false, calls dispose()
 *
 * NO didChangeDependencies() -- Amp doesn't have it.
 * NO deactivate() -- Elements go mounted -> unmounted directly.
 * NO reassemble() -- No hot reload.
 *
 * Amp ref: class _8, amp-strings.txt:529716
 */
export abstract class State<T extends StatefulWidget = StatefulWidget> {
  private _widget?: T;
  private _element?: ElementLike;
  private _mounted: boolean = false;

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
   * Sets widget and context, marks as mounted, then calls initState().
   *
   * Amp ref: _8._mount(widget, context)
   */
  _mount(widget: T, context: BuildContext): void {
    this._widget = widget;
    this._element = context as unknown as ElementLike;
    this._mounted = true;
    this.initState();
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

  // --- Lifecycle hooks (user-overridable) ---

  /**
   * Called once after the State is created and mounted.
   * Override to perform one-time initialization.
   */
  initState(): void {}

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
// InheritedWidget (Amp: Bt)
// ---------------------------------------------------------------------------

/**
 * A widget that propagates data to descendant widgets.
 * Descendants that depend on this widget will rebuild when it changes
 * (if updateShouldNotify returns true).
 *
 * Amp ref: class Bt extends Sf, amp-strings.txt:529716
 */
export abstract class InheritedWidget extends Widget {
  readonly child: Widget;

  constructor(opts: { key?: Key; child: Widget }) {
    super(opts.key !== undefined ? { key: opts.key } : undefined);
    this.child = opts.child;
  }

  createElement(): any {
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
