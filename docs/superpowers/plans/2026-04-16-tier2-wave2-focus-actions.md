# Tier 2 Wave 2: Focus + Actions + Shortcuts

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the keyboard dispatch pipeline — Focus widget, Actions/Intents system, and Shortcuts widget — that enables keyboard-navigable TUI applications.

**Architecture:** Three tightly coupled components forming a single subsystem. Focus widget manages FocusNode lifecycle in the widget tree. Actions/Intents provides scoped action dispatch. Shortcuts bridges key events to intent-based action invocation. Depends on Wave 1's `findAncestorStateOfType` and `addKeyHandler`.

**Tech Stack:** TypeScript, Bun test runner, `node:test` + `node:assert/strict`

**MANDATORY: All implementations MUST cross-reference amp source code.**

**Amp References:**
- `C8`/`EtT` = Focus widget/state: `amp-cli-reversed/modules/1472_tui_components/actions_intents.js:66-134`
- `l8` = FocusNode: `amp-cli-reversed/modules/2103_unknown_l8.js`
- `ic` = FocusManager: `amp-cli-reversed/modules/2102_unknown_ic.js`
- `Nt`/`Ww` = Actions widget/state: `amp-cli-reversed/modules/1472_tui_components/actions_intents.js:0-65`
- `dtT` = ActionDispatcher: `amp-cli-reversed/modules/2095_unknown_dtT.js`
- `UXT` = Action base: `amp-cli-reversed/modules/2094_unknown_UXT.js`
- `kc`/`GXT` = Shortcuts widget/state: `amp-cli-reversed/modules/1472_tui_components/actions_intents.js:135-199`
- `CtT` = ShortcutManager: `amp-cli-reversed/modules/2105_unknown_CtT.js`
- `x0` = KeyActivator: `amp-cli-reversed/modules/2104_unknown_x0.js`

---

### Task 1: Focus Widget + FocusManager Enhancements

**Files:**
- Create: `packages/tui/src/widgets/focus.ts`
- Create: `packages/tui/src/widgets/focus.test.ts`
- Modify: `packages/tui/src/focus/focus-manager.ts` (minor — registerNode/unregisterNode already exist, verify)
- Modify: `packages/tui/src/focus/index.ts` (exports)
- Modify: `packages/tui/src/index.ts` (exports)

**Amp reference:** `C8` (widget) + `EtT` (state) in `actions_intents.js:66-134`

**Prerequisites:** Wave 1 Task 1 (findAncestorStateOfType) and Task 2 (addKeyHandler) must be complete.

- [ ] **Step 1: Write failing tests for Focus widget**

Create `packages/tui/src/widgets/focus.test.ts`:

