/**
 * FocusManager -- 焦点树管理器单例。
 *
 * 管理全局焦点状态，处理键盘事件从 primaryFocus 向上冒泡、
 * Tab 导航、焦点历史栈。
 *
 * 逆向参考: `ic` in conversation-ui-logic.js
 *
 * @example
 * ```ts
 * import { FocusManager } from "./focus-manager.js";
 *
 * const fm = FocusManager.instance;
 * const node = new FocusNode({ debugLabel: "input" });
 * fm.registerNode(node);
 * fm.requestFocus(node);
 * fm.handleKeyEvent({ type: "key", key: "a", modifiers: { ... } });
 * ```
 *
 * @module
 */

import type { KeyEvent, PasteEvent } from "../vt/types.js";
import { FocusNode } from "./focus-node.js";

/**
 * FocusManager -- 焦点树管理器单例。
 *
 * 逆向: ic in conversation-ui-logic.js
 *
 * 管理全局焦点状态，处理键盘事件从 primaryFocus 向上冒泡、
 * Tab 导航、焦点历史栈。
 *
 * @example
 * ```ts
 * const fm = FocusManager.instance;
 * const node = new FocusNode({ debugLabel: "input" });
 * fm.registerNode(node);
 * fm.requestFocus(node);
 * console.log(fm.primaryFocus?.debugLabel); // "input"
 * ```
 */
export class FocusManager {
  /** 单例实例 */
  private static _instance: FocusManager | null = null;

  /** 焦点树根作用域节点 */
  private _rootScope: FocusNode;

  /** 当前持有主焦点的节点 */
  private _primaryFocus: FocusNode | null = null;

  /** 可聚焦节点缓存（深度优先遍历结果） */
  private _cachedFocusableNodes: FocusNode[] | null = null;

  /** 焦点历史栈，用于焦点回退 */
  private _primaryFocusStack: FocusNode[] = [];

  /**
   * 构造 FocusManager。
   *
   * 创建 rootScope 节点并设置 FocusNode 的静态回调，
   * 使 node.requestFocus() 委托到本管理器。
   */
  constructor() {
    this._rootScope = new FocusNode({
      debugLabel: "Root Focus Scope",
      canRequestFocus: false,
    });
    const callback = ((node: FocusNode | null) => this.requestFocus(node)) as ((
      node: FocusNode | null,
    ) => boolean) & {
      __focusManager?: FocusManager;
    };
    callback.__focusManager = this;
    FocusNode.setRequestFocusCallback(callback);
  }

  /**
   * 获取单例实例。
   *
   * 若尚未创建，自动创建新实例。
   *
   * @example
   * ```ts
   * const fm = FocusManager.instance;
   * ```
   */
  static get instance(): FocusManager {
    if (!FocusManager._instance) FocusManager._instance = new FocusManager();
    return FocusManager._instance;
  }

  /** 当前持有主焦点的节点，无焦点时为 null */
  get primaryFocus(): FocusNode | null {
    return this._primaryFocus;
  }

  /** 焦点树根作用域节点（canRequestFocus=false，不可聚焦） */
  get rootScope(): FocusNode {
    return this._rootScope;
  }

  /**
   * 请求焦点切换。
   *
   * - 传入 node: 旧焦点 _setFocus(false)，新焦点 _setFocus(true)
   * - 传入 null: 从 _primaryFocusStack 回退到上一个可用焦点节点
   *
   * @param node - 要聚焦的节点，null 表示回退
   * @returns 是否成功切换焦点
   *
   * @example
   * ```ts
   * const node = new FocusNode({ debugLabel: "input" });
   * fm.registerNode(node);
   * fm.requestFocus(node);  // true
   * fm.requestFocus(null);  // 回退到上一个可用节点
   * ```
   */
  requestFocus(node: FocusNode | null): boolean {
    if (this._primaryFocus === node) return true;
    if (node && !node.canRequestFocus) return false;
    if (node && !node.parent) return false;

    if (this._primaryFocus) this._primaryFocus._setFocus(false);

    if (node === null) {
      const old = this._primaryFocus;
      if (old) this._popFromFocusStack(old);
      const prev = this._findPreviousFocusableNode();
      this._primaryFocus = prev;
      if (prev) prev._setFocus(true);
      return true;
    }

    this._primaryFocus = node;
    node._setFocus(true);
    this._pushToFocusStack(node);
    return true;
  }

