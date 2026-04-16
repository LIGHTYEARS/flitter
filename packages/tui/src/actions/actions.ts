/**
 * Actions Widget — 在 Widget 树中注册 Intent→Action 映射。
 *
 * 逆向: amp Nt (widget) + Ww (state) in actions_intents.js:0-65
 *
 * Actions 是一个 StatefulWidget，持有 Intent类→Action 的 Map。
 * ActionDispatcher 沿元素树向上查找 ActionsState，
 * 调用 getActionForIntent 获取匹配的 Action。
 *
 * @module
 */

import type { BuildContext, Widget as WidgetInterface } from "../tree/element.js";
import { State, StatefulWidget } from "../tree/stateful-widget.js";
import type { Key } from "../tree/widget.js";
import type { Action } from "./action.js";
import { ActionDispatcher } from "./action-dispatcher.js";
import type { Intent } from "./intent.js";

// ════════════════════════════════════════════════════
//  类型别名
// ════════════════════════════════════════════════════

/** Intent 构造函数类型 — 用作 Map 键 */
type IntentConstructor = abstract new (...args: never[]) => Intent;

/** Actions 构造函数参数 */
interface ActionsArgs {
  key?: Key;
  actions: Map<IntentConstructor, Action>;
  child: WidgetInterface;
  dispatcher?: ActionDispatcher;
}

// ════════════════════════════════════════════════════
//  Actions Widget
// ════════════════════════════════════════════════════

/**
 * Actions Widget — 在 Widget 树中注册 Intent→Action 映射。
 *
 * 逆向: amp Nt in actions_intents.js:0-17
 */
export class Actions extends StatefulWidget {
  readonly actions: Map<IntentConstructor, Action>;
  readonly child: WidgetInterface;
  readonly dispatcher: ActionDispatcher | undefined;

  constructor(args: ActionsArgs) {
    super({ key: args.key });
    this.actions = args.actions;
    this.child = args.child;
    this.dispatcher = args.dispatcher;
  }

  createState(): State {
    return new ActionsState();
  }

  /**
   * 逆向: amp Nt.invoke — 在给定 context 上查找并调用 Action。
   */
  static invoke(context: BuildContext, intent: Intent): unknown {
    return Actions.of(context).invokeAction(intent, context);
  }

  /**
   * 逆向: amp Nt.maybeInvoke — 同 invoke 但不抛异常。
   */
  static maybeInvoke(context: BuildContext, intent: Intent): unknown | null {
    try {
      return Actions.invoke(context, intent);
    } catch {
      return null;
    }
  }

  /**
   * 逆向: amp Nt.find — 查找 Action，未找到时抛异常。
   */
  static find(context: BuildContext, intent: Intent): Action {
    const action = Actions.maybeFind(context, intent);
    if (!action) {
      const name = intent?.constructor.name ?? "unknown";
      throw new Error(`No action found for intent type: ${name}`);
    }
    return action;
  }

  /**
   * 逆向: amp Nt.maybeFind — 安全查找 Action，未找到返回 null。
   */
  static maybeFind(context: BuildContext, intent: Intent): Action | null {
    if (!intent) return null;
    let found: Action | null = null;
    walkAncestorActionsStates(context, (state) => {
      const action = state.getActionForIntent(intent);
      if (!action) return false;
      found = action;
      return true; // stop walking
    });
    return found;
  }

  /**
   * 逆向: amp Nt.of — 查找最近的 ActionsState 的 dispatcher，未找到时抛异常。
   */
  static of(context: BuildContext): ActionDispatcher {
    const state = (
      context as unknown as { findAncestorStateOfType: (t: unknown) => ActionsState | null }
    ).findAncestorStateOfType(ActionsState);
    if (!state) throw new Error("No Actions widget found in context");
    return state.dispatcher;
  }

  /**
   * 逆向: amp Nt.handler — 返回可调用的闭包或 null。
   */
  static handler(context: BuildContext, intent: Intent): (() => unknown) | null {
    const result = Actions.of(context).findAction(intent, context);
    if (result?.enabled) return () => result.action.invoke(intent);
    return null;
  }
}

// ════════════════════════════════════════════════════
//  ActionsState
// ════════════════════════════════════════════════════

/**
 * Actions Widget 的状态。
 *
 * 逆向: amp Ww in actions_intents.js:56-65
 */
export class ActionsState extends State<Actions> {
  /** 逆向: amp Ww — 每个 ActionsState 持有自己的 dispatcher */
  readonly dispatcher: ActionDispatcher = new ActionDispatcher();

  /**
   * 逆向: amp Ww.getActionForIntent — 通过 intent.constructor 查找 Action。
   */
  getActionForIntent(intent: Intent): Action | null {
    const ctor = intent.constructor as IntentConstructor;
    return this.widget.actions.get(ctor) ?? null;
  }

  build(_context: BuildContext): WidgetInterface {
    return this.widget.child;
  }
}

// ════════════════════════════════════════════════════
//  辅助函数
// ════════════════════════════════════════════════════

/**
 * 逆向: amp HXT — 遍历元素树祖先查找 ActionsState。
 *
 * callback 返回 true 时停止遍历。
 */
function walkAncestorActionsStates(
  context: BuildContext,
  callback: (state: ActionsState) => boolean,
): void {
  let current = (context as unknown as { _parent?: { _parent?: unknown; state?: unknown } })
    ._parent;
  while (current) {
    if ("state" in current && current.state instanceof ActionsState) {
      if (callback(current.state)) return;
    }
    current = (current as unknown as { _parent?: unknown })._parent as typeof current;
  }
}