```ts
import { describe, it, beforeEach, afterEach } from "node:test";
import * as assert from "node:assert/strict";
import { Focus, FocusState } from "./focus.js";
import { FocusNode, FocusManager } from "../focus/index.js";

describe("Focus widget", () => {
  beforeEach(() => {
    FocusManager.resetForTesting?.();
  });

  it("creates an internal FocusNode when none provided", () => {
    const child = new TestStatelessWidget("child");
    const focus = new Focus({ child });
    const element = focus.createElement();
    element.mount(undefined);

    const state = (element as any)._state as FocusState;
    assert.ok(state.effectiveFocusNode instanceof FocusNode);
  });

  it("uses external focusNode when provided", () => {
    const externalNode = new FocusNode({ debugLabel: "external" });
    const child = new TestStatelessWidget("child");
    const focus = new Focus({ child, focusNode: externalNode });
    const element = focus.createElement();
    element.mount(undefined);

    const state = (element as any)._state as FocusState;
    assert.equal(state.effectiveFocusNode, externalNode);
  });

  it("auto-parents to nearest ancestor Focus", () => {
    const leaf = new TestStatelessWidget("leaf");
    const innerFocus = new Focus({ child: leaf });
    const outerFocus = new Focus({ child: innerFocus });

    const outerElement = outerFocus.createElement();
    outerElement.mount(undefined);

    // Walk down: outerElement -> outerFocusState -> innerFocusElement -> innerFocusState
    // The inner Focus's FocusNode should have the outer Focus's FocusNode as parent
    const outerState = (outerElement as any)._state as FocusState;
    // Rebuild to get the inner element
    // ... (adapt to actual element tree traversal)
  });

  it("registers addKeyHandler when external node + onKey", () => {
    const externalNode = new FocusNode();
    let keyCalled = false;
    const handler = () => { keyCalled = true; return "handled" as const; };

    const child = new TestStatelessWidget("child");
    const focus = new Focus({ child, focusNode: externalNode, onKey: handler });
    const element = focus.createElement();
    element.mount(undefined);

    // The handler should be registered on the external node
    const result = externalNode._handleKeyEvent({ key: "a", code: "KeyA", type: "keydown" } as any);
    assert.equal(result, "handled");
    assert.equal(keyCalled, true);
  });

  it("autofocus requests focus after mount", async () => {
    const child = new TestStatelessWidget("child");
    const focus = new Focus({ child, autofocus: true });
    const element = focus.createElement();
    element.mount(undefined);

    // Autofocus is queued as microtask
    await new Promise(resolve => queueMicrotask(resolve));

    const state = (element as any)._state as FocusState;
    assert.equal(state.effectiveFocusNode.hasPrimaryFocus, true);
  });

  it("dispose unregisters node and removes key handler", () => {
    const externalNode = new FocusNode();
    let callCount = 0;
    const handler = () => { callCount++; return "ignored" as const; };

    const child = new TestStatelessWidget("child");
    const focus = new Focus({ child, focusNode: externalNode, onKey: handler });
    const element = focus.createElement();
    element.mount(undefined);

    // Handler registered
    externalNode._handleKeyEvent({ key: "a", code: "KeyA", type: "keydown" } as any);
    assert.equal(callCount, 1);

    // Dispose
    element.unmount();

    // Handler should be removed
    callCount = 0;
    externalNode._handleKeyEvent({ key: "b", code: "KeyB", type: "keydown" } as any);
    assert.equal(callCount, 0, "handler should be removed after dispose");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/tui && bun test src/widgets/focus.test.ts`
Expected: FAIL — module `./focus.js` does not exist.

- [ ] **Step 3: Implement Focus widget**

Create `packages/tui/src/widgets/focus.ts`:

```ts
/**
 * Focus Widget — 管理 FocusNode 在 Widget 树中的生命周期。
 *
 * 逆向: amp C8 (widget) + EtT (state) in actions_intents.js:66-134
 *
 * Focus 是一个 StatefulWidget，在 initState 中创建或采用一个 FocusNode，
 * 并通过 findAncestorStateOfType 自动挂载到最近的祖先 Focus 节点。
 * build() 返回 widget.child 不变——纯结构/副作用 Widget。
 *
 * @module
 */

import {
  StatefulWidget,
  State,
} from "../tree/stateful-widget.js";
import type { BuildContext, Widget as WidgetInterface } from "../tree/element.js";
import type { Key } from "../tree/widget.js";
import {
  FocusNode,
  FocusManager,
} from "../focus/index.js";
import type { KeyHandler, PasteHandler } from "../focus/index.js";

// ════════════════════════════════════════════════════
//  Focus Widget
// ════════════════════════════════════════════════════

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

export class Focus extends StatefulWidget {
  readonly child: WidgetInterface;
  readonly focusNode: FocusNode | undefined;
  readonly autofocus: boolean;
  readonly canRequestFocus: boolean;
  readonly skipTraversal: boolean;
  readonly onKey: KeyHandler | undefined;
  readonly onPaste: PasteHandler | undefined;
  readonly onFocusChange: ((hasFocus: boolean) => void) | undefined;
  readonly debugLabel: string | undefined;

  constructor(args: FocusArgs) {
    super({ key: args.key });
    this.child = args.child;
    this.focusNode = args.focusNode;
    this.autofocus = args.autofocus ?? false;
    this.canRequestFocus = args.canRequestFocus ?? true;
    this.skipTraversal = args.skipTraversal ?? false;
    this.onKey = args.onKey;
    this.onPaste = args.onPaste;
    this.onFocusChange = args.onFocusChange;
    this.debugLabel = args.debugLabel;
  }

  createState(): State {
    return new FocusState();
  }
}

// ════════════════════════════════════════════════════
//  FocusState
// ════════════════════════════════════════════════════

export class FocusState extends State<Focus> {
  private _internalFocusNode: FocusNode | null = null;
  private _isDisposed = false;
  private _focusListener: (() => void) | null = null;

  /**
   * 逆向: amp EtT.effectiveFocusNode — 返回外部节点或内部创建的节点。
   */
  get effectiveFocusNode(): FocusNode {
    return this.widget.focusNode ?? this._internalFocusNode!;
  }

  /**
   * 逆向: amp EtT.initState
   *
   * 1. 创建或采用 FocusNode
   * 2. 注册 key/paste handler
   * 3. 自动挂载到祖先 Focus
   * 4. autofocus 排队
   */
  override initState(): void {
    super.initState();

    // 1. Create internal node if no external node provided
    if (!this.widget.focusNode) {
      this._internalFocusNode = new FocusNode({
        canRequestFocus: this.widget.canRequestFocus,
        skipTraversal: this.widget.skipTraversal,
        onKey: this.widget.onKey,
        onPaste: this.widget.onPaste,
        debugLabel: this.widget.debugLabel,
      });
    } else {
      // External node: register onKey handler separately
      if (this.widget.onKey) {
        this.widget.focusNode.addKeyHandler(this.widget.onKey);
      }
      if (this.widget.onPaste) {
        this.widget.focusNode.onPaste = this.widget.onPaste;
      }
    }

    // 2. onFocusChange listener
    if (this.widget.onFocusChange) {
      const node = this.effectiveFocusNode;
      const onChange = this.widget.onFocusChange;
      this._focusListener = () => onChange(node.hasFocus);
      node.addListener(this._focusListener);
    }

    // 3. Auto-parent: find nearest ancestor FocusState
    const ancestorState = this.context.findAncestorStateOfType(FocusState);
    const parentNode = ancestorState?.effectiveFocusNode ?? null;

    // 4. Register with FocusManager
    FocusManager.instance.registerNode(this.effectiveFocusNode, parentNode);

    // 5. Autofocus
    if (this.widget.autofocus) {
      queueMicrotask(() => {
        if (!this._isDisposed) {
          this.effectiveFocusNode.requestFocus();
        }
      });
    }
  }

  /**
   * 逆向: amp EtT.build — returns widget.child unchanged.
   */
  build(context: BuildContext): WidgetInterface {
    return this.widget.child;
  }

  /**
   * 逆向: amp EtT.dispose
   */
  override dispose(): void {
    this._isDisposed = true;

    // Remove key handler from external node
    if (this.widget.focusNode && this.widget.onKey) {
      this.widget.focusNode.removeKeyHandler(this.widget.onKey);
    }

    // Remove focus listener
    if (this._focusListener) {
      this.effectiveFocusNode.removeListener(this._focusListener);
      this._focusListener = null;
    }

    // Unregister from FocusManager
    FocusManager.instance.unregisterNode(this.effectiveFocusNode);

    // Dispose internal node
    if (this._internalFocusNode) {
      this._internalFocusNode.dispose();
      this._internalFocusNode = null;
    }

    super.dispose();
  }
}
```

- [ ] **Step 4: Add exports**

Add to `packages/tui/src/index.ts`:

```ts
export { Focus, FocusState } from "./widgets/focus.js";
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/tui && bun test src/widgets/focus.test.ts`
Expected: All tests PASS.

- [ ] **Step 6: Run full TUI test suite**

Run: `cd packages/tui && bun test`
Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/tui/src/widgets/focus.ts packages/tui/src/widgets/focus.test.ts packages/tui/src/index.ts
git commit -m "feat(widgets): add Focus widget for FocusNode lifecycle management

