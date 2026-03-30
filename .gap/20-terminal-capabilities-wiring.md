# Gap R10: Terminal Capability Detection Not Wired into MediaQuery in runApp()

## Status: Proposal
## Affected packages: `flitter-core`
## Depends on: None (all prerequisite infrastructure exists)

---

## 1. Problem Statement

### 1.1 What Is Missing

Flitter's `WidgetsBinding.runApp()` in
`/home/gem/workspace/flitter/packages/flitter-core/src/framework/binding.ts`
creates a `MediaQueryData` via the static factory `MediaQueryData.fromTerminal(cols, rows)`,
which populates size correctly but uses **hardcoded conservative defaults** for
the `capabilities` field:

```typescript
// binding.ts, line 892-895
const wrappedWidget = new MediaQuery({
  data: MediaQueryData.fromTerminal(cols, rows),
  child: widget,
});
```

`MediaQueryData.fromTerminal()` in
`/home/gem/workspace/flitter/packages/flitter-core/src/widgets/media-query.ts`
(line 52-56) constructs capabilities with:

```typescript
static fromTerminal(cols: number, rows: number): MediaQueryData {
  return new MediaQueryData({
    size: { width: cols, height: rows },
    // no capabilities passed -- defaults to:
    //   colorDepth: 'ansi256', mouseSupport: false,
    //   emojiWidth: 'unknown', kittyGraphics: false
  });
}
```

Meanwhile, `TerminalManager` in
`/home/gem/workspace/flitter/packages/flitter-core/src/terminal/terminal-manager.ts`
already performs real capability detection in its constructor (line 68):

```typescript
this._capabilities = detectCapabilities();
```

The `detectCapabilities()` function in
`/home/gem/workspace/flitter/packages/flitter-core/src/terminal/platform.ts`
(lines 34-77) inspects `TERM`, `COLORTERM`, and `TERM_PROGRAM` environment
variables to determine actual terminal capabilities (true color, 256 color,
mouse support, alt screen, sync output, unicode, hyperlinks, and extended
capabilities like Kitty keyboard and graphics).

Additionally, the platform module provides sophisticated escape-sequence-based
capability probing via `buildCapabilityQuery()`, `parseCapabilityResponse()`,
and `mergeCapabilities()` (lines 384-533) -- but none of this is wired through
to `MediaQueryData.capabilities`.

**The result**: The widget tree always sees `colorDepth: 'ansi256'`,
`mouseSupport: false`, `emojiWidth: 'unknown'`, `kittyGraphics: false` --
regardless of what the actual terminal supports. Widgets that call
`MediaQuery.capabilitiesOf(context)` receive useless defaults.

### 1.2 The Amp Reference Pattern

The Amp binary's `J3.runApp()` (`.reference/widget-tree.md:1189-1236`) follows
a very different sequence:

```js
async runApp(g) {
  this.tui.init();
  this.tui.enterAltScreen();
  // ... focus/idle tracking init ...
  await this.tui.waitForCapabilities(1000);    // <-- WAITS for async detection
  // ... color detection from queryParser ...
  let r = this.createMediaQueryWrapper(g);     // <-- creates MediaQuery AFTER detection
  this.rootElement = r.createElement();
  this.rootElement.mount();
  // ...
}
```

And `J3.createMediaQueryWrapper()` (`.reference/widget-tree.md:1277-1282`):

```js
createMediaQueryWrapper(g) {
  let t = this.tui.getCapabilities() || xF();  // <-- reads REAL capabilities from TUI
  let b = this.tui.getSize();
  let s = new nA(b, t);                        // <-- MediaQueryData gets real caps
  return new Q3({ data: s, child: g });
}
```

Key differences from Flitter's current implementation:

1. **Amp waits for async capability detection** (`waitForCapabilities(1000)`)
   before creating MediaQuery. Flitter creates MediaQuery immediately with
   defaults.
2. **Amp reads capabilities from `wB0.getCapabilities()`** which returns the
   detected results. Flitter ignores `TerminalManager.capabilities` entirely
   when constructing `MediaQueryData`.
3. **Amp has `onCapabilities` handler callbacks** on `wB0`
   (`.reference/screen-buffer.md:769`) for late-arriving capability responses.
   Flitter has no mechanism to update MediaQuery when new capability data
   arrives.
