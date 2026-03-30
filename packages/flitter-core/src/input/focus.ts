// Focus management system — FocusNode, FocusScopeNode, FocusManager
// Amp ref: input-system.md Section 7, amp-strings.txt:530126
// Minified: D9 = FocusNode, er = FocusManager

import type { KeyEvent, KeyEventResult } from './events';

// ---------------------------------------------------------------------------
// FocusNode (Amp: D9)
// ---------------------------------------------------------------------------

/**
 * A node in the focus tree. Each FocusNode can receive key events and
 * participates in focus traversal (Tab / Shift+Tab navigation).
 *
 * Tree management:
 * - attach(parent) adds this node as a child of the given parent
 * - detach() removes this node from its parent
 * - When focus changes, listeners are notified up the tree
 */
export class FocusNode {
  // -- Tree structure --
  private _parent: FocusNode | null = null;
  private _children: FocusNode[] = [];

  // -- State --
  private _hasPrimaryFocus: boolean = false;
  private _canRequestFocus: boolean;
  private _skipTraversal: boolean;
  private _disposed: boolean = false;

  // -- Handlers --
  onKey: ((event: KeyEvent) => KeyEventResult) | null;
  onPaste: ((text: string) => void) | null;

  // -- Key handlers (multiple per node) --
  private _keyHandlers: Array<(event: KeyEvent) => KeyEventResult> = [];

  // -- Listeners --
  private _listeners: Array<() => void> = [];

  // -- Debug --
  readonly debugLabel: string | undefined;

  constructor(options?: {
    canRequestFocus?: boolean;
    skipTraversal?: boolean;
    onKey?: (event: KeyEvent) => KeyEventResult;
    onPaste?: (text: string) => void;
    debugLabel?: string;
  }) {
    this._canRequestFocus = options?.canRequestFocus ?? true;
    this._skipTraversal = options?.skipTraversal ?? false;
    this.onKey = options?.onKey ?? null;
    this.onPaste = options?.onPaste ?? null;
    this.debugLabel = options?.debugLabel;
  }

  // -- Tree accessors --

  get parent(): FocusNode | null {
    return this._parent;
  }

  get children(): readonly FocusNode[] {
    return this._children;
  }

  // -- State accessors --

  /**
   * True if THIS node is the primary focused node.
   */
  get hasPrimaryFocus(): boolean {
    return this._hasPrimaryFocus;
  }

  /**
   * True if this node or any descendant has primary focus.
   */
  get hasFocus(): boolean {
    if (this._hasPrimaryFocus) return true;
    for (const child of this._children) {
      if (child.hasFocus) return true;
    }
    return false;
  }

  get canRequestFocus(): boolean {
    return this._canRequestFocus;
  }

  set canRequestFocus(value: boolean) {
    if (this._canRequestFocus === value) return;
    this._canRequestFocus = value;
    // If we can no longer request focus and we have it, unfocus
    if (!value && this._hasPrimaryFocus) {
      this.unfocus();
    }
  }

  get skipTraversal(): boolean {
    return this._skipTraversal;
  }

  set skipTraversal(value: boolean) {
    this._skipTraversal = value;
  }

  get disposed(): boolean {
    return this._disposed;
  }

  // -- Tree management --

  /**
   * Attach this node as a child of the given parent.
   */
  attach(parent: FocusNode): void {
    if (this._parent === parent) return;
    if (this._parent !== null) {
      this.detach();
    }
    this._parent = parent;
    parent._children.push(this);
  }

  /**
   * Remove this node from its parent.
   */
  detach(): void {
    if (this._parent === null) return;

    // Clean up _focusedChild references in ancestor FocusScopeNodes
    // to prevent stale references after overlay dismissal (Gap 29 companion fix)
    let ancestor: FocusNode | null = this._parent;
    while (ancestor !== null) {
      if (ancestor instanceof FocusScopeNode) {
        if (ancestor.focusedChild === this) {
          ancestor._setFocusedChild(null);
        }
        break; // only need to check the nearest scope
      }
      ancestor = ancestor.parent;
    }

    const idx = this._parent._children.indexOf(this);
    if (idx !== -1) {
      this._parent._children.splice(idx, 1);
    }
    // If this node had primary focus, clear it
    if (this._hasPrimaryFocus) {
      this._clearPrimaryFocus();
    }
    this._parent = null;
  }