Align with amp C8/EtT (actions_intents.js:66-134). Focus is a StatefulWidget
that creates/adopts a FocusNode, auto-parents to nearest ancestor Focus
via findAncestorStateOfType, supports autofocus, onKey, onPaste, and
onFocusChange. build() returns child unchanged — pure structural widget."
```

---

### Task 2: Actions Widget + Intent + ActionDispatcher

**Files:**
- Create: `packages/tui/src/actions/intent.ts`
- Create: `packages/tui/src/actions/action.ts`
- Create: `packages/tui/src/actions/action-dispatcher.ts`
- Create: `packages/tui/src/actions/actions.ts`
- Create: `packages/tui/src/actions/index.ts`
- Create: `packages/tui/src/actions/actions.test.ts`
- Modify: `packages/tui/src/index.ts` (exports)

**Amp reference:** `Nt`/`Ww`/`dtT`/`UXT`/`H8` in actions_intents.js + 2094/2095 modules

- [ ] **Step 1: Write failing tests for Actions system**

Create `packages/tui/src/actions/actions.test.ts`:

```ts
import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { Intent } from "./intent.js";
import { Action } from "./action.js";
import { ActionDispatcher } from "./action-dispatcher.js";
import { Actions, ActionsState } from "./actions.js";

class TestIntent extends Intent {}
class OtherIntent extends Intent {}

class TestAction extends Action<TestIntent> {
  invoked = false;
  invoke(intent: TestIntent): void {
    this.invoked = true;
  }
}

