# Toast & Overlay Dialogs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a toast notification system and error dialog overlay to the CLI — two key UI feedback mechanisms that amp has and Flitter is missing.

**Architecture:** A `ToastManager` class (imperative, not a widget) manages a queue of visible toasts with auto-dismiss timers, matching amp's `BQT` pattern. A `ToastOverlay` widget subscribes to the manager and renders toast messages as positioned overlays at the top of the screen. An `ErrorDialog` widget renders structured error information with action buttons. Both integrate into the existing `ThreadStateWidget` layout.

**Tech Stack:** TypeScript, `@flitter/tui` (Container, Column, Row, RichText, TextSpan, Padding, Stack, Positioned, Focus), `@flitter/schemas`

**amp reference files:**
- `amp-cli-reversed/modules/2442_unknown_BQT.js` — ToastManager (queue, auto-dismiss, max 3 visible)
- `amp-cli-reversed/1472_tui_components/actions_intents.js` — `j0R` EphemeralErrorView

---

### Task 1: Implement ToastManager

An imperative class that manages toast lifecycle: show, auto-dismiss, queue overflow.

**Files:**
- Create: `packages/cli/src/widgets/toast-manager.ts`
- Test: `packages/cli/src/widgets/__tests__/toast-manager.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// packages/cli/src/widgets/__tests__/toast-manager.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { ToastManager, type Toast } from "../toast-manager";

describe("ToastManager", () => {
  let manager: ToastManager;

  beforeEach(() => {
    manager = new ToastManager({ maxVisible: 3, defaultDuration: 100 });
  });

  afterEach(() => {
    manager.dispose();
  });

  it("shows a toast and returns its id", () => {
    const id = manager.show("Hello", "success");
    expect(typeof id).toBe("number");
    expect(manager.visibleToasts).toHaveLength(1);
    expect(manager.visibleToasts[0].message).toBe("Hello");
    expect(manager.visibleToasts[0].type).toBe("success");
  });

  it("queues toasts when max visible is reached", () => {
    manager.show("Toast 1");
    manager.show("Toast 2");
    manager.show("Toast 3");
    manager.show("Toast 4"); // should be queued
    expect(manager.visibleToasts).toHaveLength(3);
    expect(manager.queuedCount).toBe(1);
  });

  it("promotes from queue when a visible toast is dismissed", () => {
    const id1 = manager.show("Toast 1");
    manager.show("Toast 2");
    manager.show("Toast 3");
    manager.show("Toast 4"); // queued
    expect(manager.visibleToasts).toHaveLength(3);

    manager.dismiss(id1);
    expect(manager.visibleToasts).toHaveLength(3); // 4 promoted
    expect(manager.queuedCount).toBe(0);
    expect(manager.visibleToasts.some(t => t.message === "Toast 4")).toBe(true);
  });

  it("auto-dismisses after duration", async () => {
    manager.show("Temporary", "success", 50);
    expect(manager.visibleToasts).toHaveLength(1);

    await new Promise(r => setTimeout(r, 100));
    expect(manager.visibleToasts).toHaveLength(0);
  });

  it("dismissAll clears everything", () => {
    manager.show("A");
    manager.show("B");
    manager.show("C");
    manager.show("D");
    manager.dismissAll();
    expect(manager.visibleToasts).toHaveLength(0);
    expect(manager.queuedCount).toBe(0);
  });

  it("notifies listeners on changes", () => {
    let callCount = 0;
    manager.addListener(() => { callCount++; });
    manager.show("Test");
    expect(callCount).toBe(1);
    manager.dismiss(manager.visibleToasts[0].id);
    expect(callCount).toBe(2);
  });

  it("strips newlines from toast messages", () => {
    manager.show("line1\nline2\rline3");
    expect(manager.visibleToasts[0].message).toBe("line1line2line3");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/cli && bun test src/widgets/__tests__/toast-manager.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement ToastManager**

```ts
// packages/cli/src/widgets/toast-manager.ts
/**
 * ToastManager — imperative toast notification manager.
 *
 * 逆向: BQT (2442_unknown_BQT.js)
 * - Max 3 visible (nIT), queue overflow
 * - Auto-dismiss after 3000ms (aQ)
 * - Listener notification on state change
 */

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface QueuedToast extends Toast {
  duration: number;
}

interface ToastManagerOptions {
  maxVisible?: number;
  defaultDuration?: number;
}

export class ToastManager {
  private readonly _maxVisible: number;
  private readonly _defaultDuration: number;
  private _nextId = 1;

