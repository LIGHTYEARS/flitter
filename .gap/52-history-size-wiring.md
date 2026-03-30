# Gap S06: History Config `historySize` Parsed but Never Wired

## Status: Open
## Severity: Low (latent bug / incomplete feature)
## Area: `packages/flitter-amp/src/state/config.ts`, `packages/flitter-amp/src/state/history.ts`, `packages/flitter-amp/src/app.ts`, `packages/flitter-amp/src/index.ts`

---

## 1. Problem Statement

The `UserConfig` interface in `config.ts` declares an optional `historySize` field
(line 12), and the `AppConfig` interface exposes a resolved `historySize: number`
(line 30). The `parseArgs` function correctly reads the value from the user's
`~/.flitter-amp/config.json`, falling back to 100 when unset:

```typescript
// config.ts line 125
historySize: userConfig.historySize ?? 100,
```

However, this value is **never propagated** to the `PromptHistory` instance. In
`app.ts` line 79, `PromptHistory` is instantiated with no arguments:

```typescript
private promptHistory = new PromptHistory();
```

The `PromptHistory` constructor defaults to `maxSize = 100`:

```typescript
// history.ts line 8
constructor(maxSize = 100) {
  this.maxSize = maxSize;
}
```

**Result**: Even when a user sets `"historySize": 500` in their config file, the
prompt history always caps at 100 entries. The config value is parsed, serialised
into `AppConfig`, and then silently discarded.

---

## 2. Root Cause Analysis

The wiring failure is caused by an architectural gap: `config` and the widget tree
are connected through two separate channels that never intersect for this
particular field.

### 2.1 How Other Config Fields Flow

| Config field       | Flows through            | Consumed by                |
|--------------------|--------------------------|----------------------------|
| `logLevel`         | `config.logLevel`        | `setLogLevel()` in `index.ts` |
| `cwd`              | `config.cwd`             | `appState.cwd` in `index.ts`  |
| `agentCommand`     | `config.agentCommand`    | `connectToAgent()` in `index.ts` |
| `expandToolCalls`  | (not wired either)       | *another latent gap*       |
| `editor`           | (not wired)              | *Ctrl+G is a TODO stub*   |
| **`historySize`**  | **nowhere**              | **`PromptHistory` ignores it** |

The `main()` function in `index.ts` creates an `AppState` and passes it to
`startTUI()`, but `AppState` has no knowledge of `AppConfig` -- it only receives
individual fields (`cwd`, `gitBranch`). `startTUI()` itself only accepts
`(appState, onSubmit, onCancel)`, so the config object is not available at the
point where the widget tree is built.

### 2.2 Why It Was Missed

The `PromptHistory` is instantiated as a private field initialiser on
`AppStateWidget` (line 79 of `app.ts`). Field initialisers run at construction
time, before `initState()`, and they have no access to constructor parameters
or `this.widget.appState`. This means even if `AppState` carried `historySize`,
the field initialiser could not use it.

---

## 3. Proposed Solution

The fix requires threading the `historySize` value from `AppConfig` through to
the `PromptHistory` constructor. There are three viable approaches, ordered from
least invasive to most architectural.

### 3.1 Option A: Pass `historySize` Through `startTUI` (Recommended)

This is the minimal-diff fix. Add `historySize` as a parameter to `startTUI` and
to the `App` widget, then use it in `AppStateWidget.initState()`.

#### 3.1.1 Changes to `app.ts`

```typescript
// --- App Widget ---

interface AppProps {
  appState: AppState;
  onSubmit: (text: string) => void;
  onCancel: () => void;
  historySize?: number;             // NEW
}

export class App extends StatefulWidget {
  readonly appState: AppState;
  readonly onSubmit: (text: string) => void;
  readonly onCancel: () => void;
  readonly historySize: number;     // NEW

  constructor(props: AppProps) {
    super({});
    this.appState = props.appState;
    this.onSubmit = props.onSubmit;
    this.onCancel = props.onCancel;
    this.historySize = props.historySize ?? 100;  // NEW
  }

  createState(): AppStateWidget {
    return new AppStateWidget();
  }
}
```

In `AppStateWidget`, move the `PromptHistory` instantiation from the field
initialiser into `initState()` where `this.widget` is available:

```typescript
class AppStateWidget extends State<App> {
  private scrollController = new ScrollController();
  private stateListener: (() => void) | null = null;
  private showCommandPalette = false;
  private showFilePicker = false;
  private fileList: string[] = [];
  private promptHistory!: PromptHistory;  // CHANGED: definite assignment assertion
  private _lastUpdate = 0;
  private _pendingTimer: ReturnType<typeof setTimeout> | null = null;

  override initState(): void {
    super.initState();
    // Wire config historySize to PromptHistory
    this.promptHistory = new PromptHistory(this.widget.historySize);  // NEW

    // Listen to AppState changes and trigger rebuilds (50ms throttle for streaming)
    this.stateListener = () => {
      const now = Date.now();
      const elapsed = now - this._lastUpdate;

      if (elapsed >= 50) {
        this._flushUpdate();
      } else if (!this._pendingTimer) {
        this._pendingTimer = setTimeout(() => {
          this._flushUpdate();
        }, 50 - elapsed);
      }
    };
    this.widget.appState.addListener(this.stateListener);
  }

  // ... rest unchanged
}
```

Update the `startTUI` function signature:

```typescript
export async function startTUI(
  appState: AppState,
  onSubmit: (text: string) => void,
  onCancel: () => void,
  historySize?: number,             // NEW
): Promise<WidgetsBinding> {
  const app = new App({ appState, onSubmit, onCancel, historySize });
  return runApp(app, {
    output: process.stdout,
    terminal: true,
    errorLogger: log.error,
  });
}
```

#### 3.1.2 Changes to `index.ts`

Pass `config.historySize` when calling `startTUI`:

```typescript
// index.ts line 119 — change from:
await startTUI(appState, handleSubmit, handleCancel);

// to:
await startTUI(appState, handleSubmit, handleCancel, config.historySize);
```

#### 3.1.3 No Changes Required to `history.ts` or `config.ts`

Both files are already correct. `PromptHistory` already accepts `maxSize` in its
constructor, and `parseArgs` already produces the right value in `config.historySize`.

### 3.2 Option B: Store Config on `AppState`

Add the full `AppConfig` (or a subset) to `AppState` so all widgets can access
configuration without additional prop drilling.

```typescript
// app-state.ts
export class AppState implements ClientCallbacks {
  readonly conversation = new ConversationState();
  config: AppConfig | null = null;   // NEW
  // ...
}

// index.ts
const appState = new AppState();
appState.config = config;            // NEW
appState.cwd = config.cwd;

// app.ts — in AppStateWidget.initState():
const historySize = this.widget.appState.config?.historySize ?? 100;
this.promptHistory = new PromptHistory(historySize);
```

**Advantage**: Future config fields (e.g. `expandToolCalls`, `editor`) can also
be consumed from `AppState` without further prop drilling.

**Disadvantage**: `AppState` becomes a config carrier in addition to its state
management role, which blurs its single responsibility.

### 3.3 Option C: Full Config Provider Pattern

Create a `ConfigProvider` inherited widget that makes `AppConfig` available
anywhere in the widget tree via context lookup, similar to how `AmpThemeProvider`
works for theming.

```typescript
// config-provider.ts
import { InheritedWidget, Widget, BuildContext } from 'flitter-core/src/framework/widget';
import type { AppConfig } from './config';

export class ConfigProvider extends InheritedWidget {
  readonly config: AppConfig;

  constructor(props: { config: AppConfig; child: Widget }) {
    super({ child: props.child });
    this.config = props.config;
  }

  static of(context: BuildContext): AppConfig {
    const provider = context.dependOnInheritedWidgetOfExactType(ConfigProvider);
    if (!provider) throw new Error('No ConfigProvider found in widget tree');
    return provider.config;
  }

  updateShouldNotify(oldWidget: ConfigProvider): boolean {
    return this.config !== oldWidget.config;
  }
}
```

Then in `app.ts`, wrap the tree and consume from any widget:

```typescript
// In AppStateWidget.build():
return new ConfigProvider({
  config: this.widget.config,
  child: new AmpThemeProvider({
    theme: createAmpTheme(darkBaseTheme),
    child: result,
  }),
});

// In any descendant widget:
const config = ConfigProvider.of(context);
```

**Advantage**: Cleanest architectural pattern, fully scalable.

**Disadvantage**: Over-engineered for a single field; requires `InheritedWidget`
infrastructure to be fully working (may not be available in current flitter-core).

---

## 4. Recommended Approach

**Option A** is recommended. It is the smallest change (roughly 10 lines modified
across two files), requires no architectural changes, and directly solves the gap.
The other options can be revisited when more config fields need to flow into the
widget tree.

---

## 5. Validation Checklist

After implementing the fix, verify the following:

### 5.1 Unit Test: Config Value Flows to PromptHistory

