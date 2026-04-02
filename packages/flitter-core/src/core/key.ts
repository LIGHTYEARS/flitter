// Key system for widget identity and reconciliation
// Amp ref: Used in Widget.canUpdate() for element reconciliation (widget-tree.md)

/**
 * Minimal element shape used by GlobalKey to avoid circular imports with widget.ts/element.ts.
 * Covers the union of fields accessed: widget, state, _context.
 */
interface GlobalKeyElement {
  readonly widget: unknown;
  readonly state?: unknown;
  readonly _context?: unknown;
}

let _nextUniqueId = 0;
// _nextGlobalId removed — GlobalKey uses static _counter instead

/**
 * Abstract base class for widget keys.
 * Keys control whether an Element can be reused when the widget tree is rebuilt.
 */
export abstract class Key {
  abstract equals(other: Key): boolean;
  abstract toString(): string;
}

/**
 * A key that uses value-based equality.
 * Two ValueKeys with the same value are considered equal.
 */
export class ValueKey<T> extends Key {
  readonly value: T;

  constructor(value: T) {
    super();
    this.value = value;
  }

  equals(other: Key): boolean {
    if (!(other instanceof ValueKey)) return false;
    return this.value === other.value;
  }

  toString(): string {
    return `ValueKey(${this.value})`;
  }
}

/**
 * A key that is unique by identity.
 * Every UniqueKey instance is different from every other, even other UniqueKeys.
 */
export class UniqueKey extends Key {
  readonly _id: number;

  constructor() {
    super();
    this._id = _nextUniqueId++;
  }

  equals(other: Key): boolean {
    return this === other;
  }

  toString(): string {
    return `UniqueKey(#${this._id})`;
  }
}

/**
 * A key that is unique across the entire widget tree and provides
 * cross-tree access to the associated Element, Widget, and State.
 *
 * Amp ref: class Zs extends aJ
 * Source: .reference/element-tree.md lines 149-196
 *        .reference/widget-tree.md lines 98-141
 *
 * Lifecycle:
 *   - _setElement(element) called during Element.markMounted()
 *   - _clearElement() called during Element.unmount()
 *
 * Each GlobalKey can only be associated with one element at a time.
 * Attempting to mount two widgets with the same GlobalKey throws an error.
 */
export class GlobalKey extends Key {
  // Amp ref: Zs._registry = new Map()
  // Static registry: id -> GlobalKey instance (for cross-tree lookup)
  static _registry: Map<string, GlobalKey> = new Map();
  static _counter: number = 0;

  readonly _id: string;
  _currentElement: GlobalKeyElement | undefined = undefined;

  constructor(debugLabel?: string) {
    super();
    if (debugLabel) {
      this._id = `${debugLabel}_${GlobalKey._counter++}`;
    } else {
      this._id = `GlobalKey_${GlobalKey._counter++}`;
    }
    // Amp ref: Zs._registry.set(this._id, this)
    GlobalKey._registry.set(this._id, this);
  }

  // Amp ref: Zs.equals(g)
  equals(other: Key): boolean {
    if (!(other instanceof GlobalKey)) return false;
    return this._id === other._id;
  }

  /**
   * The Element currently associated with this GlobalKey, or undefined
   * if this key is not currently in the tree.
   *
   * Amp ref: Zs.currentElement getter
   */
  get currentElement(): GlobalKeyElement | undefined {
    return this._currentElement;
  }

  /**
   * The Widget of the currently associated Element, or undefined.
   *
   * Amp ref: Zs.currentWidget getter -- this._currentElement?.widget
   */
  get currentWidget(): unknown | undefined {
    return this._currentElement?.widget;
  }

  /**
   * The State of the currently associated Element, if it is a StatefulElement.
   * Returns undefined if the element is not a StatefulElement or if no element
   * is currently associated.
   *
   * Note: Amp does not have a dedicated currentState getter on GlobalKey.
   * This is a convenience accessor matching Flutter's API, implemented
   * via the same mechanism (currentElement.state).
   */
  get currentState(): unknown | undefined {
    const element = this._currentElement;
    if (element && 'state' in element) {
      return element.state;
    }
    return undefined;
  }

  /**
   * The BuildContext of the currently associated Element.
   * Returns undefined if no element is currently associated.
   *
   * Note: In Amp, context is available via the element's _context field.
   * This provides the same access pattern as Flutter's GlobalKey.currentContext.
   */
  get currentContext(): unknown | undefined {
    const element = this._currentElement;
    if (element && '_context' in element) {
      return element._context;
    }
    return undefined;
  }

  /**
   * Called during Element.markMounted() to associate this key with an element.
   * Asserts that the key is not already associated with a different active element.
   *
   * Amp ref: Zs._setElement(g)
   * Extension: During GlobalKey reparenting, the same element may be re-set
   * after reactivation. We allow this case.
   * Amp ref deviation: See .gap/02-deactivate-lifecycle.md
   */
  _setElement(element: GlobalKeyElement): void {
    if (this._currentElement !== undefined && this._currentElement !== element) {
      throw new Error(
        `GlobalKey ${this._id} is already associated with an element. ` +
        `Each GlobalKey can only be used once in the widget tree.`
      );
    }
    this._currentElement = element;
  }

  /**
   * Called during Element.unmount() to disassociate this key from its element.
   *
   * Amp ref: Zs._clearElement()
   */
  _clearElement(): void {
    this._currentElement = undefined;
    // Amp ref: Zs._registry.delete(this._id)
    GlobalKey._registry.delete(this._id);
  }

  toString(): string {
    return `GlobalKey(${this._id})`;
  }

  /**
   * Clear the static registry. Used for testing and app teardown.
   *
   * Amp ref: Zs._clearRegistry()
   */
  static _clearRegistry(): void {
    GlobalKey._registry.clear();
    GlobalKey._counter = 0;
  }
}