4. **Amp uses `createMediaQueryWrapper()` as a separate method** called after
   all detection is complete. Flitter inlines the MediaQuery creation in
   `runApp()` before the `TerminalManager` with the real platform is even
   created (the real `TerminalManager` is created on line 906, but `MediaQuery`
   is created on line 892).

### 1.3 Additional Wiring Issue: Ordering in runApp()

There is a subtle but critical ordering problem in Flitter's `runApp()`. The
MediaQuery is created at line 892 with conservative defaults, and then the
`TerminalManager` is replaced with a real `BunPlatform`-backed instance at
line 906. This means:

1. MediaQuery is created with dummy capabilities (line 892).
2. `attachRootWidget()` is called, mounting the tree (line 897).
3. The real `TerminalManager` is created with detected capabilities (line 906).
4. The real capabilities are never fed back to MediaQuery.

The widget tree is already mounted and rendered before real capabilities are
even available.

### 1.4 Type Mismatch Between MediaQuery and Platform Capabilities

There are **two separate `TerminalCapabilities` interfaces** that do not align:

**`media-query.ts` `TerminalCapabilities`** (line 15-20):
```typescript
export interface TerminalCapabilities {
  readonly colorDepth: 'none' | 'ansi256' | 'truecolor';
  readonly mouseSupport: boolean;
  readonly emojiWidth: 'unknown' | 'narrow' | 'wide';
  readonly kittyGraphics: boolean;
}
```

**`platform.ts` `TerminalCapabilities`** (line 12-27):
```typescript
export interface TerminalCapabilities {
  trueColor: boolean;
  ansi256: boolean;
  mouse: boolean;
  altScreen: boolean;
  syncOutput: boolean;
  unicode: boolean;
  hyperlinks: boolean;
  kittyKeyboard?: boolean;
  modifyOtherKeys?: boolean;
  emojiWidth?: boolean;
  inBandResize?: boolean;
  pixelMouse?: boolean;
  kittyGraphics?: boolean;
}
```

These are entirely different shapes. There is no translation layer between the
low-level platform detection results and the high-level `MediaQueryData`
capabilities that widgets consume. A conversion function is needed.

### 1.5 SIGWINCH Handler Recreates MediaQuery Without Capabilities

The SIGWINCH handler in `runApp()` (line 942-960) also creates a new
`MediaQuery` on resize, again using `MediaQueryData.fromTerminal()` without
capabilities:

```typescript
process.on('SIGWINCH', () => {
  const size = p.getTerminalSize();
  this.handleResize(size.columns, size.rows);
  const newWrapped = new MediaQuery({
    data: MediaQueryData.fromTerminal(size.columns, size.rows),  // no caps!
    child: widget,
  });
  this.attachRootWidget(newWrapped);
});
```

Even if the initial wiring is fixed, every terminal resize resets capabilities
back to defaults.

---

## 2. Impact

### 2.1 Widgets That Use Capabilities

Several widgets in the codebase call `MediaQuery.capabilitiesOf(context)` or
inspect `MediaQuery.of(context).capabilities`:

- **Text widget** (`widgets/text.ts`): Amp's `e0` render object reads
  `Q3.of(context)` to determine emoji width support
  (`.reference/widgets-catalog.md:287-288`). Currently always gets `'unknown'`.
- **Image Preview** (`widgets/image-preview.ts`): Checks `kittyGraphics`
  capability to decide whether to use Kitty inline image protocol or ASCII
  fallback. Currently always gets `false`.
- **Markdown widget** (`widgets/markdown.ts`): May use color depth to decide
  syntax highlighting complexity.
- **Any future widget** that adapts rendering based on terminal support (e.g.,
  hyperlinks, true color gradients, mouse hover effects).

### 2.2 Concrete User-Visible Bugs

1. **No Kitty graphics**: Image widgets never detect Kitty support, so they
   always fall back to ASCII art even in Kitty, WezTerm, or other capable
   terminals.
2. **No true color**: Widgets that could use 24-bit color always see
   `colorDepth: 'ansi256'`, so they render with reduced palette.
3. **No mouse support reported**: `mouseSupport: false` even though the binding
   enables SGR mouse mode. Widgets checking this field to conditionally render
   hover states or click targets will not render them.
4. **Emoji width unknown**: Text layout code cannot optimize for terminals
   that report emoji width support, potentially causing misaligned columns.

---

## 3. Proposed Solution

### 3.1 Overview

The fix requires changes in four areas:

