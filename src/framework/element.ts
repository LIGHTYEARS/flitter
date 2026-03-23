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
  type BuildContext,
} from './widget';
import { Key } from '../core/key';

// ---------------------------------------------------------------------------
// BuildOwner interface (forward reference — full impl in Plan 03-03)
// Amp ref: NB0 — uses Set for dirty elements
// ---------------------------------------------------------------------------

export interface BuildOwner {
  scheduleBuildFor(element: Element): void;
}

// ---------------------------------------------------------------------------
// Element base class (Amp: T$)
//
// CRITICAL Amp fidelity notes:
// - NO deactivate() — Elements go mounted→unmounted directly
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
  _dirty: boolean = false;
  _cachedDepth: number | undefined = undefined;
  _mounted: boolean = false;

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
    return this._mounted;
  }

  // Base returns undefined — overridden by RenderObjectElement
  get renderObject(): any {
    return undefined;
  }

  // --- update(): just swaps the widget reference ---
  // Amp ref: T$.update(newWidget)
  update(newWidget: Widget): void {
    this.widget = newWidget;
  }

  // --- Child management ---
  // Amp ref: T$.addChild, T$.removeChild, T$.removeAllChildren
  addChild(child: Element): void {
    child.parent = this;
    child._invalidateDepth();
    this._children.push(child);
  }

  removeChild(child: Element): void {
    const idx = this._children.indexOf(child);
    if (idx !== -1) {
      this._children.splice(idx, 1);
      child.parent = undefined;
      child._invalidateDepth();
    }
  }

  removeAllChildren(): void {
    for (const child of this._children) {
      child.parent = undefined;
      child._invalidateDepth();
    }
    this._children.length = 0;
  }

  // --- Lifecycle: mount ---
  // Amp ref: T$.markMounted()
  markMounted(): void {
    this._mounted = true;
    // GlobalKey registration handled by key system if needed
  }

  // --- Lifecycle: unmount ---
  // Amp ref: T$.unmount()
  // NO deactivate() — elements go mounted→unmounted directly
  unmount(): void {
    this._mounted = false;
    this._dirty = false;
    this._cachedDepth = undefined;
    // Unsubscribe from all inherited dependencies
    for (const dep of this._inheritedDependencies) {
      dep.removeDependent(this);
    }
    this._inheritedDependencies.clear();
  }

  // --- Dirty flag / rebuild scheduling ---
  // Amp ref: T$.markNeedsRebuild() — sets _dirty, calls XG8().scheduleBuildFor
  markNeedsRebuild(): void {
    if (!this._mounted) return;
    this._dirty = true;
    // BuildOwner scheduling is handled by whoever sets up the owner.
    // In the actual Amp code this calls XG8().scheduleBuildFor(this),
    // which is the global build scheduler. For testability, we skip
    // the global reference here — the full BuildOwner (Plan 03-03) wires this.
  }

  // Alias used by StatefulElement
  // Amp ref: V_0.markNeedsBuild() -> this.markNeedsRebuild()
  markNeedsBuild(): void {
    this.markNeedsRebuild();
  }

  // --- performRebuild ---
  // Base no-op; overridden by subclasses
  performRebuild(): void {}

  // --- InheritedWidget lookup (walks up parent chain) ---
  // Amp ref: T$.dependOnInheritedWidgetOfExactType(widgetType)
  dependOnInheritedWidgetOfExactType(widgetType: Function): InheritedElement | null {
    let ancestor = this.parent;
    while (ancestor) {
      if (ancestor.widget.constructor === widgetType) {
        if (ancestor instanceof InheritedElement) {
          ancestor.addDependent(this);
          this._inheritedDependencies.add(ancestor);
        }
        return ancestor as InheritedElement;
      }
      ancestor = ancestor.parent;
    }
    return null;
  }

  // --- Ancestor queries ---
  // Amp ref: T$.findAncestorElementOfType
  findAncestorElementOfType(elementType: Function): Element | null {
    let t = this.parent;
    while (t) {
      if (t instanceof (elementType as any)) return t;
      t = t.parent;
    }
    return null;
  }

  // Amp ref: T$.findAncestorWidgetOfType
  findAncestorWidgetOfType(widgetType: Function): Widget | null {
    let t = this.parent;
    while (t) {
      if (t.widget instanceof (widgetType as any)) return t.widget;
      t = t.parent;
    }
    return null;
  }

  // --- Visitor ---
  visitChildren(visitor: (child: Element) => void): void {
    for (const child of this._children) {
      visitor(child);
    }
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

  override get renderObject(): any {
    return this._child?.renderObject;
  }

  // Amp ref: lU0.mount()
  mount(): void {
    this._context = new BuildContextImpl(this, this.widget);
    this.rebuild();
    this.markMounted();
  }

  // Amp ref: lU0.unmount()
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
  rebuild(): void {
    if (!this._context) {
      throw new Error('Cannot rebuild unmounted element');
    }
    const newWidget = this.statelessWidget.build(this._context);

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
    if ('mount' in child && typeof (child as any).mount === 'function') {
      (child as any).mount();
    }
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

  override get renderObject(): any {
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

  // Amp ref: V_0.rebuild() — calls state.build(context), diffs child via canUpdate
  rebuild(): void {
    if (!this._context || !this._state) {
      throw new Error('Cannot rebuild unmounted element');
    }
    const newWidget = this._state.build(this._context);

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
    if ('mount' in child && typeof (child as any).mount === 'function') {
      (child as any).mount();
    }
  }
}

// ---------------------------------------------------------------------------
// InheritedElement (Amp: Z_0)
// ---------------------------------------------------------------------------

export class InheritedElement extends Element {
  _child: Element | undefined = undefined;
  _dependents: Set<Element> = new Set();

  constructor(widget: InheritedWidget) {
    super(widget);
  }

  get inheritedWidget(): InheritedWidget {
    return this.widget as InheritedWidget;
  }

  get child(): Element | undefined {
    return this._child;
  }

  override get renderObject(): any {
    return this._child?.renderObject;
  }

  // Amp ref: Z_0.mount()
  mount(): void {
    this._child = this.inheritedWidget.child.createElement();
    this.addChild(this._child);
    this._mountChild(this._child);
    this.markMounted();
  }

  // Amp ref: Z_0.unmount()
  override unmount(): void {
    if (this._child) {
      this._child.unmount();
      this.removeChild(this._child);
      this._child = undefined;
    }
    this._dependents.clear();
    super.unmount();
  }

  // Amp ref: Z_0.update(newWidget)
  // Note: updateShouldNotify is called with the OLD widget (before super.update swaps it)
  override update(newWidget: Widget): void {
    const oldWidget = this.inheritedWidget;
    super.update(newWidget);
    const newInherited = this.inheritedWidget;

    // Notify dependents if data changed
    if (newInherited.updateShouldNotify(oldWidget)) {
      this.notifyDependents();
    }

    // Update child using canUpdate pattern
    if (this._child && this._child.widget.canUpdate(newInherited.child)) {
      this._child.update(newInherited.child);
    } else {
      if (this._child) {
        this._child.unmount();
        this.removeChild(this._child);
      }
      this._child = newInherited.child.createElement();
      this.addChild(this._child);
      this._mountChild(this._child);
    }
  }

  addDependent(element: Element): void {
    this._dependents.add(element);
  }

  removeDependent(element: Element): void {
    this._dependents.delete(element);
  }

  // Amp ref: Z_0.notifyDependents()
  notifyDependents(): void {
    for (const dep of this._dependents) {
      dep.markNeedsRebuild();
    }
  }

  override performRebuild(): void {}

  private _mountChild(child: Element): void {
    if ('mount' in child && typeof (child as any).mount === 'function') {
      (child as any).mount();
    }
  }
}

// ---------------------------------------------------------------------------
// RenderObjectElement (Amp: oj) — base for render widgets
//
// RenderObject creation is deferred to Plan 03-02b.
// For now, `any` type is used for RenderObject references.
// ---------------------------------------------------------------------------

export class RenderObjectElement extends Element {
  _renderObject: any = undefined;

  constructor(widget: Widget) {
    super(widget);
  }

  get renderObjectWidget(): any {
    return this.widget;
  }

  override get renderObject(): any {
    return this._renderObject;
  }

  // Amp ref: oj.mount() — creates render object, attaches it
  mount(): void {
    const w = this.renderObjectWidget;
    if (w && typeof w.createRenderObject === 'function') {
      this._renderObject = w.createRenderObject();
      if (this._renderObject && typeof this._renderObject.attach === 'function') {
        this._renderObject.attach();
      }
    }
    this.markMounted();
  }

  // Amp ref: oj.unmount()
  override unmount(): void {
    if (this._renderObject) {
      if (typeof this._renderObject.detach === 'function') {
        this._renderObject.detach();
      }
      if (typeof this._renderObject.dispose === 'function') {
        this._renderObject.dispose();
      }
      this._renderObject = undefined;
    }
    super.unmount();
  }

  // Amp ref: oj.update(newWidget)
  override update(newWidget: Widget): void {
    super.update(newWidget);
    const w = this.renderObjectWidget;
    if (this._renderObject && w && typeof w.updateRenderObject === 'function') {
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

  get singleChildWidget(): any {
    return this.widget;
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
        if ('child' in this.renderObject) {
          (this.renderObject as any).child = this._child.renderObject;
        } else if (typeof this.renderObject.adoptChild === 'function') {
          this.renderObject.adoptChild(this._child.renderObject);
        }
      }
    }
  }

  // Amp ref: uv.unmount()
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
          if (typeof this.renderObject.removeAllChildren === 'function') {
            this.renderObject.removeAllChildren();
          }
          if (this._child.renderObject) {
            if ('child' in this.renderObject) {
              (this.renderObject as any).child = this._child.renderObject;
            } else if (typeof this.renderObject.adoptChild === 'function') {
              this.renderObject.adoptChild(this._child.renderObject);
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
        if (typeof this.renderObject.adoptChild === 'function') {
          this.renderObject.adoptChild(this._child.renderObject);
        }
      }
    } else if (!w.child && this._child) {
      // Case: (old=child, new=null) -> unmount
      this._child.unmount();
      this.removeChild(this._child);
      this._child = undefined;
      if (this.renderObject && typeof this.renderObject.removeAllChildren === 'function') {
        this.renderObject.removeAllChildren();
      }
    }
    // Case: (old=null, new=null) -> nothing (implicit)
  }

  override performRebuild(): void {}

  private _mountChild(child: Element): void {
    if ('mount' in child && typeof (child as any).mount === 'function') {
      (child as any).mount();
    }
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

  get multiChildWidget(): any {
    return this.widget;
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
          if (typeof (this.renderObject as any).insert === 'function') {
            (this.renderObject as any).insert(elem.renderObject);
          } else if (typeof this.renderObject.adoptChild === 'function') {
            this.renderObject.adoptChild(elem.renderObject);
          }
        }
      }
    }
  }

  // Amp ref: rJ.unmount()
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
      if (typeof (this.renderObject as any).insert === 'function') {
        (this.renderObject as any).insert(elem.renderObject);
      } else if (typeof this.renderObject.adoptChild === 'function') {
        this.renderObject.adoptChild(elem.renderObject);
      }
    }
    return elem;
  }

  deactivateChild(elem: Element): void {
    elem.unmount();
    this.removeChild(elem);
  }

  override performRebuild(): void {}

  private _mountChild(child: Element): void {
    if ('mount' in child && typeof (child as any).mount === 'function') {
      (child as any).mount();
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

  get leafWidget(): any {
    return this.widget;
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
  get mediaQuery(): any {
    try {
      const { MediaQuery } = require('../widgets/media-query');
      const element = this.element.dependOnInheritedWidgetOfExactType(MediaQuery);
      if (element) {
        const widget = element.widget as any;
        return widget.data;
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
  findAncestorElementOfType(elementType: Function): Element | null {
    let t = this.element.parent;
    while (t) {
      if (t instanceof (elementType as any)) return t;
      t = t.parent;
    }
    return null;
  }

  // Amp ref: jd.findAncestorWidgetOfType
  findAncestorWidgetOfType(widgetType: Function): Widget | null {
    return this.element.findAncestorWidgetOfType(widgetType);
  }

  // Amp ref: jd.dependOnInheritedWidgetOfExactType
  dependOnInheritedWidgetOfExactType(widgetType: Function): InheritedElement | null {
    return this.element.dependOnInheritedWidgetOfExactType(widgetType);
  }

  // Amp ref: jd.findAncestorStateOfType
  findAncestorStateOfType(stateType: Function): State<StatefulWidget> | null {
    let t = this.element.parent;
    while (t) {
      if (t instanceof StatefulElement && t.state instanceof (stateType as any)) {
        return t.state;
      }
      t = t.parent;
    }
    return null;
  }
}