  // -- Focus management --

  /**
   * Request primary focus for this node.
   * Clears focus from the currently focused node (if any), then sets
   * this node as the primary focus. Notifies listeners up the tree.
   */
  requestFocus(): void {
    if (!this._canRequestFocus) return;
    if (this._disposed) return;

    const manager = FocusManager.instance;

    // Clear existing primary focus -- push previous node to history
    const current = manager.primaryFocus;
    if (current !== null && current !== this) {
      // Record the outgoing focus holder in the history stack
      manager._pushFocusHistory(current);
      current._clearPrimaryFocus();
    }

    // Set this node as primary focus
    this._hasPrimaryFocus = true;

    // Update FocusScopeNode tracking
    this._updateScopeFocusedChild();

    // Notify listeners on this node and ancestors
    this._notifyListenersUpTree();
  }

  /**
   * Remove focus from this node. If this node has primary focus,
   * clears it and notifies listeners.
   */
  unfocus(): void {
    if (!this._hasPrimaryFocus) return;
    this._clearPrimaryFocus();
  }

  /**
   * Move focus to the next focusable node in traversal order.
   * Returns true if focus was moved, false if no suitable target found.
   */
  nextFocus(): boolean {
    const traversable = FocusManager.instance.getTraversableNodes();
    if (traversable.length === 0) return false;

    const currentIndex = traversable.indexOf(this);
    if (currentIndex === -1) {
      // Not in traversal list, focus the first node
      traversable[0].requestFocus();
      return true;
    }

    // Wrap around
    const nextIndex = (currentIndex + 1) % traversable.length;
    traversable[nextIndex].requestFocus();
    return true;
  }

  /**
   * Move focus to the previous focusable node in traversal order.
   * Returns true if focus was moved, false if no suitable target found.
   */
  previousFocus(): boolean {
    const traversable = FocusManager.instance.getTraversableNodes();
    if (traversable.length === 0) return false;

    const currentIndex = traversable.indexOf(this);
    if (currentIndex === -1) {
      // Not in traversal list, focus the last node
      traversable[traversable.length - 1].requestFocus();
      return true;
    }

    // Wrap around
    const prevIndex = (currentIndex - 1 + traversable.length) % traversable.length;
    traversable[prevIndex].requestFocus();
    return true;
  }

  // -- Key handler registration --

  addKeyHandler(handler: (event: KeyEvent) => KeyEventResult): void {
    this._keyHandlers.push(handler);
  }

  removeKeyHandler(handler: (event: KeyEvent) => KeyEventResult): void {
    const idx = this._keyHandlers.indexOf(handler);
    if (idx !== -1) {
      this._keyHandlers.splice(idx, 1);
    }
  }

  /**
   * Dispatch a key event to this node's handlers.
   * First calls onKey, then each registered key handler.
   * Returns "handled" if any handler handled it, "ignored" otherwise.
   */
  handleKeyEvent(event: KeyEvent): KeyEventResult {
    // First, try the onKey handler
    if (this.onKey !== null) {
      const result = this.onKey(event);
      if (result === 'handled') return 'handled';
    }

    // Then try each registered key handler
    for (const handler of this._keyHandlers) {
      const result = handler(event);
      if (result === 'handled') return 'handled';
    }

    return 'ignored';
  }

  // -- Listener management --

  addListener(callback: () => void): void {
    this._listeners.push(callback);
  }

  removeListener(callback: () => void): void {
    const idx = this._listeners.indexOf(callback);
    if (idx !== -1) {
      this._listeners.splice(idx, 1);
    }
  }

  // -- Disposal --

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;

    // Unfocus if needed
    if (this._hasPrimaryFocus) {
      this._clearPrimaryFocus();
    }

    // Detach from tree
    this.detach();

    // Detach all children
    for (const child of [...this._children]) {
      child.detach();
    }