1. **Add a capability translation function** from `platform.TerminalCapabilities`
   to `media-query.TerminalCapabilities`.
2. **Refactor `runApp()` ordering** to create `MediaQuery` after
   `TerminalManager` initialization, using real detected capabilities.
3. **Add async capability detection** with a `waitForCapabilities()` method
   and callback mechanism to update `MediaQuery` when late results arrive.
4. **Fix the SIGWINCH handler** to preserve capabilities when recreating
   `MediaQuery` on resize.

### 3.2 Step 1: Capability Translation Function

Add a conversion function to bridge the two `TerminalCapabilities` interfaces.
This should live in a shared location, either in `media-query.ts` as a static
method on `MediaQueryData`, or in a new utility module.

```typescript
// File: packages/flitter-core/src/widgets/media-query.ts
// Addition to MediaQueryData class

import type { TerminalCapabilities as PlatformCapabilities } from '../terminal/platform';

/**
 * Convert platform-level detected capabilities into MediaQuery-level
 * capabilities for the widget tree.
 *
 * Amp ref: J3.createMediaQueryWrapper reads wB0.getCapabilities()
 * and passes them directly to nA constructor. In Flitter, the two
 * capability interfaces have different shapes, so this translation
 * is needed.
 */
static fromPlatformCapabilities(
  platformCaps: PlatformCapabilities,
): TerminalCapabilities {
  // Determine colorDepth from the boolean flags
  let colorDepth: 'none' | 'ansi256' | 'truecolor';
  if (platformCaps.trueColor) {
    colorDepth = 'truecolor';
  } else if (platformCaps.ansi256) {
    colorDepth = 'ansi256';
  } else {
    colorDepth = 'none';
  }

  // Determine emojiWidth from boolean flag
  let emojiWidth: 'unknown' | 'narrow' | 'wide';
  if (platformCaps.emojiWidth === true) {
    // Terminal supports mode 2027 emoji width reporting
    // Default to 'wide' when the terminal is known to support it
    emojiWidth = 'wide';
  } else {
    emojiWidth = 'unknown';
  }

  return {
    colorDepth,
    mouseSupport: platformCaps.mouse,
    emojiWidth,
    kittyGraphics: platformCaps.kittyGraphics ?? false,
  };
}
```

### 3.3 Step 2: Enhanced `MediaQueryData.fromTerminal()` to Accept Capabilities

Update the static factory to accept optional platform capabilities:

```typescript
// File: packages/flitter-core/src/widgets/media-query.ts
// Updated factory method

/**
 * Static factory with safe defaults -- constructs from terminal columns
 * and rows. Optionally accepts platform capabilities for real detection.
 *
 * Amp ref: nA constructor takes (size, capabilities). The xF() fallback
 * provides conservative defaults when capabilities are null.
 */
static fromTerminal(
  cols: number,
  rows: number,
  platformCaps?: PlatformCapabilities,
): MediaQueryData {
  const capabilities = platformCaps
    ? MediaQueryData.fromPlatformCapabilities(platformCaps)
    : undefined;

  return new MediaQueryData({
    size: { width: cols, height: rows },
    capabilities,
  });
}
```

### 3.4 Step 3: Extract `createMediaQueryWrapper()` Method on WidgetsBinding

Following the Amp pattern (`J3.createMediaQueryWrapper`), extract a method
that reads real capabilities from the TerminalManager:

```typescript
// File: packages/flitter-core/src/framework/binding.ts
// New method on WidgetsBinding

/**
 * Create the MediaQuery wrapper widget with real terminal size and capabilities.
 *
 * Amp ref: J3.createMediaQueryWrapper(g) -- widget-tree.md:1277-1282
 *   let t = this.tui.getCapabilities() || xF();
 *   let b = this.tui.getSize();
 *   let s = new nA(b, t);
 *   return new Q3({ data: s, child: g });
 */
private createMediaQueryWrapper(widget: Widget): MediaQuery {
  const caps = this._tui.capabilities;
  const size = this._tui.getSize();

  return new MediaQuery({
    data: new MediaQueryData({
      size: { width: size.width, height: size.height },
      capabilities: MediaQueryData.fromPlatformCapabilities(caps),
    }),
    child: widget,
  });
}
```

### 3.5 Step 4: Reorder `runApp()` to Initialize Terminal Before MediaQuery

The critical fix: restructure `runApp()` so that the `TerminalManager` is
initialized with real platform capabilities **before** `MediaQuery` is created.