  private _visible: Toast[] = [];
  private _queued: QueuedToast[] = [];
  private _timers = new Map<number, ReturnType<typeof setTimeout>>();
  private _listeners = new Set<() => void>();

  constructor(opts: ToastManagerOptions = {}) {
    this._maxVisible = opts.maxVisible ?? 3;
    this._defaultDuration = opts.defaultDuration ?? 3000;
  }

  get visibleToasts(): readonly Toast[] {
    return this._visible;
  }

  get queuedCount(): number {
    return this._queued.length;
  }

  show(message: string, type: ToastType = "success", duration?: number): number {
    const id = this._nextId++;
    const sanitized = message.replace(/[\r\n]/g, "").trim();
    const dur = duration ?? this._defaultDuration;
    const toast: Toast = { id, message: sanitized, type };

    if (this._visible.length < this._maxVisible) {
      this._visible.push(toast);
      this._startTimer(id, dur);
    } else {
      this._queued.push({ ...toast, duration: dur });
    }

    this._notify();
    return id;
  }

  dismiss(id: number): void {
    const timer = this._timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this._timers.delete(id);
    }

    const visIdx = this._visible.findIndex(t => t.id === id);
    if (visIdx >= 0) {
      this._visible.splice(visIdx, 1);
      this._promoteFromQueue();
    } else {
      const qIdx = this._queued.findIndex(t => t.id === id);
      if (qIdx >= 0) this._queued.splice(qIdx, 1);
    }