describe("ActionDispatcher", () => {
  it("finds action from nearest ancestor Actions widget", () => {
    const action = new TestAction();
    const actionsMap = new Map([[TestIntent, action]]);

    // Build a tree: Actions(map) > child
    const child = new TestStatelessWidget("child");
    const actionsWidget = new Actions({ actions: actionsMap, child });

    const rootElement = actionsWidget.createElement();
    rootElement.mount(undefined);

    // Get child's context
    const childElement = rootElement.children[0]!;
    const dispatcher = new ActionDispatcher();
    const result = dispatcher.findAction(new TestIntent(), childElement);

    assert.ok(result !== null);
    assert.equal(result!.enabled, true);
  });

  it("returns null when no ancestor has matching action", () => {
    const child = new TestStatelessWidget("child");
    const element = child.createElement();
    element.mount(undefined);

    const dispatcher = new ActionDispatcher();
    const result = dispatcher.findAction(new TestIntent(), element);
    assert.equal(result, null);
  });

  it("nearest ancestor Actions wins (shadowing)", () => {
    const outerAction = new TestAction();
    const innerAction = new TestAction();

    const leaf = new TestStatelessWidget("leaf");
    const innerActions = new Actions({
      actions: new Map([[TestIntent, innerAction]]),
      child: leaf,
    });
    const outerActions = new Actions({
      actions: new Map([[TestIntent, outerAction]]),
      child: innerActions,
    });

    const rootElement = outerActions.createElement();
    rootElement.mount(undefined);

    // Walk to leaf
    const innerElement = rootElement.children[0]!;
    const leafElement = innerElement.children[0]!;

    const dispatcher = new ActionDispatcher();
    dispatcher.invokeAction(new TestIntent(), leafElement);

    assert.equal(innerAction.invoked, true, "inner action should be invoked");
    assert.equal(outerAction.invoked, false, "outer action should NOT be invoked");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/tui && bun test src/actions/actions.test.ts`
Expected: FAIL — modules do not exist.

- [ ] **Step 3: Implement Intent base class**

Create `packages/tui/src/actions/intent.ts`:

```ts
/**
 * Intent 基类 — 纯数据标记类，标识用户意图。
 *
 * 逆向: amp H8 — Intent 子类是标记类，可携带可选数据。
 * Actions 系统通过 intent.constructor（类引用）查找对应的 Action。
 *
 * @module
 */

export abstract class Intent {}
```

- [ ] **Step 4: Implement Action base class**

Create `packages/tui/src/actions/action.ts`:

```ts
/**
 * Action 基类 — 知道如何执行一个 Intent。
 *
 * 逆向: amp UXT (2094_unknown_UXT.js) — isEnabled 默认 true,
 * 子类 override invoke(intent)。
 *
 * @module
 */

import type { Intent } from "./intent.js";

export abstract class Action<T extends Intent = Intent> {
  /**
   * 逆向: amp UXT.isEnabled — 默认返回 true。
   */
  isEnabled(_intent: T): boolean {
    return true;
  }

  /**
   * 执行此 Action。
   *
   * @returns "handled" 停止事件传播，其他值继续传播
   */
  abstract invoke(intent: T): "handled" | "ignored" | void;
}
```

- [ ] **Step 5: Implement ActionDispatcher**

Create `packages/tui/src/actions/action-dispatcher.ts`:

```ts
/**
 * ActionDispatcher — 沿元素树向上查找并调用 Action。
 *
 * 逆向: amp dtT (2095_unknown_dtT.js) — findAction 使用 HXT
 * 遍历元素树查找 ActionsState，invokeAction 调用 action.invoke。
 *
 * @module
 */

import type { Intent } from "./intent.js";
import type { Action } from "./action.js";
import type { BuildContext } from "../tree/element.js";
import { ActionsState } from "./actions.js";

export class ActionDispatcher {
  /**
   * 查找并调用匹配的 Action。
   *
   * 逆向: amp dtT.invokeAction
   */
  invokeAction(intent: Intent, context: BuildContext): unknown | null {
    const result = this.findAction(intent, context);
    if (result && result.enabled) {
      return result.action.invoke(intent);
    }
    return null;
  }

  /**
   * 沿元素树向上查找匹配的 Action。
   *
   * 逆向: amp dtT.findAction + HXT — 遍历父元素找 ActionsState,
   * 调用 getActionForIntent(intent), 第一个匹配即返回。
   */
  findAction(
    intent: Intent,
    context: BuildContext,
  ): { action: Action; enabled: boolean } | null {
    // Walk the element tree upward
    let current = (context as any)._parent;
    while (current) {
      if ("state" in current) {
        const state = (current as any).state;
        if (state instanceof ActionsState) {
          const action = state.getActionForIntent(intent);
          if (action) {
            return { action, enabled: action.isEnabled(intent) };
          }
        }
      }
      current = current._parent ?? current.parent;
    }
    return null;
  }
}
```

- [ ] **Step 6: Implement Actions widget + ActionsState**

Create `packages/tui/src/actions/actions.ts`:

```ts
/**
 * Actions Widget — 在 Widget 树中注册 Intent→Action 映射。
 *
 * 逆向: amp Nt (widget) + Ww (state) in actions_intents.js:0-65
 *
 * @module
 */

import {
  StatefulWidget,
  State,
} from "../tree/stateful-widget.js";
import type { BuildContext, Widget as WidgetInterface } from "../tree/element.js";
import type { Key } from "../tree/widget.js";
import type { Intent } from "./intent.js";
import type { Action } from "./action.js";
import { ActionDispatcher } from "./action-dispatcher.js";

interface ActionsArgs {
  key?: Key;
  actions: Map<new (...args: any[]) => Intent, Action<any>>;
  child: WidgetInterface;
  dispatcher?: ActionDispatcher;
}

export class Actions extends StatefulWidget {
  readonly actions: Map<new (...args: any[]) => Intent, Action<any>>;
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
    const result = new ActionDispatcher().invokeAction(intent, context);
    return result;
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
}

export class ActionsState extends State<Actions> {
  /**
   * 逆向: amp Ww.getActionForIntent — 通过 intent.constructor 查找 Action。
   */
  getActionForIntent(intent: Intent): Action | null {
    return this.widget.actions.get(intent.constructor as new (...args: any[]) => Intent) ?? null;
  }

  build(context: BuildContext): WidgetInterface {
    return this.widget.child;
  }
}
```

- [ ] **Step 7: Create barrel export**

Create `packages/tui/src/actions/index.ts`:

```ts
export { Intent } from "./intent.js";
export { Action } from "./action.js";
export { ActionDispatcher } from "./action-dispatcher.js";
export { Actions, ActionsState } from "./actions.js";
```

Add to `packages/tui/src/index.ts`:

```ts
export * from "./actions/index.js";
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd packages/tui && bun test src/actions/actions.test.ts`
Expected: All tests PASS.

- [ ] **Step 9: Run full TUI test suite**

Run: `cd packages/tui && bun test`
Expected: All tests PASS.

- [ ] **Step 10: Commit**

```bash
git add packages/tui/src/actions/ packages/tui/src/index.ts
git commit -m "feat(actions): add Actions widget, Intent, Action, ActionDispatcher

Align with amp Nt/Ww/dtT/UXT/H8. Intent is a pure data marker class.
Action knows how to fulfill an Intent. ActionDispatcher walks the element
tree upward to find the nearest Actions widget with a matching Action.
Actions maps Intent classes to Action instances in the widget tree."
```

---

### Task 3: Shortcuts Widget + ShortcutManager + KeyActivator

**Files:**
- Create: `packages/tui/src/actions/key-activator.ts`
- Create: `packages/tui/src/actions/shortcut-manager.ts`
- Create: `packages/tui/src/actions/shortcuts.ts`
- Create: `packages/tui/src/actions/shortcuts.test.ts`
- Modify: `packages/tui/src/actions/index.ts` (exports)

**Amp reference:** `kc`/`GXT`/`CtT`/`x0` in actions_intents.js + 2104/2105 modules

**Prerequisites:** Task 1 (Focus widget) and Task 2 (Actions) must be complete.

- [ ] **Step 1: Write failing tests**

Create `packages/tui/src/actions/shortcuts.test.ts`:

```ts
import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { KeyActivator } from "./key-activator.js";
import { ShortcutManager } from "./shortcut-manager.js";
import { Intent } from "./intent.js";

class ScrollDownIntent extends Intent {}
class ScrollUpIntent extends Intent {}

describe("KeyActivator", () => {
  it("matches exact key + modifiers", () => {
    const activator = KeyActivator.ctrl("d");
    const event = { key: "d", ctrlKey: true, shiftKey: false, altKey: false, metaKey: false } as any;
    assert.equal(activator.accepts(event), true);
  });

  it("rejects when modifier mismatch", () => {
    const activator = KeyActivator.ctrl("d");
    const event = { key: "d", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false } as any;
    assert.equal(activator.accepts(event), false);
  });

  it("static factory key() creates activator with no modifiers", () => {
    const activator = KeyActivator.key("Escape");
    const event = { key: "Escape", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false } as any;
    assert.equal(activator.accepts(event), true);
  });
});

describe("ShortcutManager", () => {
  it("returns matching intent for key event", () => {
    const manager = new ShortcutManager(new Map([
      [KeyActivator.ctrl("d"), new ScrollDownIntent()],
      [KeyActivator.ctrl("u"), new ScrollUpIntent()],
    ]));

    const event = { key: "d", ctrlKey: true, shiftKey: false, altKey: false, metaKey: false } as any;
    const intent = manager.handleKeyEvent(event);
    assert.ok(intent instanceof ScrollDownIntent);
  });

  it("returns null when no match", () => {
    const manager = new ShortcutManager(new Map([
      [KeyActivator.ctrl("d"), new ScrollDownIntent()],
    ]));

    const event = { key: "x", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false } as any;
    assert.equal(manager.handleKeyEvent(event), null);
  });

  it("first match wins", () => {
    const intent1 = new ScrollDownIntent();
    const intent2 = new ScrollDownIntent();
    const manager = new ShortcutManager(new Map([
      [new KeyActivator("d", { ctrl: true }), intent1],
      [new KeyActivator("d", { ctrl: true }), intent2], // duplicate — never reached
    ]));

    const event = { key: "d", ctrlKey: true, shiftKey: false, altKey: false, metaKey: false } as any;
    assert.equal(manager.handleKeyEvent(event), intent1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/tui && bun test src/actions/shortcuts.test.ts`
Expected: FAIL — modules do not exist.

- [ ] **Step 3: Implement KeyActivator**

Create `packages/tui/src/actions/key-activator.ts`:

```ts
/**
 * KeyActivator — 匹配键盘事件与按键组合。
 *
 * 逆向: amp x0 (2104_unknown_x0.js) — accepts(event) 精确匹配 key + 修饰键。
 *
 * @module
 */

import type { KeyEvent } from "../vt/types.js";

export class KeyActivator {
  readonly key: string;
  readonly shift: boolean;
  readonly ctrl: boolean;
  readonly alt: boolean;
  readonly meta: boolean;

  constructor(
    key: string,
    modifiers?: { shift?: boolean; ctrl?: boolean; alt?: boolean; meta?: boolean },
  ) {
    this.key = key;
    this.shift = modifiers?.shift ?? false;
    this.ctrl = modifiers?.ctrl ?? false;
    this.alt = modifiers?.alt ?? false;
    this.meta = modifiers?.meta ?? false;
  }

  /**
   * 逆向: amp x0.accepts — 精确匹配 key 和所有修饰键。
   */
  accepts(event: KeyEvent): boolean {
    return event.key === this.key
      && (event as any).ctrlKey === this.ctrl
      && (event as any).shiftKey === this.shift
      && (event as any).altKey === this.alt
      && (event as any).metaKey === this.meta;
  }

  static key(k: string): KeyActivator {
    return new KeyActivator(k);
  }

  static ctrl(k: string): KeyActivator {
    return new KeyActivator(k, { ctrl: true });
  }

  static shift(k: string): KeyActivator {
    return new KeyActivator(k, { shift: true });
  }

  static alt(k: string): KeyActivator {
    return new KeyActivator(k, { alt: true });
  }
}
```

- [ ] **Step 4: Implement ShortcutManager**

Create `packages/tui/src/actions/shortcut-manager.ts`:

```ts
/**
 * ShortcutManager — 映射 KeyActivator 到 Intent。
 *
 * 逆向: amp CtT (2105_unknown_CtT.js) — handleKeyEvent 遍历 shortcuts Map,
 * 第一个 activator.accepts(event) 匹配即返回对应 Intent。
 *
 * @module
 */

import type { KeyEvent } from "../vt/types.js";
import type { KeyActivator } from "./key-activator.js";
import type { Intent } from "./intent.js";

export class ShortcutManager {
  readonly shortcuts: Map<KeyActivator, Intent>;

  constructor(shortcuts: Map<KeyActivator, Intent> = new Map()) {
    this.shortcuts = shortcuts;
  }

  /**
   * 逆向: amp CtT.handleKeyEvent — 第一个匹配的 activator 返回对应 Intent。
   */
  handleKeyEvent(event: KeyEvent): Intent | null {
    for (const [activator, intent] of this.shortcuts) {
      if (activator.accepts(event)) return intent;
    }
    return null;
  }
}
```

- [ ] **Step 5: Implement Shortcuts widget**

Create `packages/tui/src/actions/shortcuts.ts`:

```ts
/**
 * Shortcuts Widget — 桥接 Focus 系统和 Actions 系统。
 *
 * 逆向: amp kc (widget) + GXT (state) in actions_intents.js:135-199
 *
 * @module
 */

import {
  StatefulWidget,
  State,
} from "../tree/stateful-widget.js";
import type { BuildContext, Widget as WidgetInterface } from "../tree/element.js";
import type { Key } from "../tree/widget.js";
import type { KeyEvent } from "../vt/types.js";
import type { KeyEventResult } from "../focus/focus-node.js";
import { FocusNode } from "../focus/focus-node.js";
import { Focus } from "../widgets/focus.js";
import type { KeyActivator } from "./key-activator.js";
import type { Intent } from "./intent.js";
import { ShortcutManager } from "./shortcut-manager.js";
import { ActionDispatcher } from "./action-dispatcher.js";

interface ShortcutsArgs {
  key?: Key;
  shortcuts: Map<KeyActivator, Intent>;
  child: WidgetInterface;
  manager?: ShortcutManager;
  focusNode?: FocusNode;
  debugLabel?: string;
}

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

export class ShortcutsState extends State<Shortcuts> {
  private _manager: ShortcutManager | null = null;

  /**
   * 逆向: amp GXT.handleKeyEvent — 稳定箭头函数引用。
   */
  handleKeyEvent = (event: KeyEvent): KeyEventResult => {
    if (!this._manager) return "ignored";
    const intent = this._manager.handleKeyEvent(event);
    if (!intent) return "ignored";
    const result = this._invokeIntent(intent);
    return result === "handled" ? "handled" : "ignored";
  };

  override initState(): void {
    super.initState();
    this._createManager();
    if (this.widget.focusNode) {
      this.widget.focusNode.addKeyHandler(this.handleKeyEvent);
    }
  }

  override didUpdateWidget(prev: Shortcuts): void {
    super.didUpdateWidget(prev);
    if (prev.shortcuts !== this.widget.shortcuts || prev.manager !== this.widget.manager) {
      this._createManager();
    }
  }

  override dispose(): void {
    if (this.widget.focusNode) {
      this.widget.focusNode.removeKeyHandler(this.handleKeyEvent);
    }
    super.dispose();
  }

  build(context: BuildContext): WidgetInterface {
    if (this.widget.focusNode) {
      // Handler already attached to external node
      return this.widget.child;
    }
    // Wrap in Focus widget
    return new Focus({
      onKey: this.handleKeyEvent,
      autofocus: false,
      canRequestFocus: true,
      skipTraversal: false,
      debugLabel: this.widget.debugLabel,
      child: this.widget.child,
    });
  }

  private _createManager(): void {
    this._manager = this.widget.manager ?? new ShortcutManager(this.widget.shortcuts);
  }

  /**
   * 逆向: amp GXT.invokeIntent — 创建 ActionDispatcher 查找并调用 Action。
   */
  private _invokeIntent(intent: Intent): "handled" | null {
    const dispatcher = new ActionDispatcher();
    const result = dispatcher.findAction(intent, this.context);
    if (result && result.enabled) {
      const invokeResult = result.action.invoke(intent);
      if (invokeResult === "ignored") return null;
      return "handled";
    }
    return null;
  }
}
```

- [ ] **Step 6: Update barrel exports**

In `packages/tui/src/actions/index.ts`, add:

```ts
export { KeyActivator } from "./key-activator.js";
export { ShortcutManager } from "./shortcut-manager.js";
export { Shortcuts, ShortcutsState } from "./shortcuts.js";
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd packages/tui && bun test src/actions/shortcuts.test.ts`
Expected: All tests PASS.

- [ ] **Step 8: Run full TUI test suite**

Run: `cd packages/tui && bun test`
Expected: All tests PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/tui/src/actions/
git commit -m "feat(actions): add Shortcuts widget, ShortcutManager, KeyActivator

Align with amp kc/GXT/CtT/x0. KeyActivator matches key+modifier combos.
ShortcutManager maps activators to Intents. Shortcuts widget bridges the
Focus system (key events) to the Actions system (Intent dispatch). If no
external focusNode is provided, Shortcuts wraps its child in a Focus widget."
```

---

## Execution Order

```
Task 1 (Focus widget)        ← depends on Wave 1 tasks 1+2
  ↓
Task 2 (Actions/Intents)     ← independent of Focus, but test after
  ↓
Task 3 (Shortcuts)           ← depends on Tasks 1+2
```

Tasks 1 and 2 can run in parallel. Task 3 must run after both.

## Final Verification

After all 3 tasks:

1. Run: `cd packages/tui && bun test`
2. tmux e2e: launch demo, verify keyboard events work, no regressions
