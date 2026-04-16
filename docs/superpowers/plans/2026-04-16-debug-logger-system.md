# Debug Logger System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a structured, level-gated logging system to Flitter TUI, aligned with amp's `ScopedLogger` (`Sb`) architecture: scoped channels, `error`/`warn`/`info`/`debug` levels, environment-variable control, stderr output.

**Architecture:** A singleton `Logger` with a swappable backend (bootstrap console → future file/Winston). Scoped child loggers add dotted prefixes (`frame`, `input`, `mouse`, `build`, `paint`). The `debug` level is gated by `FLITTER_LOG_LEVEL` env var (default `info`). Five instrumentation points in the existing pipeline produce structured log events. No changes to the rendering hot path when debug is off — the gate check is a single boolean comparison.

**Tech Stack:** TypeScript, `process.env`, `console.error` (stderr), existing `bun test` runner.

**Amp reference:** `amp-cli-reversed/modules/1542_unknown_Sb.js` (ScopedLogger), `modules/2026_tail_anonymous.js:59921-59944` (bootstrap backend with `ynR()` gate), `modules/2004_unknown_RF0.js` (log level resolution from argv/env), `modules/2120_ForExit_d9.js:183-204` (event timing recorded to FrameStatsOverlay but no per-event debug logging — amp's core rendering loop is silent).

---

## Scope

This plan covers **one subsystem**: the Logger module + five instrumentation points. It does NOT cover:
- Winston/file-based logging backend (future plan)
- OTEL tracing integration (future plan)
- Console capture ring buffer (`Es` in amp — future plan)
- Performance stats overlay (already exists at `packages/tui/src/perf/`)

## File Structure

```
packages/tui/src/debug/
├── logger.ts              # Logger class, LogBackend interface, singleton, env-var gating
├── logger.test.ts         # Unit tests for Logger
└── index.ts               # Barrel export

packages/tui/src/index.ts  # Add re-export of debug/index.js
```

Instrumentation is added to **existing** files (no new files for instrumentation):

| Existing file | What gets added |
|---|---|
| `src/vt/input-parser.ts` | `logger.debug(...)` in `handleSgrMouse` + `handleKeyEvent` |
| `src/gestures/mouse-manager.ts` | `logger.debug(...)` in `handleMouseEvent` with hit-test summary |
| `src/tree/build-owner.ts` | `logger.debug(...)` in `scheduleBuildFor` + `buildScopes` |
| `src/tree/frame-scheduler.ts` | `logger.debug(...)` in `requestFrame` + `executeFrame` |
| `src/binding/widgets-binding.ts` | `logger.debug(...)` in `paint` + `render` with shouldPaint/didPaint |

---

## Task 1: Logger core — `LogBackend` interface + `Logger` class

**Files:**
- Create: `packages/tui/src/debug/logger.ts`
- Test: `packages/tui/src/debug/logger.test.ts`

**Amp reference:** `modules/1542_unknown_Sb.js` — class `Sb` with `baseLogger`, `scope`, `context`, and methods `error`/`warn`/`info`/`debug`/`scoped(name)`. The bootstrap backend at `modules/2026_tail_anonymous.js:59921-59944` gates `debug()` behind a flag and writes everything to `console.error` (stderr). Log level resolution at `modules/2004_unknown_RF0.js`: precedence is `--log-level` flag > `AMP_LOG_LEVEL` env > `"info"` default.

- [ ] **Step 1: Write failing tests for Logger**

Create `packages/tui/src/debug/logger.test.ts`:

```typescript
/**
 * Logger 单元测试。
 *
 * 覆盖: 日志级别过滤、scoped 子 logger、自定义 backend、
 * 环境变量控制、默认 stderr 输出。
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Logger, type LogBackend, LOG_LEVELS } from "./logger.js";

describe("Logger", () => {
  let captured: Array<{ level: string; msg: string; args: unknown[] }>;
  let backend: LogBackend;

  beforeEach(() => {
    captured = [];
    backend = {
      error: (msg, ...args) => captured.push({ level: "error", msg, args }),
      warn: (msg, ...args) => captured.push({ level: "warn", msg, args }),
      info: (msg, ...args) => captured.push({ level: "info", msg, args }),
      debug: (msg, ...args) => captured.push({ level: "debug", msg, args }),
    };
  });

  test("info 级别下 debug 消息被过滤", () => {
    const logger = new Logger({ backend, level: "info" });
    logger.debug("should not appear");
    logger.info("should appear");
    expect(captured.length).toBe(1);
    expect(captured[0]!.level).toBe("info");
  });

  test("debug 级别下所有消息都通过", () => {
    const logger = new Logger({ backend, level: "debug" });
    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");
    expect(captured.length).toBe(4);
  });

  test("error 级别下只有 error 通过", () => {
    const logger = new Logger({ backend, level: "error" });
    logger.debug("no");
    logger.info("no");
    logger.warn("no");
    logger.error("yes");
    expect(captured.length).toBe(1);
    expect(captured[0]!.level).toBe("error");
  });

  test("scoped 子 logger 添加前缀", () => {
    const logger = new Logger({ backend, level: "debug" });
    const child = logger.scoped("frame");
    child.debug("tick");
    expect(captured[0]!.msg).toBe("[frame] tick");
  });

  test("嵌套 scoped 产生点分前缀", () => {
    const logger = new Logger({ backend, level: "debug" });
    const child = logger.scoped("mouse").scoped("hit");
    child.info("found 2 targets");
    expect(captured[0]!.msg).toBe("[mouse.hit] found 2 targets");
  });

  test("额外参数透传到 backend", () => {
    const logger = new Logger({ backend, level: "debug" });
    logger.info("event", { x: 10, y: 5 });
    expect(captured[0]!.args).toEqual([{ x: 10, y: 5 }]);
  });

  test("LOG_LEVELS 数值排序正确", () => {
    expect(LOG_LEVELS.error).toBeLessThan(LOG_LEVELS.warn);
    expect(LOG_LEVELS.warn).toBeLessThan(LOG_LEVELS.info);
    expect(LOG_LEVELS.info).toBeLessThan(LOG_LEVELS.debug);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/tui/src/debug/logger.test.ts`
Expected: FAIL — module `./logger.js` not found.

- [ ] **Step 3: Implement Logger**

Create `packages/tui/src/debug/logger.ts`:

```typescript
/**
 * 结构化日志系统。
 *
 * {@link Logger} 提供分级日志（error/warn/info/debug），支持
 * scoped 子 logger（点分前缀），通过环境变量 FLITTER_LOG_LEVEL 控制级别。
 * 所有输出写到 stderr，不干扰终端渲染。
 *
 * 逆向: Sb (ScopedLogger) in 1542_unknown_Sb.js
 * 逆向: bootstrap backend hiT in 2026_tail_anonymous.js:59921-59944
 * 逆向: log level resolution RF0 in 2004_unknown_RF0.js
 *
 * @module
 */

/**
 * 日志级别数值映射。
 *
 * 逆向: amp 使用 Winston 的 npm levels: error=0, warn=1, info=3, debug=5。
 * 我们简化为四级，数值越大越详细。
 */
export const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
} as const;

export type LogLevel = keyof typeof LOG_LEVELS;

/**
 * 日志后端接口。
 *
 * 逆向: amp 的 xl 可替换后端 (hiT → Winston)。
 * 默认实现写到 stderr (console.error)。
 */
export interface LogBackend {
  error(msg: string, ...args: unknown[]): void;
  warn(msg: string, ...args: unknown[]): void;
  info(msg: string, ...args: unknown[]): void;
  debug(msg: string, ...args: unknown[]): void;
}

/** 默认 stderr backend — 所有级别写到 console.error 以免干扰 stdout 渲染。 */
const stderrBackend: LogBackend = {
  error: (msg, ...args) => console.error(msg, ...args),
  warn: (msg, ...args) => console.error(msg, ...args),
  info: (msg, ...args) => console.error(msg, ...args),
  debug: (msg, ...args) => console.error(msg, ...args),
};

/**
 * 从环境变量解析日志级别。
 *
 * 逆向: RF0 — 优先级: FLITTER_LOG_LEVEL env > "info" default。
 */
function resolveLevel(): LogLevel {
  const env = (typeof process !== "undefined"
    ? process.env.FLITTER_LOG_LEVEL
    : undefined
  )?.trim().toLowerCase();
  if (env && env in LOG_LEVELS) return env as LogLevel;
  return "info";
}

/**
 * 结构化 Logger。
 *
 * 逆向: Sb (ScopedLogger) in 1542_unknown_Sb.js
 *
 * 支持 scoped 子 logger 和可替换后端。
 * debug 级别消息仅在 FLITTER_LOG_LEVEL=debug 时输出。
 */
export class Logger {
  private _backend: LogBackend;
  private _level: number;
  private _scope: string | undefined;

  constructor(opts?: { backend?: LogBackend; level?: LogLevel; scope?: string }) {
    this._backend = opts?.backend ?? stderrBackend;
    this._level = LOG_LEVELS[opts?.level ?? resolveLevel()];
    this._scope = opts?.scope;
  }

  /**
   * 创建带作用域前缀的子 logger。
   *
   * 逆向: Sb.scoped(T) — 返回新 Sb，scope 用点号连接。
   */
  scoped(name: string): Logger {
    const childScope = this._scope ? `${this._scope}.${name}` : name;
    return new Logger({
      backend: this._backend,
      level: this._levelName(),
      scope: childScope,
    });
  }

  error(msg: string, ...args: unknown[]): void {
    if (this._level >= LOG_LEVELS.error) {
      this._backend.error(this._prefix(msg), ...args);
    }
  }

  warn(msg: string, ...args: unknown[]): void {
    if (this._level >= LOG_LEVELS.warn) {
      this._backend.warn(this._prefix(msg), ...args);
    }
  }

  info(msg: string, ...args: unknown[]): void {
    if (this._level >= LOG_LEVELS.info) {
      this._backend.info(this._prefix(msg), ...args);
    }
  }

  debug(msg: string, ...args: unknown[]): void {
    if (this._level >= LOG_LEVELS.debug) {
      this._backend.debug(this._prefix(msg), ...args);
    }
  }

  private _prefix(msg: string): string {
    return this._scope ? `[${this._scope}] ${msg}` : msg;
  }

  private _levelName(): LogLevel {
    for (const [name, val] of Object.entries(LOG_LEVELS)) {
      if (val === this._level) return name as LogLevel;
    }
    return "info";
  }
}

/**
 * 全局 logger 单例。
 *
 * 逆向: amp 的全局 J = fD (代理到 xl 后端)。
 *
 * 导入后直接使用：
 * ```ts
 * import { logger } from "../debug/logger.js";
 * const log = logger.scoped("frame");
 * log.debug("executeFrame START");
 * ```
 */
export const logger = new Logger();
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/tui/src/debug/logger.test.ts`
Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/tui/src/debug/logger.ts packages/tui/src/debug/logger.test.ts
git commit -m "feat(debug): add Logger with scoped channels and level gating

逆向: Sb (ScopedLogger) in 1542_unknown_Sb.js
逆向: bootstrap backend hiT in 2026_tail_anonymous.js:59921-59944
逆向: log level resolution RF0 in 2004_unknown_RF0.js"
```

---

## Task 2: Barrel export + wiring into package

**Files:**
- Create: `packages/tui/src/debug/index.ts`
- Modify: `packages/tui/src/index.ts`

- [ ] **Step 1: Create barrel file**

Create `packages/tui/src/debug/index.ts`:

```typescript
/**
 * 调试/日志子模块统一导出。
 *
 * @module
 */

export { Logger, logger, LOG_LEVELS } from "./logger.js";
export type { LogBackend, LogLevel } from "./logger.js";
```

- [ ] **Step 2: Add re-export to root index.ts**

In `packages/tui/src/index.ts`, add after the `export * from "./binding/index.js";` line:

```typescript
export * from "./debug/index.js";
```

- [ ] **Step 3: Run all tests to verify no regression**

Run: `bun test packages/tui/`
Expected: 1234+ tests pass, 0 fail.

- [ ] **Step 4: Commit**

```bash
git add packages/tui/src/debug/index.ts packages/tui/src/index.ts
git commit -m "feat(debug): wire Logger into package barrel exports"
```

---

## Task 3: Instrument InputParser (input channel)

**Files:**
- Modify: `packages/tui/src/vt/input-parser.ts`

**Amp reference:** `modules/2120_ForExit_d9.js:183-204` — amp does NOT log individual input events to J.debug. It only records timing to `frameStatsOverlay.recordKeyEvent(a)` / `recordMouseEvent(a)`. We follow the same pattern: log at `debug` level only (default-silent), and keep it minimal — one line per parsed event, not per raw byte.

- [ ] **Step 1: Add import and scoped logger**

At the top of `packages/tui/src/vt/input-parser.ts`, after existing imports, add:

```typescript
import { logger } from "../debug/logger.js";

const log = logger.scoped("input");
```

- [ ] **Step 2: Add debug log in handleSgrMouse**

In the `handleSgrMouse` method (around line 492-499), after the `this.emit(decodeSgrMouse(...))` call, add before the closing brace:

```typescript
    const decoded = decodeSgrMouse(buttonByte, x1, y1, finalChar);
    log.debug("mouse", { action: decoded.action, button: decoded.button, x: decoded.x, y: decoded.y });
    this.emit(decoded);
```

This replaces the existing `this.emit(decodeSgrMouse(buttonByte, x1, y1, finalChar));` line — decode into a variable first so we can log and emit it.

- [ ] **Step 3: Add debug log in key event emission**

Find where key events are emitted (the `emit` call with `type: "key"` in `handleKeyEvent` or equivalent). Add:

```typescript
log.debug("key", { key: event.key, ctrl: event.modifiers.ctrl, alt: event.modifiers.alt });
```

(Use the actual variable name holding the key event at that point in the code.)

- [ ] **Step 4: Run all tests**

Run: `bun test packages/tui/`
Expected: all pass, 0 fail. Debug logs are silent at default `info` level.

- [ ] **Step 5: Commit**

```bash
git add packages/tui/src/vt/input-parser.ts
git commit -m "feat(debug): instrument InputParser with debug-level event logging

逆向: amp records event timing only (d9.js:183-204), not individual events.
Flitter logs parsed events at debug level for pipeline tracing."
```

---

## Task 4: Instrument MouseManager (mouse channel)

**Files:**
- Modify: `packages/tui/src/gestures/mouse-manager.ts`

**Amp reference:** `modules/2120_ForExit_d9.js:183-204` — `this.mouseManager.handleMouseEvent(T)` has no J.debug calls, only timing. The MouseManager itself (`ha` class in `2026_tail_anonymous.js:158234-158275`) is silent. We add minimal debug output: event received + hit count.

- [ ] **Step 1: Add import and scoped logger**

At the top of `packages/tui/src/gestures/mouse-manager.ts`, after existing imports:

```typescript
import { logger } from "../debug/logger.js";

const log = logger.scoped("mouse");
```

- [ ] **Step 2: Add debug log at entry of handleMouseEvent**

In `handleMouseEvent` (line ~336), after the `if (!this._rootRenderObject) return;` guard, add:

```typescript
    log.debug("event", { action: event.action, x: event.x, y: event.y, button: event.button });
```

- [ ] **Step 3: Add debug log after hit test**

After `const mouseTargets = this._findMouseTargets(result.hits);` (line ~342), add:

```typescript
    log.debug("hitTest", { hits: result.hits.length, targets: mouseTargets.length });
```

- [ ] **Step 4: Run all tests**

Run: `bun test packages/tui/`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add packages/tui/src/gestures/mouse-manager.ts
git commit -m "feat(debug): instrument MouseManager with debug-level hit-test logging"
```

---

## Task 5: Instrument BuildOwner (build channel)

**Files:**
- Modify: `packages/tui/src/tree/build-owner.ts`

**Amp reference:** amp's BuildOwner equivalent has no J.debug calls — build/rebuild is entirely silent. We add minimal debug for pipeline tracing.

- [ ] **Step 1: Add import and scoped logger**

At the top of `packages/tui/src/tree/build-owner.ts`, after existing imports:

```typescript
import { logger } from "../debug/logger.js";

const log = logger.scoped("build");
```

- [ ] **Step 2: Add debug log in scheduleBuildFor**

In `scheduleBuildFor` (line ~55), before `this._onNeedFrame?.()`:

```typescript
    log.debug("scheduleBuildFor", { element: (element as any).constructor?.name, dirty: this._dirtyElements.size });
```

- [ ] **Step 3: Add debug log in buildScopes**

In `buildScopes` (line ~67), at the start of the method:

```typescript
    log.debug("buildScopes", { dirty: this._dirtyElements.size });
```

- [ ] **Step 4: Run all tests**

Run: `bun test packages/tui/`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add packages/tui/src/tree/build-owner.ts
git commit -m "feat(debug): instrument BuildOwner with debug-level dirty-count logging"
```

---

## Task 6: Instrument FrameScheduler (frame channel)

**Files:**
- Modify: `packages/tui/src/tree/frame-scheduler.ts`

**Amp reference:** `modules/2120_ForExit_d9.js:96-100` — amp logs `J.debug("Requesting initial frame...")` at startup and `J.debug("Cleaning up...")` at shutdown, but NOT per-frame debug output. We follow the same spirit: log frame lifecycle events, not per-phase details.

- [ ] **Step 1: Add import and scoped logger**

At the top of `packages/tui/src/tree/frame-scheduler.ts`, after existing imports (there may be none — it's self-contained):

```typescript
import { logger } from "../debug/logger.js";

const log = logger.scoped("frame");
```

- [ ] **Step 2: Add debug log in requestFrame**

In `requestFrame()` (line ~92), at the very start:

```typescript
    log.debug("requestFrame", { inProgress: this._frameInProgress, scheduled: this._frameScheduled, pendingTimer: this._pendingFrameTimer !== null });
```

- [ ] **Step 3: Add debug log in _runFrame**

In `_runFrame()` (line ~179), at the start after `this._frameInProgress = true;`:

```typescript
    log.debug("frameStart");
```

At the end, before `this._frameInProgress = false;`:

```typescript
    log.debug("frameEnd");
```

- [ ] **Step 4: Run all tests**

Run: `bun test packages/tui/`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add packages/tui/src/tree/frame-scheduler.ts
git commit -m "feat(debug): instrument FrameScheduler with debug-level frame lifecycle logging

逆向: amp logs frame lifecycle at startup/shutdown (d9.js:96-100), not per-frame."
```

---

## Task 7: Instrument WidgetsBinding paint/render (paint channel)

**Files:**
- Modify: `packages/tui/src/binding/widgets-binding.ts`

**Amp reference:** `modules/2120_ForExit_d9.js` — paint/render has only `J.error("Paint error:", R)` and `J.error("Render error:", T)` on exception. No debug logging. We add `shouldPaint`/`didPaint` flags since this is where the "build ran but screen didn't update" class of bugs lives.

- [ ] **Step 1: Add import and scoped logger**

At the top of `packages/tui/src/binding/widgets-binding.ts`, after existing imports:

```typescript
import { logger } from "../debug/logger.js";

const log = logger.scoped("paint");
```

- [ ] **Step 2: Add debug log in beginFrame**

In `beginFrame()` (line ~559), after setting `this.shouldPaintCurrentFrame`:

```typescript
    log.debug("beginFrame", { shouldPaint: this.shouldPaintCurrentFrame, dirty: this.buildOwner.hasDirtyElements, force: this.forcePaintOnNextFrame });
```

Note: add this line BEFORE `this.forcePaintOnNextFrame = false;` so the log captures the pre-clear value.

- [ ] **Step 3: Add debug log in render**

In `render()` (line ~594), after the `if (!this.didPaintCurrentFrame) return;` guard:

```typescript
    log.debug("render");
```

- [ ] **Step 4: Run all tests**

Run: `bun test packages/tui/`
Expected: all pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add packages/tui/src/binding/widgets-binding.ts
git commit -m "feat(debug): instrument WidgetsBinding paint/render with debug-level logging

逆向: amp logs only errors in paint/render (d9.js). Added shouldPaint/dirty
flags at debug level for pipeline tracing."
```

---

## Task 8: Manual tmux verification

This is not code — it's the integration verification required by CLAUDE.md Rule 2.

- [ ] **Step 1: Launch interactive demo with debug logging**

```bash
tmux kill-session -t debug-test 2>/dev/null || true
tmux new-session -d -s debug-test -x 80 -y 24 \
  "FLITTER_LOG_LEVEL=debug bun run examples/tui-interactive-demo.ts 2>/tmp/debug-test.log"
sleep 3
```

- [ ] **Step 2: Verify initial frame log output**

```bash
cat /tmp/debug-test.log | head -20
```

Expected: lines containing `[frame]`, `[build]`, `[paint]` from the initial frame. No `[input]` or `[mouse]` yet (no events sent).

- [ ] **Step 3: Send a click and verify event pipeline in logs**

```bash
tmux send-keys -t debug-test -- $'\x1b[<0;8;8M'
sleep 0.5
grep '\[input\]' /tmp/debug-test.log | tail -1
grep '\[mouse\]' /tmp/debug-test.log | tail -2
grep '\[build\]' /tmp/debug-test.log | tail -2
grep '\[frame\]' /tmp/debug-test.log | tail -3
grep '\[paint\]' /tmp/debug-test.log | tail -1
```

Expected: each channel has at least one entry showing the click propagated through the full pipeline.

- [ ] **Step 4: Verify screen updated**

```bash
tmux capture-pane -t debug-test -p | grep "Click Me"
```

Expected: button text shows `Click Me (1)` — count updated.

- [ ] **Step 5: Verify default level is silent**

```bash
tmux kill-session -t debug-test 2>/dev/null || true
tmux new-session -d -s debug-test -x 80 -y 24 \
  "bun run examples/tui-interactive-demo.ts 2>/tmp/debug-silent.log"
sleep 3
tmux send-keys -t debug-test -- $'\x1b[<0;8;8M'
sleep 0.5
wc -l < /tmp/debug-silent.log
```

Expected: 0 lines (or close to it) — no debug output at default `info` level.

- [ ] **Step 6: Clean up**

```bash
tmux kill-session -t debug-test 2>/dev/null || true
```
