/**
 * Shortcuts Widget — 桥接 Focus 系统和 Actions 系统。
 *
 * 逆向: amp kc (widget) + GXT (state) in actions_intents.js:136-200
 *
 * Shortcuts 拦截 key 事件，通过 ShortcutManager 匹配 Intent，
 * 然后通过 ActionDispatcher 在 Widget 树中查找并调用对应的 Action。
 *
 * 如果提供了外部 focusNode，直接在其上注册 key handler。
 * 如果没有，则在 build() 中用 Focus widget 包裹 child。
 *
 * @module
 */

import type { FocusNode, KeyEventResult } from "../focus/focus-node.js";
import type { BuildContext, Widget as WidgetInterface } from "../tree/element.js";
import { State, StatefulWidget } from "../tree/stateful-widget.js";
import type { Key } from "../tree/widget.js";
import type { KeyEvent } from "../vt/types.js";
import { Focus } from "../widgets/focus.js";
import { ActionDispatcher } from "./action-dispatcher.js";
import type { Intent } from "./intent.js";
import type { KeyActivator } from "./key-activator.js";
import { ShortcutManager } from "./shortcut-manager.js";

// ════════════════════════════════════════════════════
//  Shortcuts Widget
// ════════════════════════════════════════════════════

/** Shortcuts 构造函数参数 */
interface ShortcutsArgs {
  key?: Key;
  shortcuts: Map<KeyActivator, Intent>;
  child: WidgetInterface;
  manager?: ShortcutManager;
  focusNode?: FocusNode;
  debugLabel?: string;
}

/**
 * Shortcuts Widget — 桥接 Focus 和 Actions。
 *
 * 逆向: amp kc in actions_intents.js:136-158
 */
export class Shortcuts extends StatefulWidget {
  readonly shortcuts: Map<KeyActivator, Intent>;
  readonly child: WidgetInterface;
  readonly manager: ShortcutManager | undefined;
  readonly focusNode: FocusNode | undefined;
  readonly debugLabel: string | undefined;

  constructor(args: ShortcutsArgs) {
    super({ key: args.key });
    this.shortcuts = args.shortcuts;
    this.child = args.child;
    this.manager = args.manager;
    this.focusNode = args.focusNode;
    this.debugLabel = args.debugLabel;
  }

  createState(): State {
    return new ShortcutsState();
  }
}

// ════════════════════════════════════════════════════
//  ShortcutsState
// ════════════════════════════════════════════════════

/**
 * Shortcuts Widget 的状态。
 *
 * 逆向: amp GXT in actions_intents.js:159-200
 *
 * 使用箭头函数 handleKeyEvent 保持稳定引用，
 * 可在 addKeyHandler/removeKeyHandler 中安全使用。
 */
export class ShortcutsState extends State<Shortcuts> {
  private _manager: ShortcutManager | null = null;

  /**
   * 逆向: amp GXT.handleKeyEvent — 稳定箭头函数引用。
   *
   * 1. ShortcutManager 匹配 key event → Intent
   * 2. invokeIntent 查找并调用 Action
   */
  handleKeyEvent = (event: KeyEvent): KeyEventResult => {
    if (!this._manager) return "ignored";
    const intent = this._manager.handleKeyEvent(event);
    if (intent) {
      if (this._invokeIntent(intent) === "handled") return "handled";
    }
    return "ignored";
  };

  /**
   * 逆向: amp GXT.initState
   */
  override initState(): void {
    super.initState();
    this._createManager();
    // 逆向: amp GXT line 162 — 外部 focusNode 时注册 key handler
    if (this.widget.focusNode) {
      this.widget.focusNode.addKeyHandler(this.handleKeyEvent);
    }
  }

  /**
   * 逆向: amp GXT.didUpdateWidget — 在 shortcuts/manager 变化时重建 manager。
   */
  override didUpdateWidget(prev: Shortcuts): void {
    super.didUpdateWidget(prev);
    if (prev.shortcuts !== this.widget.shortcuts || prev.manager !== this.widget.manager) {
      this._createManager();
    }
  }

  /**
   * 逆向: amp GXT.dispose — 移除外部 focusNode 的 key handler。
   */
  override dispose(): void {
    if (this.widget.focusNode) {
      this.widget.focusNode.removeKeyHandler(this.handleKeyEvent);
    }
    super.dispose();
  }

  /**
   * 逆向: amp GXT.build — 有外部 focusNode 时直接返回 child，
   * 否则用 Focus widget 包裹。
   */
  build(_context: BuildContext): WidgetInterface {
    if (this.widget.focusNode) {
      return this.widget.child;
    }
    // 逆向: amp GXT line 191-198 — 无外部 focusNode 时用 Focus 包裹
    return new Focus({
      onKey: this.handleKeyEvent,
      autofocus: false,
      canRequestFocus: true,
      skipTraversal: false,
      debugLabel: this.widget.debugLabel,
      child: this.widget.child,
    });
  }

  /**
   * 逆向: amp GXT.createManager — 使用外部 manager 或从 shortcuts Map 创建。
   */
  private _createManager(): void {
    if (this.widget.manager) {
      this._manager = this.widget.manager;
    } else {
      this._manager = new ShortcutManager(this.widget.shortcuts);
    }
  }

  /**
   * 逆向: amp GXT.invokeIntent — 创建 ActionDispatcher 查找并调用 Action。
   */
  private _invokeIntent(intent: Intent): "handled" | null {
    const dispatcher = new ActionDispatcher();
    const result = dispatcher.findAction(intent, this.context);
    if (result?.enabled) {
      if (result.action.invoke(intent) === "ignored") return null;
      return "handled";
    }
    return null;
  }
}