    // Clear handlers and listeners
    this.onKey = null;
    this.onPaste = null;
    this._keyHandlers.length = 0;
    this._listeners.length = 0;
  }

  // -- Internal --

  /** @internal Clear primary focus and notify listeners */
  _clearPrimaryFocus(): void {
    if (!this._hasPrimaryFocus) return;
    this._hasPrimaryFocus = false;
    this._notifyListenersUpTree();
  }

  /** @internal Notify listeners on this node and all ancestors */
  private _notifyListenersUpTree(): void {
    // Notify this node's listeners
    for (const listener of [...this._listeners]) {
      listener();
    }
    // Notify parent's listeners (they track hasFocus which depends on descendants)
    if (this._parent !== null) {
      this._parent._notifyAncestorListeners();
    }
  }

  /** @internal Notify listeners on this node and ancestors (for hasFocus changes) */
  private _notifyAncestorListeners(): void {
    for (const listener of [...this._listeners]) {
      listener();
    }
    if (this._parent !== null) {
      this._parent._notifyAncestorListeners();
    }
  }

  /** @internal Update the nearest ancestor FocusScopeNode's focusedChild */
  private _updateScopeFocusedChild(): void {
    let node: FocusNode | null = this._parent;
    while (node !== null) {
      if (node instanceof FocusScopeNode) {
        node._setFocusedChild(this);
        return;
      }
      node = node._parent;
    }
  }
}

// ---------------------------------------------------------------------------
// FocusScopeNode
// ---------------------------------------------------------------------------

/**
 * A FocusNode that manages focus for its subtree.
 * It tracks which child within its scope currently has focus,
 * and supports autofocus behavior.
 */
export class FocusScopeNode extends FocusNode {
  private _focusedChild: FocusNode | null = null;

  /**
   * The currently focused child within this scope.
   */
  get focusedChild(): FocusNode | null {
    return this._focusedChild;
  }

  /**
   * Request that the given node (which must be a descendant) receive
   * autofocus. Equivalent to requestFocus on that node.
   */
  autofocus(node: FocusNode): void {
    if (!this._isDescendant(node)) return;
    node.requestFocus();
  }

  /** @internal Set the focused child (called from FocusNode.requestFocus and detach) */
  _setFocusedChild(node: FocusNode | null): void {
    this._focusedChild = node;
  }

  /**
   * Check if the given node is a descendant of this scope.
   */
  private _isDescendant(node: FocusNode): boolean {
    let current: FocusNode | null = node;
    while (current !== null) {
      if (current === this) return true;
      current = current.parent;
    }
    return false;
  }
}

// ---------------------------------------------------------------------------
// FocusManager (Amp: er) — Singleton
// ---------------------------------------------------------------------------

/**
 * Singleton manager for the global focus tree. Maintains a root scope,
 * tracks the primary-focused node, and dispatches key/paste events
 * through the focus tree with bubbling.
 *
 * Amp ref: input-system.md Section 7.2, Section 9.2
 */
export class FocusManager {
  private static _instance: FocusManager | null = null;

  /** The root focus scope node of the entire focus tree. */
  readonly rootScope: FocusScopeNode;

  /**
   * Stack of previously focused nodes. When a node receives focus,
   * the previously focused node is pushed onto this stack. When
   * restoreFocus() is called, the top of the stack is popped and
   * re-focused (if still valid).
   *
   * The stack is bounded to prevent unbounded growth. A depth of 8
   * handles any realistic overlay nesting scenario.
   * Gap 29: Focus restoration mechanism for overlay dismissal.
   */
  private _focusHistory: FocusNode[] = [];
  private _restoringFocus = false;
  private static readonly MAX_FOCUS_HISTORY = 8;

  private constructor() {
    this.rootScope = new FocusScopeNode({ debugLabel: 'Root Focus Scope' });
  }

  static get instance(): FocusManager {
    if (FocusManager._instance === null) {
      FocusManager._instance = new FocusManager();
    }
    return FocusManager._instance;
  }

  /** Reset the singleton (for testing). */
  static reset(): void {
    if (FocusManager._instance !== null) {
      FocusManager._instance.clearFocusHistory();
      FocusManager._instance.rootScope.dispose();
      FocusManager._instance = null;
    }
  }

  /**
   * Called internally when a node gains primary focus. Records the
   * previously focused node in the history stack.
   * @internal
   */
  _pushFocusHistory(previousNode: FocusNode): void {
    if (this._restoringFocus) return; // suppress during restoreFocus()
    if (previousNode.disposed) return;
    this._focusHistory.push(previousNode);
    // Trim if over capacity
    if (this._focusHistory.length > FocusManager.MAX_FOCUS_HISTORY) {
      this._focusHistory.shift();
    }
  }

