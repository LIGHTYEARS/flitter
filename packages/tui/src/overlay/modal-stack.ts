/**
 * ModalStack — push/pop modal management system.
 *
 * Provides a controller (ModalStackController) and widget (ModalStackWidget)
 * for displaying nested modals stacked on top of a root content widget.
 *
 * 逆向: modules/2484_unknown_CZT.js — CZT (controller)
 * 逆向: modules/1472_tui_components/misc_utils.js:2320-2386 — LZT (widget), MZT (state)
 *
 * CZT API:
 *   - push(widget): void — add a modal
 *   - pop(): boolean — remove top modal, false if empty
 *   - canPop: boolean — whether stack is non-empty
 *   - _attach(state): void / _detach(): void — for state binding
 *
 * MZT.build():
 *   Returns Stack({ fit: "expand", children: [root, ...modals.map(m => Offstage(false, m))] })
 *
 * @module
 */

import type { BuildContext, Widget } from "../index.js";
import { State, StatefulWidget } from "../tree/stateful-widget.js";
import { Offstage } from "../widgets/offstage.js";
import { Stack } from "../widgets/stack.js";

// ════════════════════════════════════════════════════
//  ModalStackController
// ════════════════════════════════════════════════════

/**
 * Controller for managing a stack of modal widgets.
 *
 * 逆向: CZT in modules/2484_unknown_CZT.js
 *   - this._entries = []
 *   - this._state = null
 *   - push(T) { this._entries.push({ key: UniqueKey(), widget: T }); this._state?.setState() }
 *   - pop() { if (!this._entries.length) return false; this._entries.pop(); this._state?.setState(); return true; }
 *   - get canPop() { return this._entries.length > 0 }
 */
export class ModalStackController {
  private _entries: Array<{ id: number; widget: Widget }> = [];
  private _listeners: Set<() => void> = new Set();
  private _nextId = 0;

  /** Whether there are any modals that can be popped. */
  get canPop(): boolean {
    return this._entries.length > 0;
  }

  /** Number of modals currently in the stack. */
  get length(): number {
    return this._entries.length;
  }

  /**
   * Push a modal widget onto the stack.
   * 逆向: CZT.push(T)
   */
  push(widget: Widget): void {
    this._entries.push({ id: this._nextId++, widget });
    this._notifyListeners();
  }

  /**
   * Pop the top modal from the stack.
   * Returns false if the stack was empty.
   * 逆向: CZT.pop()
   */
  pop(): boolean {
    if (this._entries.length === 0) return false;
    this._entries.pop();
    this._notifyListeners();
    return true;
  }

  /** Get current modal entries (read-only snapshot). */
  get entries(): ReadonlyArray<{ id: number; widget: Widget }> {
    return this._entries;
  }

  /** Register a listener for stack changes. */
  addListener(fn: () => void): void {
    this._listeners.add(fn);
  }

  /** Remove a previously registered listener. */
  removeListener(fn: () => void): void {
    this._listeners.delete(fn);
  }

  private _notifyListeners(): void {
    for (const fn of this._listeners) {
      fn();
    }
  }
}

// ════════════════════════════════════════════════════
//  ModalStackWidget
// ════════════════════════════════════════════════════

/**
 * Config for ModalStackWidget.
 *
 * 逆向: LZT({ root, controller })
 */
export interface ModalStackWidgetConfig {
  /** Base content widget (always visible underneath modals). */
  root: Widget;
  /** Controller managing the modal stack. */
  controller: ModalStackController;
}

/**
 * ModalStackWidget — renders a root widget with stacked modals on top.
 *
 * 逆向: LZT extends NR (StatefulWidget) — misc_utils.js:2320-2340
 */
export class ModalStackWidget extends StatefulWidget {
  readonly config: ModalStackWidgetConfig;

  constructor(config: ModalStackWidgetConfig) {
    super();
    this.config = config;
  }

  createState(): ModalStackState {
    return new ModalStackState();
  }
}

// ════════════════════════════════════════════════════
//  ModalStackState
// ════════════════════════════════════════════════════

/**
 * State for ModalStackWidget.
 *
 * 逆向: MZT extends wR (State) — misc_utils.js:2342-2386
 *
 * MZT.initState():
 *   this.widget.controller._attach(this)
 * MZT.dispose():
 *   this.widget.controller._detach()
 * MZT.build():
 *   Stack({ fit: "expand", children: [root, ...entries.map(e => Offstage(false, e.widget))] })
 */
export class ModalStackState extends State<ModalStackWidget> {
  private _onControllerChange = (): void => {
    this.setState(() => {});
  };

  initState(): void {
    super.initState();
    this.widget.config.controller.addListener(this._onControllerChange);
  }

  dispose(): void {
    this.widget.config.controller.removeListener(this._onControllerChange);
    super.dispose();
  }

  didUpdateWidget(oldWidget: ModalStackWidget): void {
    if (oldWidget.config.controller !== this.widget.config.controller) {
      oldWidget.config.controller.removeListener(this._onControllerChange);
      this.widget.config.controller.addListener(this._onControllerChange);
    }
  }

  /**
   * Build the modal stack.
   *
   * 逆向: MZT.build(T) — misc_utils.js:2362-2386
   *   let t = [this.widget.root];
   *   for (let r of this.entries) {
   *     t.push(new VT({ offstage: false, child: r.widget }));
   *   }
   *   return new Ta({ fit: "expand", children: t });
   */
  build(_context: BuildContext): Widget {
    const { root, controller } = this.widget.config;
    const children: Widget[] = [root];

    for (const entry of controller.entries) {
      children.push(new Offstage({ offstage: false, child: entry.widget }) as unknown as Widget);
    }

    return new Stack({
      children,
    }) as unknown as Widget;
  }
}