```typescript
// File: packages/flitter-core/src/framework/binding.ts
// Restructured runApp() -- key changes highlighted with comments

async runApp(widget: Widget, options?: RunAppOptions): Promise<void> {
  const inTest = isTestEnvironment();
  const enableTerminal = options?.terminal ?? !inTest;

  if (options?.onRootElementMounted) {
    this.setRootElementMountedCallback(options.onRootElementMounted);
  }
  if (options?.output) {
    this.setOutput(options.output);
  }
  if (options?.errorLogger) {
    this.frameScheduler.setErrorLogger(options.errorLogger);
  }

  // --- Phase 1: Terminal initialization (BEFORE MediaQuery) ---
  // Amp ref: J3.runApp() calls this.tui.init() first, then waits for
  // capabilities, THEN creates MediaQuery wrapper.

  let platform: PlatformAdapter | null = null;

  if (options?.size) {
    // Explicit size provided -- update render view but skip platform init
    this._renderViewSize = new Size(options.size.columns, options.size.rows);
  } else if (enableTerminal) {
    try {
      platform = new BunPlatform();
      const size = platform.getTerminalSize();
      this._renderViewSize = new Size(size.columns, size.rows);
    } catch (_e) {
      this._renderViewSize = new Size(80, 24);
    }
  }

  if (enableTerminal && platform) {
    // Replace MockPlatform tui with real BunPlatform-backed TerminalManager
    // This MUST happen before createMediaQueryWrapper() so that
    // this._tui.capabilities returns real detected values.
    // Amp ref: J3.runApp creates wB0 with real platform
    this._tui = new TerminalManager(platform);
    this._tui.initialize();
    this.setupEventHandlers();

    // Amp ref: await this.tui.waitForCapabilities(1000);
    // Wait for async capability detection responses (DA1, DA2, Kitty, etc.)
    // This ensures MediaQuery gets accurate capabilities.
    await this.waitForCapabilityDetection(1000);
  }

  // --- Phase 2: Create MediaQuery with REAL capabilities ---
  // Amp ref: J3.createMediaQueryWrapper(g) reads this.tui.getCapabilities()
  const wrappedWidget = this.createMediaQueryWrapper(widget);

  // --- Phase 3: Mount widget tree ---
  this.attachRootWidget(wrappedWidget);

  // --- Phase 4: Terminal event wiring and cleanup handlers ---
  if (enableTerminal && platform) {
    const cleanup = () => {
      try {
        if (this._tui.isInitialized) {
          this._tui.dispose();
        }
      } catch (_e) {}
    };
    process.on('exit', cleanup);
    process.on('SIGINT', () => { cleanup(); process.exit(0); });
    process.on('SIGTERM', () => { cleanup(); process.exit(0); });
  }

  // --- Phase 5: SIGWINCH handler (with capabilities preservation) ---
  if (enableTerminal && typeof process !== 'undefined') {
    process.on('SIGWINCH', () => {
      try {
        const p = this._tui.platform;
        if (p) {
          const size = p.getTerminalSize();
          this.handleResize(size.columns, size.rows);
          // Use createMediaQueryWrapper to preserve real capabilities
          const newWrapped = this.createMediaQueryWrapper(widget);
          this.attachRootWidget(newWrapped);
        }
      } catch (_e) {}
    });
  }

  this.requestForcedPaintFrame();
  this.frameScheduler.requestFrame();
}
```

### 3.6 Step 5: Add `waitForCapabilityDetection()` Method

Implement the async capability wait that matches Amp's
`this.tui.waitForCapabilities(1000)`:

```typescript
// File: packages/flitter-core/src/framework/binding.ts
// New method on WidgetsBinding

/**
 * Wait for terminal capability detection responses to arrive.
 *
 * Sends escape sequence queries (DA1, DA2, Kitty keyboard/graphics,
 * XTVERSION) to the terminal and waits up to `timeoutMs` for responses.
 * Responses are parsed and merged into TerminalManager.capabilities.
 *
 * Amp ref: J3.runApp() calls `await this.tui.waitForCapabilities(1000)`
 * which sends queries during init() and waits for the queryParser (vF)
 * to receive and parse terminal responses.
 *
 * @param timeoutMs Maximum time to wait for capability responses.
 */
private async waitForCapabilityDetection(timeoutMs: number): Promise<void> {
  if (!this._tui.isInitialized) return;

  const {
    buildCapabilityQuery,
    parseCapabilityResponse,
    mergeCapabilities,
  } = await import('../terminal/platform');

  // Send capability queries to the terminal
  const queryString = buildCapabilityQuery(this._tui.platform);
  this._tui.platform.writeStdout(queryString);

  // Wait for responses with a timeout
  // Responses arrive asynchronously on stdin and are collected
  // by the input handler. We collect raw data for a brief period.
  let responseData = '';
  const originalOnInput = this._tui.onInput;

  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      // Timeout reached -- use whatever we collected
      this._tui.onInput = originalOnInput;
      resolve();
    }, timeoutMs);

    // Temporarily intercept input to capture capability responses
    this._tui.onInput = (data: Buffer) => {
      const str = data.toString();
      responseData += str;

      // Check if we got a DSR response (terminal OK) as a signal
      // that the terminal has finished responding to our queries
      if (str.includes('\x1b[0n')) {
        clearTimeout(timer);
        this._tui.onInput = originalOnInput;
        resolve();
      }

      // Also forward to the original handler for any non-query data
      originalOnInput?.(data);
    };

    // Send a DSR query as a "fence" -- when we get the response,
    // we know all prior query responses have arrived
    this._tui.platform.writeStdout('\x1b[5n'); // DSR query
  });

  // Parse collected responses and merge into capabilities
  if (responseData.length > 0) {
    const parsed = parseCapabilityResponse(responseData);
    const currentCaps = this._tui.capabilities;
    const merged = mergeCapabilities(currentCaps, parsed);

    // Update TerminalManager's capabilities
    // (Requires adding a setCapabilities or updateCapabilities method)
    (this._tui as any)._capabilities = merged;
    this._tui.renderer.setCapabilities(merged);
  }
}
```

### 3.7 Step 6: Add `onCapabilities` Callback for Late Updates

Amp's `wB0` supports `onCapabilities(handler)` callbacks for when capability
information arrives after initial detection (e.g., a slow Kitty graphics
response). When this fires, `WidgetsBinding` should update the `MediaQuery`
and trigger a rebuild.

```typescript
// File: packages/flitter-core/src/terminal/terminal-manager.ts
// Addition to TerminalManager class

// Capability update callback
onCapabilitiesChanged?: (caps: TerminalCapabilities) => void;

/**
 * Update capabilities after async detection completes.
 * Notifies the callback so WidgetsBinding can update MediaQuery.
 *
 * Amp ref: wB0.onCapabilities(handler) -- screen-buffer.md:769
 */
updateCapabilities(newCaps: TerminalCapabilities): void {
  this._capabilities = newCaps;
  this.renderer.setCapabilities(newCaps);
  this.onCapabilitiesChanged?.(newCaps);
}
```

Then in `WidgetsBinding.runApp()`, after terminal init:

```typescript
// Wire capability change handler to update MediaQuery
// Amp ref: wB0.capabilityHandlers[] -- late-arriving capability data
//          triggers MediaQuery rebuild
this._tui.onCapabilitiesChanged = (caps) => {
  // Rebuild the root with updated MediaQuery
  const newWrapped = this.createMediaQueryWrapper(widget);
  this.attachRootWidget(newWrapped);
  this.requestForcedPaintFrame();
};
```

---

## 4. File-by-File Change Summary

### 4.1 `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/media-query.ts`

| Change | Lines | Description |
|--------|-------|-------------|
| Add import | top | Import `TerminalCapabilities as PlatformCapabilities` from `../terminal/platform` |
| Add static method | `MediaQueryData` | `fromPlatformCapabilities()` translating platform caps to MediaQuery caps |
| Update `fromTerminal` | `MediaQueryData` | Accept optional `PlatformCapabilities` parameter |

### 4.2 `/home/gem/workspace/flitter/packages/flitter-core/src/framework/binding.ts`

| Change | Lines | Description |
|--------|-------|-------------|
| Add import | top | Import `PlatformAdapter` from `../terminal/platform` (currently used but not imported) |
| Add method | `WidgetsBinding` | `createMediaQueryWrapper()` matching Amp's `J3.createMediaQueryWrapper` |
| Add method | `WidgetsBinding` | `waitForCapabilityDetection()` matching Amp's `waitForCapabilities` |
| Refactor | `runApp()` | Reorder: terminal init BEFORE MediaQuery creation |
| Fix | SIGWINCH handler | Use `createMediaQueryWrapper()` to preserve capabilities |
| Wire callback | `runApp()` | Connect `_tui.onCapabilitiesChanged` to rebuild MediaQuery |