  /**
   * Restore focus to the most recent valid node in the history stack.
   * Walks backward through the stack, skipping disposed or detached
   * nodes, until it finds one that can accept focus. Returns true if
   * focus was restored, false if the stack was exhausted.
   *
   * This is the primary API for focus restoration after overlay
   * dismissal. Gap 29.
   */
  restoreFocus(): boolean {
    while (this._focusHistory.length > 0) {
      const candidate = this._focusHistory.pop()!;
      // Skip disposed nodes (e.g., a previous overlay that was also dismissed)
      if (candidate.disposed) continue;
      // Skip nodes no longer in the tree (detached from parent)
      if (candidate.parent === null && candidate !== this.rootScope) continue;
      // Skip nodes that can no longer accept focus
      if (!candidate.canRequestFocus) continue;
      // Valid candidate -- restore focus without re-pushing the outgoing node
      this._restoringFocus = true;
      try {
        candidate.requestFocus();
      } finally {
        this._restoringFocus = false;
      }
      return true;
    }
    return false;
  }

  /**
   * Clear the focus history stack. Called during reset() for testing
   * and when the focus tree is fundamentally restructured.
   */
  clearFocusHistory(): void {
    this._focusHistory.length = 0;
  }

  /**
   * Peek at the top of the focus history without removing it.
   * Returns null if the stack is empty or all entries are stale.
   * Useful for debugging and testing.
   */
  get previousFocus(): FocusNode | null {
    for (let i = this._focusHistory.length - 1; i >= 0; i--) {
      const node = this._focusHistory[i];
      if (!node.disposed && node.parent !== null) return node;
    }
    return null;
  }

  /**
   * The node that currently has primary focus, or null if none.
   */
  get primaryFocus(): FocusNode | null {
    return this._findPrimaryFocus(this.rootScope);
  }

  /**
   * Register a node in the focus tree. If parent is null,
   * the node is attached to the root scope.
   */
  registerNode(node: FocusNode, parent: FocusNode | null): void {
    const effectiveParent = parent ?? this.rootScope;
    node.attach(effectiveParent);
  }

  /**
   * Unregister a node from the focus tree.
   */
  unregisterNode(node: FocusNode): void {
    node.detach();
  }

  /**
   * Dispatch a key event through the focus tree.
   *
   * Algorithm (from input-system.md Section 9.2):
   * 1. Get the primaryFocus node
   * 2. Call its onKey handler. If "handled", stop.
   * 3. Call each registered key handler. If any returns "handled", stop.
   * 4. If "ignored", bubble up to parent node and repeat
   * 5. Continue until root or "handled"
   */
  dispatchKeyEvent(event: KeyEvent): KeyEventResult {
    let node: FocusNode | null = this.primaryFocus;
    while (node !== null) {
      const result = node.handleKeyEvent(event);
      if (result === 'handled') return 'handled';
      node = node.parent;
    }
    return 'ignored';
  }

  /**
   * Dispatch a paste event to the focused node.
   * Walks up from the primary focus until a node with an onPaste handler
   * is found.
   */
  dispatchPasteEvent(text: string): void {
    let node: FocusNode | null = this.primaryFocus;
    while (node !== null) {
      if (node.onPaste !== null) {
        node.onPaste(text);
        return;
      }
      node = node.parent;
    }
  }

  /**
   * Collect all focusable nodes in DFS traversal order.
   * A node is traversable if canRequestFocus && !skipTraversal.
   * Used by Tab / Shift+Tab navigation.
   */
  getTraversableNodes(): FocusNode[] {
    const result: FocusNode[] = [];
    this._collectTraversable(this.rootScope, result);
    return result;
  }

  // -- Internal helpers --

  private _findPrimaryFocus(node: FocusNode): FocusNode | null {
    if (node.hasPrimaryFocus) return node;
    for (const child of node.children) {
      const found = this._findPrimaryFocus(child);
      if (found !== null) return found;
    }
    return null;
  }

  private _collectTraversable(node: FocusNode, result: FocusNode[]): void {
    // Only include leaf-like nodes that are traversable
    // The root scope itself is not traversable (it's a container)
    if (node !== this.rootScope && node.canRequestFocus && !node.skipTraversal) {
      result.push(node);
    }
    for (const child of node.children) {
      this._collectTraversable(child, result);
    }
  }
}