```typescript
import { PromptHistory } from './state/history';

describe('PromptHistory respects maxSize', () => {
  it('uses default 100 when no maxSize provided', () => {
    const history = new PromptHistory();
    for (let i = 0; i < 120; i++) {
      history.push(`entry-${i}`);
    }
    // After 120 pushes with maxSize=100, oldest 20 should be evicted
    // Navigate backward 100 times; should get entry-119 down to entry-20
    const first = history.previous();
    expect(first).toBe('entry-119');
    // Navigate to oldest
    let oldest: string | null = first;
    for (let i = 0; i < 99; i++) {
      const prev = history.previous();
      if (prev !== null) oldest = prev;
    }
    expect(oldest).toBe('entry-20');
  });

  it('respects custom maxSize from config', () => {
    const history = new PromptHistory(5);
    for (let i = 0; i < 10; i++) {
      history.push(`entry-${i}`);
    }
    // Only last 5 should remain: entry-5 through entry-9
    const entries: string[] = [];
    let prev = history.previous();
    while (prev !== null) {
      entries.push(prev);
      prev = history.previous();
    }
    expect(entries).toEqual(['entry-9', 'entry-8', 'entry-7', 'entry-6', 'entry-5']);
  });
});
```

### 5.2 Integration Test: Config File Sets History Size

```typescript
import { parseArgs } from './state/config';

describe('parseArgs historySize', () => {
  it('defaults to 100 when config file has no historySize', () => {
    const config = parseArgs(['bun', 'script.ts']);
    expect(config.historySize).toBe(100);
  });

  // With a mock config file setting historySize: 500
  it('reads historySize from config file', () => {
    // Requires mocking homedir() and fs.readFileSync
    // to return { "historySize": 500 }
    const config = parseArgs(['bun', 'script.ts']);
    expect(config.historySize).toBe(500);
  });
});
```

### 5.3 Manual Verification

1. Create `~/.flitter-amp/config.json` with `{ "historySize": 3 }`
2. Launch `flitter-amp`, submit 5 prompts
3. Press Ctrl+R repeatedly -- should only recall the last 3 prompts
4. Remove the config file, restart -- should now recall up to 100 prompts

---

## 6. Diff Summary (Option A)

### `packages/flitter-amp/src/app.ts`

```diff
 interface AppProps {
   appState: AppState;
   onSubmit: (text: string) => void;
   onCancel: () => void;
+  historySize?: number;
 }

 export class App extends StatefulWidget {
   readonly appState: AppState;
   readonly onSubmit: (text: string) => void;
   readonly onCancel: () => void;
+  readonly historySize: number;

   constructor(props: AppProps) {
     super({});
     this.appState = props.appState;
     this.onSubmit = props.onSubmit;
     this.onCancel = props.onCancel;
+    this.historySize = props.historySize ?? 100;
   }

   createState(): AppStateWidget {
@@ class AppStateWidget extends State<App> {
   private showCommandPalette = false;
   private showFilePicker = false;
   private fileList: string[] = [];
-  private promptHistory = new PromptHistory();
+  private promptHistory!: PromptHistory;
   private _lastUpdate = 0;
   private _pendingTimer: ReturnType<typeof setTimeout> | null = null;

   override initState(): void {
     super.initState();
+    this.promptHistory = new PromptHistory(this.widget.historySize);
     // Listen to AppState changes ...
@@ export async function startTUI(
   appState: AppState,
   onSubmit: (text: string) => void,
   onCancel: () => void,
+  historySize?: number,
 ): Promise<WidgetsBinding> {
-  const app = new App({ appState, onSubmit, onCancel });
+  const app = new App({ appState, onSubmit, onCancel, historySize });
   return runApp(app, {
```

### `packages/flitter-amp/src/index.ts`

```diff
   // Start the TUI
   log.info('Starting TUI...');
-  await startTUI(appState, handleSubmit, handleCancel);
+  await startTUI(appState, handleSubmit, handleCancel, config.historySize);
 }
```

**Total**: ~12 lines changed across 2 files. No changes to `config.ts` or
`history.ts`.

---

## 7. Related Gaps

- **`expandToolCalls` is also parsed but not wired**: The `AppConfig` produces
  `expandToolCalls: boolean` but the conversation items do not receive this
  default. This is a sibling gap that could be fixed simultaneously.
- **`editor` config field**: Parsed and stored but the Ctrl+G handler is a TODO
  stub, so there is nothing to wire it to yet. Not a gap until the feature is
  implemented.
- **Gap 51 (prompt history fix)**: Addresses `TextEditingController` wiring for
  Ctrl+R text injection. Orthogonal to this gap but touches the same
  `AppStateWidget` class -- the two fixes should be coordinated to avoid merge
  conflicts on the `promptHistory` field declaration.