    this._notify();
  }

  dismissAll(): void {
    for (const timer of this._timers.values()) {
      clearTimeout(timer);
    }
    this._timers.clear();
    this._visible.length = 0;
    this._queued.length = 0;
    this._notify();
  }

  addListener(fn: () => void): void {
    this._listeners.add(fn);
  }

  removeListener(fn: () => void): void {
    this._listeners.delete(fn);
  }

  dispose(): void {
    for (const timer of this._timers.values()) {
      clearTimeout(timer);
    }
    this._timers.clear();
    this._listeners.clear();
  }

  private _startTimer(id: number, duration: number): void {
    const timer = setTimeout(() => {
      this.dismiss(id);
    }, duration);
    // Don't keep the process alive for toast timers
    if (typeof timer === "object" && "unref" in timer) {
      (timer as NodeJS.Timeout).unref();
    }
    this._timers.set(id, timer);
  }

  private _promoteFromQueue(): void {
    while (this._visible.length < this._maxVisible && this._queued.length > 0) {
      const queued = this._queued.shift()!;
      const { duration, ...toast } = queued;
      this._visible.push(toast);
      this._startTimer(toast.id, duration);
    }
  }

  private _notify(): void {
    for (const fn of this._listeners) {
      fn();
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/cli && bun test src/widgets/__tests__/toast-manager.test.ts`
Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/widgets/toast-manager.ts packages/cli/src/widgets/__tests__/toast-manager.test.ts
git commit -m "feat(cli): add ToastManager with queue, auto-dismiss, and listener support"
```

---

### Task 2: Build ToastOverlay widget

A widget that subscribes to `ToastManager` and renders visible toasts as a vertical stack.

**Files:**
- Create: `packages/cli/src/widgets/toast-overlay.ts`
- Test: `packages/cli/src/widgets/__tests__/toast-overlay.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// packages/cli/src/widgets/__tests__/toast-overlay.test.ts
import { describe, it, expect } from "bun:test";
import { ToastOverlay } from "../toast-overlay";
import { ToastManager } from "../toast-manager";

describe("ToastOverlay", () => {
  it("creates with a ToastManager instance", () => {
    const manager = new ToastManager();
    const overlay = new ToastOverlay({ manager });
    expect(overlay).toBeDefined();
    manager.dispose();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/cli && bun test src/widgets/__tests__/toast-overlay.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement ToastOverlay**

```ts
// packages/cli/src/widgets/toast-overlay.ts
/**
 * ToastOverlay — renders visible toasts from a ToastManager.
 *
 * 逆向: BQT rendering subscriber in 1472_tui_components (inferred from Rt/ContainerWithOverlays)
 */

import {
  StatefulWidget, State, Column, RichText, TextSpan, SizedBox,
  Container, BoxDecoration, Border, BorderSide, Padding, EdgeInsets,
} from "@flitter/tui";
import { TextStyle } from "@flitter/tui";
import { Color } from "@flitter/tui";
import type { Widget } from "@flitter/tui";
import type { BuildContext } from "@flitter/tui";
import type { ToastManager, Toast, ToastType } from "./toast-manager.js";

export interface ToastOverlayConfig {
  manager: ToastManager;
}

const TOAST_COLORS: Record<ToastType, Color> = {
  success: Color.rgb(0x9e, 0xce, 0x6a),
  error: Color.rgb(0xf7, 0x76, 0x8e),
  info: Color.rgb(0x7a, 0xa2, 0xf7),
};

const BG_COLOR = Color.rgb(0x1a, 0x1b, 0x26);

export class ToastOverlay extends StatefulWidget {
  readonly config: ToastOverlayConfig;

  constructor(config: ToastOverlayConfig) {
    super();
    this.config = config;
  }

  createState(): ToastOverlayState {
    return new ToastOverlayState();
  }
}

class ToastOverlayState extends State<ToastOverlay> {
  private _listener: (() => void) | null = null;

  initState(): void {
    super.initState();
    this._listener = () => {
      this.setState(() => {});
    };
    this.widget.config.manager.addListener(this._listener);
  }

  dispose(): void {
    if (this._listener) {
      this.widget.config.manager.removeListener(this._listener);
      this._listener = null;
    }
    super.dispose();
  }

  build(_context: BuildContext): Widget {
    const toasts = this.widget.config.manager.visibleToasts;
    if (toasts.length === 0) {
      return new SizedBox({ width: 0, height: 0 });
    }

    return new Column({
      children: toasts.map((toast) => this._buildToast(toast)),
    });
  }

  private _buildToast(toast: Toast): Widget {
    const color = TOAST_COLORS[toast.type] ?? TOAST_COLORS.info;
    const icon = toast.type === "success" ? "✓" : toast.type === "error" ? "✗" : "ℹ";

    return new Padding({
      padding: EdgeInsets.only({ bottom: 1 }),
      child: new Container({
        decoration: new BoxDecoration({
          border: new Border(
            new BorderSide({ color }),
            new BorderSide({ color }),
            new BorderSide({ color }),
            new BorderSide({ color }),
          ),
        }),
        child: new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: new RichText({
            text: new TextSpan({
              children: [
                new TextSpan({
                  text: `${icon} `,
                  style: new TextStyle({ foreground: color, bold: true }),
                }),
                new TextSpan({
                  text: toast.message,
                  style: new TextStyle({ foreground: Color.rgb(0xa9, 0xb1, 0xd6) }),
                }),
              ],
            }),
          }),
        }),
      }),
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/cli && bun test src/widgets/__tests__/toast-overlay.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/widgets/toast-overlay.ts packages/cli/src/widgets/__tests__/toast-overlay.test.ts
git commit -m "feat(cli): add ToastOverlay widget for rendering toast notifications"
```

---

### Task 3: Build ErrorDialog widget

A structured error display with title, description, and dismissal option.

**Files:**
- Create: `packages/cli/src/widgets/error-dialog.ts`
- Test: `packages/cli/src/widgets/__tests__/error-dialog.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// packages/cli/src/widgets/__tests__/error-dialog.test.ts
import { describe, it, expect } from "bun:test";
import { ErrorDialog } from "../error-dialog";

describe("ErrorDialog", () => {
  it("creates with title and description", () => {
    const dialog = new ErrorDialog({
      title: "API Error",
      description: "Failed to connect to the Anthropic API. Check your API key.",
      onDismiss: () => {},
    });
    expect(dialog).toBeDefined();
    expect(dialog.config.title).toBe("API Error");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/cli && bun test src/widgets/__tests__/error-dialog.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement ErrorDialog**

```ts
// packages/cli/src/widgets/error-dialog.ts
/**
 * ErrorDialog — ephemeral error overlay with title, description, and dismiss.
 *
 * 逆向: j0R EphemeralErrorView (1472_tui_components/actions_intents.js)
 */

import {
  StatefulWidget, State, Column, Row, RichText, TextSpan, SizedBox,
  Container, BoxDecoration, Border, BorderSide, Padding, EdgeInsets, Focus, Center,
} from "@flitter/tui";
import { TextStyle } from "@flitter/tui";
import { Color } from "@flitter/tui";
import type { Widget } from "@flitter/tui";
import type { BuildContext } from "@flitter/tui";
import type { KeyEvent } from "@flitter/tui";

export interface ErrorDialogConfig {
  title: string;
  description: string;
  onDismiss: () => void;
}

const ERROR_COLOR = Color.rgb(0xf7, 0x76, 0x8e);
const MUTED_COLOR = Color.rgb(0x56, 0x5f, 0x89);
const TEXT_COLOR = Color.rgb(0xa9, 0xb1, 0xd6);

export class ErrorDialog extends StatefulWidget {
  readonly config: ErrorDialogConfig;

  constructor(config: ErrorDialogConfig) {
    super();
    this.config = config;
  }

  createState(): ErrorDialogState {
    return new ErrorDialogState();
  }
}

class ErrorDialogState extends State<ErrorDialog> {
  build(_context: BuildContext): Widget {
    const { title, description, onDismiss } = this.widget.config;

    return new Focus({
      autofocus: true,
      onKey: (event: KeyEvent) => {
        if (event.key === "Escape" || event.key === "Enter" || event.key === "q") {
          onDismiss();
          return "handled";
        }
        return "ignored";
      },
      child: new Center({
        child: new Container({
          width: 60,
          decoration: new BoxDecoration({
            border: new Border(
              new BorderSide({ color: ERROR_COLOR }),
              new BorderSide({ color: ERROR_COLOR }),
              new BorderSide({ color: ERROR_COLOR }),
              new BorderSide({ color: ERROR_COLOR }),
            ),
          }),
          child: new Padding({
            padding: EdgeInsets.all(1),
            child: new Column({
              children: [
                new RichText({
                  text: new TextSpan({
                    text: `  ${title}`,
                    style: new TextStyle({ bold: true, foreground: ERROR_COLOR }),
                  }),
                }),
                new SizedBox({ height: 1 }),
                new RichText({
                  text: new TextSpan({
                    text: `  ${description}`,
                    style: new TextStyle({ foreground: TEXT_COLOR }),
                  }),
                }),
                new SizedBox({ height: 1 }),
                new RichText({
                  text: new TextSpan({
                    text: "  Press Esc or Enter to dismiss",
                    style: new TextStyle({ foreground: MUTED_COLOR }),
                  }),
                }),
              ],
            }),
          }),
        }),
      }),
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/cli && bun test src/widgets/__tests__/error-dialog.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/widgets/error-dialog.ts packages/cli/src/widgets/__tests__/error-dialog.test.ts
git commit -m "feat(cli): add ErrorDialog overlay widget"
```

---

### Task 4: Integrate ToastOverlay into the widget tree

Wire the `ToastManager` and `ToastOverlay` into the interactive mode's widget tree.

**Files:**
- Modify: `packages/cli/src/widgets/thread-state-widget.ts`
- Modify: `packages/cli/src/modes/interactive.ts`

- [ ] **Step 1: Add ToastManager to ThreadStateWidgetConfig**

In `packages/cli/src/widgets/thread-state-widget.ts`, add to the config:

```ts
export interface ThreadStateWidgetConfig {
  // ... existing fields ...
  /** Toast notification manager (optional, for overlay rendering) */
  toastManager?: ToastManager;
}
```

- [ ] **Step 2: Render ToastOverlay in the widget tree**

In `ThreadStateWidgetState.build()`, if `toastManager` is provided, add the `ToastOverlay` to the layout. Place it inside a `Stack` wrapping the `Expanded > Scrollable > ConversationView` area so toasts overlay the conversation:

```ts
import { ToastOverlay } from "./toast-overlay.js";
import { Stack, Positioned } from "@flitter/tui";

// In build():
const conversationArea = new Scrollable({
  controller: this._scrollController,
  child: new ConversationView({ ... }),
});

const mainContent = this.widget.config.toastManager
  ? new Stack({
      children: [
        conversationArea,
        new Positioned({
          top: 0,
          right: 0,
          child: new ToastOverlay({ manager: this.widget.config.toastManager }),
        }),
      ],
    })
  : conversationArea;
```

- [ ] **Step 3: Create and pass ToastManager in interactive mode**

In `packages/cli/src/modes/interactive.ts`:

```ts
import { ToastManager } from "../widgets/toast-manager.js";

// Inside launchInteractiveMode:
const toastManager = new ToastManager();

// Pass to ThreadStateWidget:
new ThreadStateWidget({
  // ... existing props ...
  toastManager,
})

// In finally block:
toastManager.dispose();
```

- [ ] **Step 4: Run all CLI tests**

Run: `cd packages/cli && bun test`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/widgets/thread-state-widget.ts packages/cli/src/modes/interactive.ts
git commit -m "feat(cli): integrate ToastOverlay into interactive mode widget tree"
```