  /**
   * 处理键盘事件。
   *
   * 从 primaryFocus 向上冒泡，逐个调用 node._handleKeyEvent，
   * 遇到 "handled" 时停止冒泡。
   *
   * @param event - 终端键盘事件
   * @returns 是否有节点处理了该事件
   *
   * @example
   * ```ts
   * const handled = fm.handleKeyEvent({
   *   type: "key",
   *   key: "Enter",
   *   modifiers: { shift: false, alt: false, ctrl: false, meta: false },
   * });
   * ```
   */
  handleKeyEvent(event: KeyEvent): boolean {
    if (!this._primaryFocus) return false;
    let current: FocusNode | null = this._primaryFocus;
    while (current) {
      if (current._handleKeyEvent(event) === "handled") return true;
      current = current.parent;
    }
    return false;
  }

  /**
   * 处理粘贴事件。
   *
   * 从 primaryFocus 向上冒泡，逐个调用 node._handlePasteEvent，
   * 遇到 "handled" 时停止冒泡。
   *
   * @param event - 终端粘贴事件
   * @returns 是否有节点处理了该事件
   *
   * @example
   * ```ts
   * const handled = fm.handlePasteEvent({ type: "paste", text: "hello" });
   * ```
   */
  handlePasteEvent(event: PasteEvent): boolean {
    if (!this._primaryFocus) return false;
    let current: FocusNode | null = this._primaryFocus;
    while (current) {
      if (current._handlePasteEvent(event) === "handled") return true;
      current = current.parent;
    }
    return false;
  }

  /**
   * 注册焦点节点到焦点树。
   *
   * 将节点挂入指定父节点，默认挂入 rootScope。
   * 注册后会使可聚焦节点缓存失效。
   *
   * @param node - 要注册的焦点节点
   * @param parent - 父节点，默认为 rootScope
   *
   * @example
   * ```ts
   * const parent = new FocusNode({ debugLabel: "scope" });
   * const child = new FocusNode({ debugLabel: "input" });
   * fm.registerNode(parent);
   * fm.registerNode(child, parent);
   * ```
   */
  registerNode(node: FocusNode, parent: FocusNode | null = null): void {
    this._invalidateFocusableNodesCache();
    const target = parent ?? this._rootScope;
    node._attach(target);
  }

  /**
   * 从焦点树注销节点。
   *
   * 移除节点，若为 primaryFocus 则自动回退焦点。
   * 注销后会使可聚焦节点缓存失效。
   *
   * @param node - 要注销的焦点节点
   *
   * @example
   * ```ts
   * fm.unregisterNode(node);
   * ```
   */
  unregisterNode(node: FocusNode): void {
    this._invalidateFocusableNodesCache();
    this._popFromFocusStack(node);
    if (this._primaryFocus === node) this.requestFocus(null);
    node._detach();
  }

  /**
   * 聚焦下一个可聚焦节点（Tab 导航）。
   *
   * 循环遍历所有可聚焦节点，从当前焦点位置向前移动。
   *
   * @returns 是否成功切换焦点
   *
   * @example
   * ```ts
   * fm.focusNext(); // Tab 键导航到下一个节点
   * ```
   */
  focusNext(): boolean {
    const nodes = this.findAllFocusableNodes();
    if (nodes.length === 0) return false;
    if (!this._primaryFocus) return this.requestFocus(nodes[0] ?? null);
    const idx = nodes.indexOf(this._primaryFocus);
    if (idx === -1) return this.requestFocus(nodes[0] ?? null);
    const next = (idx + 1) % nodes.length;
    return this.requestFocus(nodes[next] ?? null);
  }