### 4.3 `/home/gem/workspace/flitter/packages/flitter-core/src/terminal/terminal-manager.ts`

| Change | Lines | Description |
|--------|-------|-------------|
| Add callback | class field | `onCapabilitiesChanged` callback for late capability updates |
| Add method | `TerminalManager` | `updateCapabilities()` to set new caps and notify |

---

## 5. Detailed Data Flow (After Fix)

### 5.1 Startup Sequence

```
runApp(widget)
  |
  |-- (1) Create BunPlatform
  |-- (2) Create TerminalManager(platform)
  |       |-- detectCapabilities() from env vars (synchronous)
  |       |-- Renderer.setCapabilities(detected)
  |
  |-- (3) TerminalManager.initialize()
  |       |-- enableRawMode, enterAltScreen, enableMouse, etc.
  |
  |-- (4) setupEventHandlers()
  |       |-- Wire InputParser -> EventDispatcher
  |
  |-- (5) await waitForCapabilityDetection(1000)
  |       |-- Send DA1 + DA2 + Kitty queries + DSR fence
  |       |-- Collect responses for up to 1000ms
  |       |-- parseCapabilityResponse(responseData)
  |       |-- mergeCapabilities(envDetected, queryDetected)
  |       |-- Update TerminalManager._capabilities
  |
  |-- (6) createMediaQueryWrapper(widget)    // <-- NOW has real capabilities
  |       |-- Read this._tui.capabilities
  |       |-- fromPlatformCapabilities(caps)
  |       |-- new MediaQueryData({ size, capabilities })
  |       |-- new MediaQuery({ data, child: widget })
  |
  |-- (7) attachRootWidget(wrappedWidget)
  |       |-- Mount element tree
  |       |-- Widgets see real capabilities via MediaQuery.capabilitiesOf()
  |
  |-- (8) Wire onCapabilitiesChanged callback
  |       |-- On late updates: rebuild MediaQuery with new caps
  |
  |-- (9) Wire SIGWINCH handler
  |       |-- On resize: createMediaQueryWrapper() preserves capabilities
```

### 5.2 Resize Flow (SIGWINCH)

```
SIGWINCH signal
  |-- platform.getTerminalSize()  -> new columns, rows
  |-- handleResize(cols, rows)    -> pending resize event, request frame
  |-- createMediaQueryWrapper(widget)
  |       |-- Reads current this._tui.capabilities (preserved from detection)
  |       |-- Creates new MediaQueryData with new size + same capabilities
  |-- attachRootWidget(newWrapped) -> widget tree rebuilt with updated size AND caps
```

### 5.3 Late Capability Update Flow

```
Terminal sends delayed Kitty graphics response
  |-- Input handler receives escape sequence
  |-- parseCapabilityResponse() detects kittyGraphics: true
  |-- TerminalManager.updateCapabilities(merged)
  |-- onCapabilitiesChanged fires
  |       |-- createMediaQueryWrapper(widget) with updated caps
  |       |-- attachRootWidget(newWrapped)
  |       |-- requestForcedPaintFrame()
  |-- Widgets rebuild, see kittyGraphics: true
  |-- Image widgets switch from ASCII to Kitty inline rendering
```

---

## 6. Testing Strategy

### 6.1 Unit Tests for Capability Translation

