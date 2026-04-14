/**
 * 焦点树节点 — FocusNode。
 *
 * 维护 parent/children 树结构，处理键盘和粘贴事件的冒泡式分发。
 * requestFocus() 通过静态回调委托给 FocusManager。
 *
 * 逆向参考: `l8` in conversation-ui-logic.js
 *
 * @example
 * ```ts
 * import { FocusNode } from "./focus-node.js";
 *
 * const root = new FocusNode({ debugLabel: "root" });
 * const child = new FocusNode({ debugLabel: "input", onKey: (e) => {
 *   if (e.key === "Enter") return "handled";
 *   return "ignored";
 * }});
 * child._attach(root);
 * child.requestFocus();
 * ```
 *
 * @module
 */

import type { KeyEvent, PasteEvent } from "../vt/types.js";

/**
 * 键盘事件处理结果。
 *
 * - `"handled"`: 事件已处理，不再向上冒泡
 * - `"ignored"`: 事件未处理，继续向上冒泡
 */
export type KeyEventResult = "handled" | "ignored";

/**
 * 键盘事件处理器类型。
 *
 * @param event - 终端键盘事件
 * @returns 处理结果
 */
export type KeyHandler = (event: KeyEvent) => KeyEventResult;

/**
 * 粘贴事件处理器类型。
 *
 * @param event - 终端粘贴事件
 * @returns 处理结果
 */
export type PasteHandler = (event: PasteEvent) => KeyEventResult;

/**
 * FocusNode 构造参数。
 */
export interface FocusNodeOptions {
  /** 调试标签，用于开发时识别节点 */
  debugLabel?: string;
  /** 是否可以请求焦点，默认 true */
  canRequestFocus?: boolean;
  /** 是否跳过焦点遍历，默认 false */
  skipTraversal?: boolean;
  /** 键盘事件处理器 */
  onKey?: KeyHandler;
  /** 粘贴事件处理器 */
  onPaste?: PasteHandler;
}

/**
 * FocusNode — 焦点树节点。
 *
 * 逆向: l8 in conversation-ui-logic.js
 *
 * 维护 parent/children 树结构，处理键盘和粘贴事件的冒泡分发。
 * requestFocus() 通过静态回调委托给 FocusManager。
 *
 * @example
 * ```ts
 * const node = new FocusNode({ debugLabel: "input" });
 * node.addListener((n) => console.log("focus changed:", n.hasFocus));
 * node.requestFocus();
 * ```
 */
export class FocusNode {
  /** 自增 debug ID 计数器 */
  private static _nextDebugId = 0;

  /**
   * 静态回调，由 FocusManager 初始化时设置。
   * requestFocus/unfocus 通过此回调委托给 FocusManager。
   */
  private static _requestFocusCallback:
    | ((node: FocusNode | null) => boolean)
    | null = null;

  private _debugId: string;
  private _parent: FocusNode | null = null;
  private _children: Set<FocusNode> = new Set();
  private _hasPrimaryFocus = false;
  private _canRequestFocus: boolean;
  private _skipTraversal: boolean;
  private _keyHandlers: KeyHandler[] = [];
  private _onPasteCallback: PasteHandler | null = null;
  private _listeners: Set<(node: FocusNode) => void> = new Set();
  private _debugLabel: string | null;

  /**
   * 构造 FocusNode。
   *
   * @param options - 节点配置参数
   *
   * @example
   * ```ts
   * const node = new FocusNode({
   *   debugLabel: "search-input",
   *   canRequestFocus: true,
   *   onKey: (event) => event.key === "Escape" ? "handled" : "ignored",
   * });
   * ```
   */
  constructor(options: FocusNodeOptions = {}) {
    this._debugId = `focus-${FocusNode._nextDebugId++}`;
    this._debugLabel = options.debugLabel ?? null;
    this._canRequestFocus = options.canRequestFocus ?? true;
    this._skipTraversal = options.skipTraversal ?? false;
    if (options.onKey) this._keyHandlers.push(options.onKey);
    this._onPasteCallback = options.onPaste ?? null;
  }

  // ──────────────────────────────────────────────
  // 只读属性
  // ──────────────────────────────────────────────

  /** 节点调试 ID（自增，格式: "focus-N"） */
  get debugId(): string {
    return this._debugId;
  }

  /** 节点调试标签 */
  get debugLabel(): string | null {
    return this._debugLabel;
  }

  /** 父节点 */
  get parent(): FocusNode | null {
    return this._parent;
  }

  /** 子节点集合 */
  get children(): Set<FocusNode> {
    return this._children;
  }

  /** 是否拥有主焦点（当前节点直接持有焦点） */
  get hasPrimaryFocus(): boolean {
    return this._hasPrimaryFocus;
  }

  /**
   * 是否拥有焦点。
   *
   * 当 hasPrimaryFocus 为 true 或当前 primaryFocus 是其后代时返回 true。
   */
  get hasFocus(): boolean {
    if (this._hasPrimaryFocus) return true;
    // 通过回调访问 FocusManager 的 primaryFocus
    const cb = FocusNode._requestFocusCallback as
      | (((n: FocusNode | null) => boolean) & {
          __focusManager?: { primaryFocus: FocusNode | null };
        })
      | null;
    const primary = cb?.__focusManager?.primaryFocus ?? null;
    return primary?._isDescendantOf(this) ?? false;
  }

  // ──────────────────────────────────────────────
  // 可读写属性
  // ──────────────────────────────────────────────

  /** 是否可以请求焦点。设为 false 时，若持有焦点则自动 unfocus。 */
  get canRequestFocus(): boolean {
    return this._canRequestFocus;
  }