  /**
   * 聚焦上一个可聚焦节点（Shift+Tab 导航）。
   *
   * 循环遍历所有可聚焦节点，从当前焦点位置向后移动。
   *
   * @returns 是否成功切换焦点
   *
   * @example
   * ```ts
   * fm.focusPrevious(); // Shift+Tab 键导航到上一个节点
   * ```
   */
  focusPrevious(): boolean {
    const nodes = this.findAllFocusableNodes();
    if (nodes.length === 0) return false;
    if (!this._primaryFocus) return this.requestFocus(nodes[nodes.length - 1] ?? null);
    const idx = nodes.indexOf(this._primaryFocus);
    if (idx === -1) return this.requestFocus(nodes[nodes.length - 1] ?? null);
    const prev = idx === 0 ? nodes.length - 1 : idx - 1;
    return this.requestFocus(nodes[prev] ?? null);
  }

  /**
   * 深度优先遍历查找所有可聚焦节点。
   *
   * 返回 canRequestFocus=true 且 skipTraversal=false 的节点列表。
   * 结果会被缓存，直到注册/注销操作使缓存失效。
   *
   * @returns 可聚焦节点列表
   *
   * @example
   * ```ts
   * const focusable = fm.findAllFocusableNodes();
   * console.log(focusable.length); // 可聚焦节点数量
   * ```
   */
  findAllFocusableNodes(): FocusNode[] {
    if (this._cachedFocusableNodes !== null) return this._cachedFocusableNodes;
    const result: FocusNode[] = [];
    const walk = (node: FocusNode): void => {
      if (node.canRequestFocus && !node.skipTraversal) result.push(node);
      for (const child of node.children) walk(child);
    };
    walk(this._rootScope);
    this._cachedFocusableNodes = result;
    return result;
  }

  /**
   * 销毁管理器，清空全部状态并重置单例。
   *
   * 清除 primaryFocus、焦点历史栈、可聚焦节点缓存，
   * 销毁 rootScope，并将单例 _instance 设为 null。
   *
   * @example
   * ```ts
   * fm.dispose();
   * // FocusManager.instance 将创建新实例
   * ```
   */
  dispose(): void {
    this._primaryFocus = null;
    this._cachedFocusableNodes = null;
    this._primaryFocusStack = [];
    this._rootScope.dispose();
    FocusManager._instance = null;
  }

  // ──────────────────────────────────────────────
  // 私有方法
  // ──────────────────────────────────────────────

  /** 使可聚焦节点缓存失效 */
  private _invalidateFocusableNodesCache(): void {
    this._cachedFocusableNodes = null;
  }

  /**
   * 将节点推入焦点历史栈。
   *
   * 如果节点已在栈中，先移除再推入顶部，保证栈中无重复。
   */
  private _pushToFocusStack(node: FocusNode): void {
    const idx = this._primaryFocusStack.indexOf(node);
    if (idx !== -1) this._primaryFocusStack.splice(idx, 1);
    this._primaryFocusStack.push(node);
  }

  /**
   * 从焦点历史栈中移除节点。
   *
   * 移除所有匹配项（防御性处理）。
   */
  private _popFromFocusStack(node: FocusNode): void {
    let idx = this._primaryFocusStack.indexOf(node);
    while (idx !== -1) {
      this._primaryFocusStack.splice(idx, 1);
      idx = this._primaryFocusStack.indexOf(node);
    }
  }

  /**
   * 从焦点历史栈中查找上一个可用的焦点节点。
   *
   * 从栈顶开始检查，跳过已分离或不可聚焦的节点。
   */
  private _findPreviousFocusableNode(): FocusNode | null {
    while (this._primaryFocusStack.length > 0) {
      const top = this._primaryFocusStack[this._primaryFocusStack.length - 1]!;
      if (top.parent && top.canRequestFocus && !top.skipTraversal) return top;
      this._primaryFocusStack.pop();
    }
    return null;
  }
}