```typescript
describe('MediaQueryData.fromPlatformCapabilities', () => {
  it('maps trueColor to truecolor colorDepth', () => {
    const platformCaps = {
      trueColor: true, ansi256: true, mouse: true,
      altScreen: true, syncOutput: true, unicode: true,
      hyperlinks: true, kittyGraphics: true,
    };
    const mqCaps = MediaQueryData.fromPlatformCapabilities(platformCaps);
    expect(mqCaps.colorDepth).toBe('truecolor');
    expect(mqCaps.mouseSupport).toBe(true);
    expect(mqCaps.kittyGraphics).toBe(true);
  });

  it('maps ansi256 without trueColor to ansi256 colorDepth', () => {
    const platformCaps = {
      trueColor: false, ansi256: true, mouse: true,
      altScreen: true, syncOutput: false, unicode: true,
      hyperlinks: false,
    };
    const mqCaps = MediaQueryData.fromPlatformCapabilities(platformCaps);
    expect(mqCaps.colorDepth).toBe('ansi256');
  });

  it('maps no color support to none colorDepth', () => {
    const platformCaps = {
      trueColor: false, ansi256: false, mouse: false,
      altScreen: false, syncOutput: false, unicode: false,
      hyperlinks: false,
    };
    const mqCaps = MediaQueryData.fromPlatformCapabilities(platformCaps);
    expect(mqCaps.colorDepth).toBe('none');
    expect(mqCaps.mouseSupport).toBe(false);
    expect(mqCaps.kittyGraphics).toBe(false);
  });

  it('maps emojiWidth boolean to wide/unknown', () => {
    const withEmoji = {
      trueColor: false, ansi256: true, mouse: true,
      altScreen: true, syncOutput: false, unicode: true,
      hyperlinks: false, emojiWidth: true,
    };
    expect(
      MediaQueryData.fromPlatformCapabilities(withEmoji).emojiWidth
    ).toBe('wide');

    const withoutEmoji = { ...withEmoji, emojiWidth: undefined };
    expect(
      MediaQueryData.fromPlatformCapabilities(withoutEmoji).emojiWidth
    ).toBe('unknown');
  });
});
```

### 6.2 Integration Test for runApp() Capability Wiring

```typescript
describe('WidgetsBinding.runApp capability wiring', () => {
  it('passes real capabilities to MediaQuery', async () => {
    // Set up environment to trigger truecolor detection
    process.env.COLORTERM = 'truecolor';
    process.env.TERM_PROGRAM = 'WezTerm';

    const binding = WidgetsBinding.instance;
    let capturedCaps: TerminalCapabilities | null = null;

    const testWidget = new CapabilityReader({
      onBuild: (context) => {
        capturedCaps = MediaQuery.capabilitiesOf(context);
      },
    });

    await binding.runApp(testWidget, {
      terminal: false, // skip real terminal init
      size: { columns: 120, rows: 40 },
    });

    expect(capturedCaps).not.toBeNull();
    // In test mode without real terminal, env-based detection still works
    // because TerminalManager constructor calls detectCapabilities()
  });
});
```

### 6.3 Test for SIGWINCH Capability Preservation

```typescript
describe('SIGWINCH preserves capabilities', () => {
  it('does not reset capabilities on resize', () => {
    const binding = WidgetsBinding.instance;

    // Verify capabilities survive resize
    // Before fix: resize created MediaQueryData.fromTerminal() with defaults
    // After fix: resize uses createMediaQueryWrapper() with current caps
    // ... (mock-based test using MockPlatform.simulateResize)
  });
});
```

### 6.4 Test for Late Capability Updates

```typescript
describe('late capability detection updates MediaQuery', () => {
  it('rebuilds tree when capabilities change', () => {
    const binding = WidgetsBinding.instance;

    // 1. Start with default capabilities (no Kitty)
    // 2. Simulate late Kitty graphics response arriving
    // 3. Verify MediaQuery.capabilitiesOf() now returns kittyGraphics: true
    // 4. Verify widget tree was rebuilt
  });
});
```

---

## 7. Design Decisions

### 7.1 Separate Translation Function vs. Unified Interface

We chose to keep the two `TerminalCapabilities` interfaces separate and
add a translation function rather than unifying them. Rationale:

- **platform.ts TerminalCapabilities** is low-level, implementation-oriented
  (boolean flags matching individual escape sequence features). It needs to
  stay close to the detection logic.
- **media-query.ts TerminalCapabilities** is high-level, widget-oriented
  (semantic categories like `colorDepth` as an enum, `emojiWidth` as a
  tri-state). It needs to be simple for widget authors.
- Forcing one interface to serve both roles would either bloat the widget API
  or lose detection granularity.
- The translation function is a clean boundary that can evolve independently.

### 7.2 Async Wait vs. Synchronous-Only Detection

Amp waits up to 1000ms for async capability responses
(`await this.tui.waitForCapabilities(1000)`). This is important because:

- **DA1/DA2 responses** are fast (typically <50ms) but still asynchronous.
- **Kitty graphics probing** may take longer depending on terminal.
- The 1000ms timeout ensures the app starts even if the terminal is slow.

The proposed `waitForCapabilityDetection()` follows the same pattern: send
queries, wait for responses with a timeout, then continue with whatever
was detected. The DSR "fence" technique (sending `ESC[5n` and waiting for
`ESC[0n`) is a standard practice to know when the terminal has finished
responding.