  set canRequestFocus(value: boolean) {
    if (this._canRequestFocus !== value) {
      this._canRequestFocus = value;
      if (!value && this._hasPrimaryFocus) this.unfocus();
    }
  }

  /** 是否跳过焦点遍历。 */
  get skipTraversal(): boolean {
    return this._skipTraversal;
  }

  set skipTraversal(value: boolean) {
    this._skipTraversal = value;
  }

  /** 粘贴事件处理器。 */
  get onPaste(): PasteHandler | null {
    return this._onPasteCallback;
  }

  set onPaste(handler: PasteHandler | null) {
    this._onPasteCallback = handler;
  }

  // ──────────────────────────────────────────────
  // 静态方法
  // ──────────────────────────────────────────────

  /**
   * 设置请求焦点的静态回调。
   *
   * 由 FocusManager 初始化时调用，将焦点请求委托给管理器。
   *
   * @param callback - 焦点请求回调函数
   */
  static setRequestFocusCallback(
    callback:
      | (((node: FocusNode | null) => boolean) & {
          __focusManager?: unknown;
        })
      | null,
  ): void {
    FocusNode._requestFocusCallback = callback;
  }

  // ──────────────────────────────────────────────
  // 公共方法
  // ──────────────────────────────────────────────

  /**
   * 请求焦点。
   *
   * 通过静态回调委托给 FocusManager。如果 canRequestFocus 为 false
   * 或无回调注册，返回 false。
   *
   * @returns 是否成功请求焦点
   */
  requestFocus(): boolean {
    if (!this._canRequestFocus) return false;
    if (FocusNode._requestFocusCallback) {
      return FocusNode._requestFocusCallback(this);
    }
    return false;
  }

  /**
   * 取消焦点。
   *
   * 如果当前节点持有主焦点，通过静态回调请求 FocusManager 将焦点设为 null。
   */
  unfocus(): void {
    if (this._hasPrimaryFocus) {
      FocusNode._requestFocusCallback?.(null);
    }
  }

  /**
   * 添加焦点状态变化监听器。
   *
   * @param listener - 监听函数，接收当前节点作为参数
   */
  addListener(listener: (node: FocusNode) => void): void {
    this._listeners.add(listener);
  }

  /**
   * 移除焦点状态变化监听器。
   *
   * @param listener - 要移除的监听函数
   */
  removeListener(listener: (node: FocusNode) => void): void {
    this._listeners.delete(listener);
  }

  // ──────────────────────────────────────────────
  // 内部方法 (供 FocusManager 使用)
  // ──────────────────────────────────────────────

  /**
   * 检查是否为目标节点的后代。
   *
   * @param target - 目标祖先节点
   * @returns 是否为后代
   */
  _isDescendantOf(target: FocusNode | null): boolean {
    if (target === null) return false;
    if (this._parent === target) return true;
    return this._parent?._isDescendantOf(target) ?? false;
  }

  /**
   * 将节点挂入焦点树。
   *
   * 如果已有父节点，先从旧父节点移除。
   *
   * @param parent - 新的父节点
   */
  _attach(parent: FocusNode): void {
    if (this._parent === parent) return;
    if (this._parent) this._parent._children.delete(this);
    this._parent = parent;
    parent._children.add(this);
  }

  /**
   * 从焦点树移除节点。
   *
   * 清除与父节点的关系，如果持有焦点则自动 unfocus。
   */
  _detach(): void {
    if (this._parent) {
      this._parent._children.delete(this);
      this._parent = null;
    }
    if (this._hasPrimaryFocus) this.unfocus();
  }

  /**
   * 设置焦点状态（内部方法）。
   *
   * 设置 hasPrimaryFocus 并通知 listeners 和祖先 listeners。
   *
   * @param value - 焦点状态
   */
  _setFocus(value: boolean): void {
    if (this._hasPrimaryFocus === value) return;
    const hadFocus = this.hasFocus;
    this._hasPrimaryFocus = value;
    const hasFocusNow = this.hasFocus;
    this._notifyListeners();
    if (hadFocus !== hasFocusNow) this._notifyAncestorListeners();
  }

  /**
   * 处理键盘事件。
   *
   * 依次调用注册的 key handler，返回第一个 "handled" 结果。
   *
   * @param event - 键盘事件
   * @returns 处理结果
   */
  _handleKeyEvent(event: KeyEvent): KeyEventResult {
    for (const handler of this._keyHandlers) {
      if (handler(event) === "handled") return "handled";
    }
    return "ignored";
  }

  /**
   * 处理粘贴事件。
   *
   * 调用注册的 paste handler，无 handler 时返回 "ignored"。
   *
   * @param event - 粘贴事件
   * @returns 处理结果
   */
  _handlePasteEvent(event: PasteEvent): KeyEventResult {
    if (this._onPasteCallback) return this._onPasteCallback(event);
    return "ignored";
  }

  /**
   * 销毁节点，清除所有状态和关系。
   *
   * 从父节点分离，分离所有子节点，清除 listeners 和 handlers。
   */
  dispose(): void {
    this._detach();
    for (const child of [...this._children]) {
      child._detach();
    }
    this._children.clear();
    this._listeners.clear();
    this._keyHandlers.length = 0;
    this._onPasteCallback = null;
  }

  // ──────────────────────────────────────────────
  // 私有方法
  // ──────────────────────────────────────────────

  /** 通知所有已注册的 listeners */
  private _notifyListeners(): void {
    for (const listener of this._listeners) listener(this);
  }

  /** 通知所有祖先节点的 listeners */
  private _notifyAncestorListeners(): void {
    let current = this._parent;
    while (current) {
      current._notifyListeners();
      current = current._parent;
    }
  }
}
