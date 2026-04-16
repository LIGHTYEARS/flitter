/**
 * ActionDispatcher — 沿元素树向上查找并调用 Action。
 *
 * 逆向: amp dtT (2095_unknown_dtT.js) — findAction 使用 HXT
 * 遍历元素树查找 ActionsState，invokeAction 调用 action.invoke。
 *
 * @module
 */

import type { BuildContext } from "../tree/element.js";
import type { Action } from "./action.js";
import { ActionsState } from "./actions.js";
import type { Intent } from "./intent.js";

/**
 * ActionDispatcher — 沿元素树向上查找并调用 Action。
 *
 * 逆向: amp dtT in 2095_unknown_dtT.js
 */
export class ActionDispatcher {
  /**
   * 查找并调用匹配的 Action。
   *
   * 逆向: amp dtT.invokeAction — 查找 + enabled 检查 + invoke。
   */
  invokeAction(intent: Intent, context: BuildContext): unknown | null {
    const result = this.findAction(intent, context);
    if (result?.enabled) {
      return result.action.invoke(intent);
    }
    return null;
  }

  /**
   * 沿元素树向上查找匹配的 Action。
   *
   * 逆向: amp dtT.findAction + HXT — 遍历父元素找 ActionsState,
   * 调用 getActionForIntent(intent)，第一个匹配即返回。
   *
   * 重要: 在第一个拥有匹配 handler 的 ActionsState 处停止——
   * 即使该 action 的 isEnabled 返回 false，也不会继续向上查找。
   */
  findAction(intent: Intent, context: BuildContext): { action: Action; enabled: boolean } | null {
    // 逆向: amp HXT — 遍历 parent 链找 ActionsState
    let current = (context as unknown as { _parent?: unknown })._parent as
      | { _parent?: unknown; state?: unknown }
      | undefined;
    while (current) {
      if ("state" in current && current.state instanceof ActionsState) {
        const action = current.state.getActionForIntent(intent);
        if (action) {
          return { action, enabled: action.isEnabled(intent) };
        }
      }
      current = current._parent as typeof current;
    }
    return null;
  }
}