### 7.3 `createMediaQueryWrapper()` as Private Method

The Amp reference shows this as a method on `J3` (WidgetsBinding). We keep it
as a private method rather than public because:

- It is only called by `runApp()` and the SIGWINCH/capability-change handlers.
- External callers should not construct MediaQuery wrappers directly.
- Matching Amp's pattern where `J3.createMediaQueryWrapper` is not part of the
  public API.

### 7.4 `onCapabilitiesChanged` Callback vs. Event Emitter

We use a simple callback (`onCapabilitiesChanged?: (caps) => void`) rather than
the full `capabilityHandlers[]` array that Amp uses. This is simpler and
sufficient because only `WidgetsBinding` needs to listen for capability changes.
If multiple consumers are needed in the future, this can be expanded to an array
pattern matching Amp's `onCapabilities(handler) / offCapabilities(handler)`.

---

## 8. Migration Notes

### 8.1 Breaking Changes

None. The `MediaQueryData.fromTerminal()` method retains its existing signature
as the base overload. The new optional `platformCaps` parameter is additive.
Widgets calling `MediaQuery.capabilitiesOf(context)` will start receiving
real values instead of defaults, which is the desired behavior.

### 8.2 Existing Tests

Existing tests that construct `MediaQueryData.fromTerminal(cols, rows)` without
capabilities will continue to work -- they will get the same defaults as before.
Only tests that go through `runApp()` with a real or mock `TerminalManager`
will see different capability values.

### 8.3 Test Mode Behavior

In test mode (`isTestEnvironment() === true`), `runApp()` skips terminal
initialization. The `MockPlatform`-backed `TerminalManager` still calls
`detectCapabilities()` from environment variables, so test-mode `MediaQuery`
capabilities will reflect the test environment's `TERM`/`COLORTERM` settings.
This is generally fine since tests typically do not set these variables.

---

## 9. Priority and Effort

- **Priority**: High -- this gap causes every capability-aware widget to
  render with degraded output in all terminals.
- **Effort**: Medium -- the core changes are straightforward (translation
  function + reorder + extract method), but the async capability detection
  adds complexity and needs careful timeout handling.
- **Risk**: Low -- changes are isolated to the startup path in `binding.ts`
  and do not affect the frame pipeline, layout, or paint phases.

---

## 10. Amp Reference Summary

| Amp Pattern | Reference Location | Flitter Status |
|-------------|-------------------|----------------|
| `J3.createMediaQueryWrapper(g)` | `widget-tree.md:1277-1282` | Missing -- inline code uses `fromTerminal()` without caps |
| `this.tui.getCapabilities() \|\| xF()` | `widget-tree.md:1278` | Missing -- capabilities never read from TerminalManager |
| `await this.tui.waitForCapabilities(1000)` | `widget-tree.md:1202` | Missing -- no async capability wait |
| `wB0.onCapabilities(handler)` | `screen-buffer.md:769` | Missing -- no late-capability callback |
| `nA(size, capabilities)` | `widget-tree.md:1280` | Partially exists -- constructor accepts caps but `fromTerminal()` ignores them |
| `Q3.capabilitiesOf(context)` | `widget-tree.md:1350` | Exists but returns defaults |

---

## 11. Open Questions

1. **Should `waitForCapabilityDetection()` be configurable?** Amp hardcodes
   1000ms. Should we expose the timeout as part of `RunAppOptions`? Applications
   with strict startup latency budgets may want to reduce it.

2. **Should we unify the two `TerminalCapabilities` interfaces long-term?**
   Having two separate interfaces with the same name in different modules
   is confusing. Options: rename one, merge them, or accept the split with
   clear documentation.

3. **Should capability detection be opt-in?** Some terminal environments
   (CI, tmux, screen) may not respond to escape queries, causing a full 1000ms
   wait on every startup. Environment-only detection (the current synchronous
   `detectCapabilities()`) may be sufficient for these contexts. We could skip
   the async query phase when `TERM` indicates a non-interactive context.

4. **How should the `emojiWidth` mapping work in detail?** The platform
   `emojiWidth: boolean` flag indicates mode 2027 support, but the actual
   emoji width measurement requires sending a test character and reading the
   cursor position. Should `fromPlatformCapabilities()` default to `'wide'`
   when the flag is true, or should we perform the actual measurement during
   `waitForCapabilityDetection()`?
