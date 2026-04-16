/**
 * Focus Widget — 管理 FocusNode 在 Widget 树中的生命周期。
 *
 * 逆向: amp C8 (widget) + EtT (state) in actions_intents.js:67-135
 *
 * Focus 是一个 StatefulWidget，在 initState 中创建或采用一个 FocusNode，
 * 并通过 findAncestorStateOfType 自动挂载到最近的祖先 Focus 节点。
 * build() 返回 widget.child 不变——纯结构/副作用 Widget。
 *
 * @module
 */

import { FocusManager } from "../focus/focus-manager.js";
import type { KeyHandler, PasteHandler } from "../focus/focus-node.js";
import { FocusNode } from "../focus/focus-node.js";
import type { BuildContext, Widget as WidgetInterface } from "../tree/element.js";
import { State, StatefulWidget } from "../tree/stateful-widget.js";
import type { Key } from "../tree/widget.js";

// ════════════════════════════════════════════════════
//  Focus Widget
// ════════════════════════════════════════════════════

/** Focus 构造函数参数。 */
interface FocusArgs {
  key?: Key;
  child: WidgetInterface;
  focusNode?: FocusNode;
  autofocus?: boolean;
  canRequestFocus?: boolean;
  skipTraversal?: boolean;
  onKey?: KeyHandler;
  onPaste?: PasteHandler;
  onFocusChange?: (hasFocus: boolean) => void;
  debugLabel?: string;
}

/**
 * Focus Widget — 在 Widget 树中管理 FocusNode 生命周期。
 *
 * 逆向: amp C8 in actions_intents.js:67-97
 */
export class Focus extends StatefulWidget {
  readonly child: WidgetInterface;
  readonly focusNode: FocusNode | undefined;
  readonly autofocus: boolean;
  readonly canRequestFocus: boolean;
  readonly skipTraversal: boolean;
  readonly onKey: KeyHandler | null;
  readonly onPaste: PasteHandler | null;
  readonly onFocusChange: ((hasFocus: boolean) => void) | null;
  readonly debugLabel: string | null;

  constructor(args: FocusArgs) {
    super({ key: args.key });
    this.child = args.child;
    this.focusNode = args.focusNode;
    this.autofocus = args.autofocus ?? false;
    this.canRequestFocus = args.canRequestFocus ?? true;
    this.skipTraversal = args.skipTraversal ?? false;
    this.onKey = args.onKey ?? null;
    this.onPaste = args.onPaste ?? null;
    this.onFocusChange = args.onFocusChange ?? null;
    this.debugLabel = args.debugLabel ?? null;
  }

  createState(): State {
    return new FocusState();
  }
}

// ════════════════════════════════════════════════════
//  FocusState
// ════════════════════════════════════════════════════

/**
 * Focus Widget 的状态。
 *
 * 逆向: amp EtT in actions_intents.js:98-135
 *
 * 管理 FocusNode 创建/采用、key/paste handler 注册、
 * 自动寻找祖先 FocusState 进行父子挂载、autofocus 排队。
 */
export class FocusState extends State<Focus> {
  private _internalFocusNode: FocusNode | null = null;
  private _isDisposed = false;
  private _focusChangeHandler: ((node: FocusNode) => void) | null = null;

  /**
   * 逆向: amp EtT.effectiveFocusNode
   * — 返回外部节点或内部创建的节点。
   */
  get effectiveFocusNode(): FocusNode {
    return this.widget.focusNode ?? this._internalFocusNode!;
  }

  /**
   * 逆向: amp EtT.initState (actions_intents.js:105-125)
   *
   * 1. 创建或采用 FocusNode
   * 2. 注册 key/paste handler（外部节点用 addKeyHandler）
   * 3. 注册 onFocusChange listener
   * 4. 自动挂载到祖先 Focus
   * 5. autofocus 排队
   */
  override initState(): void {
    super.initState();

    // 逆向: amp EtT line 106-115 — 无外部节点时创建内部节点
    if (!this.widget.focusNode) {
      const opts: {
        canRequestFocus: boolean;
        skipTraversal: boolean;
        onKey?: KeyHandler;
        onPaste?: PasteHandler;
        debugLabel?: string;
      } = {
        canRequestFocus: this.widget.canRequestFocus,
        skipTraversal: this.widget.skipTraversal,
      };
      if (this.widget.onKey) opts.onKey = this.widget.onKey;
      if (this.widget.onPaste) opts.onPaste = this.widget.onPaste;
      if (this.widget.debugLabel) opts.debugLabel = this.widget.debugLabel;
      this._internalFocusNode = new FocusNode(opts);
    }

    // 逆向: amp EtT line 116 — 外部节点时注册 key handler
    if (this.widget.onKey && this.widget.focusNode) {
      this.effectiveFocusNode.addKeyHandler(this.widget.onKey);
    }

    // 逆向: amp EtT line 117 — 设置 paste handler
    if (this.widget.onPaste) {
      this.effectiveFocusNode.onPaste = this.widget.onPaste;
    }

    // 逆向: amp EtT line 118-120 — onFocusChange listener
    if (this.widget.onFocusChange) {
      this._focusChangeHandler = (node: FocusNode) => {
        if (!this._isDisposed && this.widget.onFocusChange) {
          this.widget.onFocusChange(node.hasFocus);
        }
      };
      this.effectiveFocusNode.addListener(this._focusChangeHandler);
    }

    // 逆向: amp EtT line 121 — 自动寻找祖先 FocusState 进行父子挂载
    const ancestorState = this.context.findAncestorStateOfType(FocusState);
    const parentNode = ancestorState?.effectiveFocusNode ?? null;

    // 逆向: amp EtT line 122 — 注册到 FocusManager
    FocusManager.instance.registerNode(this.effectiveFocusNode, parentNode);

    // 逆向: amp EtT line 122-124 — autofocus 排队
    if (this.widget.autofocus) {
      queueMicrotask(() => {
        if (!this._isDisposed) {
          this.effectiveFocusNode.requestFocus();
        }
      });
    }
  }

  /**
   * 逆向: amp EtT.dispose (actions_intents.js:126-131)
   */
  override dispose(): void {
    // 逆向: amp EtT line 127 — 移除 key handler
    if (this.widget.onKey) {
      this.effectiveFocusNode.removeKeyHandler(this.widget.onKey);
    }

    // 逆向: amp EtT line 128 — 注销节点
    FocusManager.instance.unregisterNode(this.effectiveFocusNode);

    // 标记已销毁
    this._isDisposed = true;

    // 逆向: amp EtT line 128 — 移除 focus listener
    if (this._focusChangeHandler) {
      this.effectiveFocusNode.removeListener(this._focusChangeHandler);
      this._focusChangeHandler = null;
    }

    // 逆向: amp EtT line 129 — 销毁内部节点
    if (this._internalFocusNode) {
      this._internalFocusNode.dispose();
      this._internalFocusNode = null;
    }

    super.dispose();
  }

  /**
   * 逆向: amp EtT.build — 返回 widget.child 不变。
   */
  build(_context: BuildContext): WidgetInterface {
    return this.widget.child;
  }
}
