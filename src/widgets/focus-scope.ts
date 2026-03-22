// FocusScope / KeyboardListener widget — wraps FocusNode as a widget
// Amp ref: t4 class — behavior-only StatefulWidget managing a FocusNode
// Used to attach focus handling (onKey, onPaste, onFocusChange) to a widget subtree

import {
  Widget,
  StatefulWidget,
  State,
  type BuildContext,
} from '../framework/widget';
import { Key } from '../core/key';
import { FocusNode, FocusManager, FocusScopeNode } from '../input/focus';
import type { KeyEvent, KeyEventResult } from '../input/events';

// ---------------------------------------------------------------------------
// FocusScope (Amp: t4)
// ---------------------------------------------------------------------------

/**
 * A StatefulWidget that wraps a FocusNode as a widget.
 *
 * FocusScope manages a FocusNode's lifecycle and provides callbacks for
 * key events, paste events, and focus changes. If no focusNode is provided,
 * FocusScope creates and manages its own internal FocusNode.
 *
 * Usage:
 *   new FocusScope({
 *     autofocus: true,
 *     onKey: (event) => event.key === 'Escape' ? 'handled' : 'ignored',
 *     child: someWidget,
 *   })
 *
 * Amp ref: t4 class — behavior-only widget for focus management
 */
export class FocusScope extends StatefulWidget {
  readonly focusNode?: FocusNode;
  readonly child: Widget;
  readonly autofocus: boolean;
  readonly canRequestFocus: boolean;
  readonly skipTraversal: boolean;
  readonly onKey?: (event: KeyEvent) => KeyEventResult;
  readonly onPaste?: (text: string) => void;
  readonly onFocusChange?: (hasFocus: boolean) => void;
  readonly debugLabel?: string;

  constructor(opts: {
    key?: Key;
    focusNode?: FocusNode;
    child: Widget;
    autofocus?: boolean;
    canRequestFocus?: boolean;
    skipTraversal?: boolean;
    onKey?: (event: KeyEvent) => KeyEventResult;
    onPaste?: (text: string) => void;
    onFocusChange?: (hasFocus: boolean) => void;
    debugLabel?: string;
  }) {
    super(opts.key !== undefined ? { key: opts.key } : undefined);
    this.focusNode = opts.focusNode;
    this.child = opts.child;
    this.autofocus = opts.autofocus ?? false;
    this.canRequestFocus = opts.canRequestFocus ?? true;
    this.skipTraversal = opts.skipTraversal ?? false;
    this.onKey = opts.onKey;
    this.onPaste = opts.onPaste;
    this.onFocusChange = opts.onFocusChange;
    this.debugLabel = opts.debugLabel;
  }

  createState(): State<FocusScope> {
    return new FocusScopeState();
  }
}

// ---------------------------------------------------------------------------
// FocusScopeState
// ---------------------------------------------------------------------------

/**
 * State for FocusScope. Manages the FocusNode lifecycle:
 * - Creates an internal FocusNode if none was provided
 * - Sets up onKey, onPaste handlers on the effective focus node
 * - Listens for focus changes and calls onFocusChange callback
 * - Registers the node with FocusManager
 * - Handles autofocus
 * - Disposes the owned FocusNode on unmount
 */
class FocusScopeState extends State<FocusScope> {
  private _ownedFocusNode?: FocusNode;
  private _hadFocus: boolean = false;

  /**
   * Returns the effective FocusNode — either the externally provided one
   * or the internally created one.
   */
  get effectiveFocusNode(): FocusNode {
    return this.widget.focusNode ?? this._ownedFocusNode!;
  }

  initState(): void {
    super.initState();
    this._createOrAttachNode();
    this._setupHandlers();
    this._registerNode();

    // Handle autofocus
    if (this.widget.autofocus && this.effectiveFocusNode.canRequestFocus) {
      this.effectiveFocusNode.requestFocus();
    }
  }

  didUpdateWidget(oldWidget: FocusScope): void {
    // If the external focusNode changed, update accordingly
    if (oldWidget.focusNode !== this.widget.focusNode) {
      // Remove listener from old node
      const oldNode = oldWidget.focusNode ?? this._ownedFocusNode!;
      oldNode.removeListener(this._onFocusChanged);

      if (oldWidget.focusNode === undefined && this.widget.focusNode !== undefined) {
        // Was using owned node, now using external node — dispose owned
        if (this._ownedFocusNode) {
          FocusManager.instance.unregisterNode(this._ownedFocusNode);
          this._ownedFocusNode.dispose();
          this._ownedFocusNode = undefined;
        }
      } else if (oldWidget.focusNode !== undefined && this.widget.focusNode === undefined) {
        // Was using external node, now need owned node
        this._createOrAttachNode();
        this._registerNode();
      }

      this._setupHandlers();
    } else {
      // Same node, but properties may have changed
      this._updateNodeProperties();
    }
  }

  dispose(): void {
    // Remove listener
    this.effectiveFocusNode.removeListener(this._onFocusChanged);

    // Unregister from focus manager
    FocusManager.instance.unregisterNode(this.effectiveFocusNode);

    // Dispose owned node
    if (this._ownedFocusNode) {
      this._ownedFocusNode.dispose();
      this._ownedFocusNode = undefined;
    }

    super.dispose();
  }

  build(_context: BuildContext): Widget {
    // FocusScope is a behavior-only widget — it just returns the child
    return this.widget.child;
  }

  // -- Internal helpers --

  /**
   * Creates an internal FocusNode if no external one is provided.
   */
  private _createOrAttachNode(): void {
    if (this.widget.focusNode === undefined) {
      this._ownedFocusNode = new FocusNode({
        canRequestFocus: this.widget.canRequestFocus,
        skipTraversal: this.widget.skipTraversal,
        debugLabel: this.widget.debugLabel,
      });
    }
  }

  /**
   * Sets up the onKey, onPaste handlers and focus change listener on the
   * effective focus node.
   */
  private _setupHandlers(): void {
    const node = this.effectiveFocusNode;

    // Update node properties
    this._updateNodeProperties();

    // Set key/paste handlers
    node.onKey = this.widget.onKey ?? null;
    node.onPaste = this.widget.onPaste ?? null;

    // Track focus state for onFocusChange
    this._hadFocus = node.hasFocus;
    node.addListener(this._onFocusChanged);
  }

  /**
   * Update canRequestFocus and skipTraversal on the effective node.
   */
  private _updateNodeProperties(): void {
    const node = this.effectiveFocusNode;
    node.canRequestFocus = this.widget.canRequestFocus;
    node.skipTraversal = this.widget.skipTraversal;

    // Update handlers
    node.onKey = this.widget.onKey ?? null;
    node.onPaste = this.widget.onPaste ?? null;
  }

  /**
   * Listener callback for focus changes. Fires onFocusChange when the
   * hasFocus state transitions.
   */
  private _onFocusChanged = (): void => {
    if (!this.mounted) return;

    const hasFocus = this.effectiveFocusNode.hasFocus;
    if (hasFocus !== this._hadFocus) {
      this._hadFocus = hasFocus;
      this.widget.onFocusChange?.(hasFocus);
    }
  };

  /**
   * Register the effective focus node with the FocusManager.
   */
  private _registerNode(): void {
    FocusManager.instance.registerNode(this.effectiveFocusNode, null);
  }
}
