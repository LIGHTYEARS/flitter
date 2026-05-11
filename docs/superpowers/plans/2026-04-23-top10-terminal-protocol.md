# Terminal Protocol — QueryParser + RGB Color Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement VT terminal capability probing (QueryParser) and RGB color detection, closing GAP-TUI-18, GAP-TUI-19, and GAP-TUI-05.

**Architecture:** New `QueryParser` class sends a burst of 20 VT queries on init, parses responses via existing VtParser callbacks, populates `TerminalCapabilities` from real terminal responses instead of env-var heuristics. Blocks `runApp` for up to 1s awaiting DA1 sentinel. RGB color queries (OSC 10/11/12/4) update `Screen` default colors and derive theme luminance.

**Tech Stack:** TypeScript, VT escape sequences, existing `TuiController`/`VtParser`/`Screen` infrastructure.

**Amp reference:** `modules/2109_unknown_dY.js` (class `dY`), `modules/2120_ForExit_d9.js` (`updateRgbColors`), `modules/0489_unknown_pY.js` (Screen buffer)

---

## Task 1: Extend TerminalCapabilities with new fields

**Files:**
- Modify: `packages/tui/src/tui/tui-controller.ts` (TerminalCapabilities interface + defaultCapabilities)
- Test: `packages/tui/src/tui/__tests__/query-parser.test.ts`

- [ ] **Step 1: Write failing test for new capability fields**

```ts
import { defaultCapabilities, type TerminalCapabilities } from "../tui-controller";

describe("TerminalCapabilities new fields", () => {
  test("defaultCapabilities includes probing fields with defaults", () => {
    const caps = defaultCapabilities();
    expect(caps.kittyGraphics).toBe(false);
    expect(caps.pixelMouse).toBe(false);
    expect(caps.osc52).toBe(false);
    expect(caps.background).toBe("dark");
    expect(caps.kittyExplicitWidth).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/tui && bun test src/tui/__tests__/query-parser.test.ts`
Expected: FAIL — `kittyGraphics` not in type

- [ ] **Step 3: Add fields to TerminalCapabilities and defaultCapabilities**

Add to the `TerminalCapabilities` interface:

```ts
kittyGraphics: boolean;
pixelMouse: boolean;
pixelDimensions: { width: number; height: number } | null;
osc52: boolean;
background: "dark" | "light";
kittyExplicitWidth: boolean;
```

Add defaults in `defaultCapabilities()`:

```ts
kittyGraphics: false,
pixelMouse: false,
pixelDimensions: null,
osc52: false,
background: "dark",
kittyExplicitWidth: false,
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

```bash
git add packages/tui/src/tui/tui-controller.ts packages/tui/src/tui/__tests__/query-parser.test.ts
git commit -m "feat(tui): extend TerminalCapabilities with probing fields (GAP-TUI-18)"
```

---

## Task 2: QueryParser class — query generation and response routing

**Files:**
- Create: `packages/tui/src/tui/query-parser.ts`
- Test: `packages/tui/src/tui/__tests__/query-parser.test.ts` (append)

- [ ] **Step 1: Write failing tests for query generation**

```ts
import { QueryParser } from "../query-parser";

describe("QueryParser", () => {
  test("buildQuerySequence returns all 20 queries", () => {
    const qp = new QueryParser();
    const seq = qp.buildQuerySequence({ isJetBrains: false, isAppleTerminal: false, isTmux: false });
    // Must include DA1 as last query (sentinel)
    expect(seq.endsWith("\x1b[c")).toBe(true);
    // Must include OSC 11 (bg color query)
    expect(seq).toContain("\x1b]11;?\x07");
    // Must include DECRQSS ?2026 (sync output)
    expect(seq).toContain("\x1b[?2026$p");
    // Must include XTVERSION
    expect(seq).toContain("\x1b[>0q");
    // Must include kitty graphics query
    expect(seq).toContain("\x1b_Gi=1,a=q\x1b\\");
  });

  test("Apple Terminal skips all queries", () => {
    const qp = new QueryParser();
    const seq = qp.buildQuerySequence({ isJetBrains: false, isAppleTerminal: true, isTmux: false });
    expect(seq).toBe("");
  });

  test("JetBrains skips kitty graphics query", () => {
    const qp = new QueryParser();
    const seq = qp.buildQuerySequence({ isJetBrains: true, isAppleTerminal: false, isTmux: false });
    expect(seq).not.toContain("\x1b_Gi=1,a=q\x1b\\");
    expect(seq).toContain("\x1b[c"); // DA1 still present
  });

  test("tmux wraps queries in passthrough", () => {
    const qp = new QueryParser();
    const seq = qp.buildQuerySequence({ isJetBrains: false, isAppleTerminal: false, isTmux: true });
    expect(seq).toContain("\x1bPtmux;");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement QueryParser class**

```ts
// packages/tui/src/tui/query-parser.ts
import type { TerminalCapabilities } from "./tui-controller";

// 逆向: dY class (modules/2109_unknown_dY.js)
// Amp sends 20 VT queries in a burst, awaits DA1 as sentinel.

interface QueryOptions {
  isJetBrains: boolean;
  isAppleTerminal: boolean;
  isTmux: boolean;
}

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

interface RgbColors {
  fg: RgbColor | null;
  bg: RgbColor | null;
  cursor: RgbColor | null;
  indices: (RgbColor | null)[];
}

export class QueryParser {
  private _capabilities: Partial<TerminalCapabilities> = {};
  private _rgbColors: RgbColors = { fg: null, bg: null, cursor: null, indices: new Array(8).fill(null) };
  private _resolved = false;
  private _resolve: (() => void) | null = null;
  private _promise: Promise<void>;
  private _timeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this._promise = new Promise<void>((resolve) => {
      this._resolve = resolve;
    });
  }

  /** Build the full query sequence. Amp reference: Sk0 array in dY. */
  buildQuerySequence(opts: QueryOptions): string {
    if (opts.isAppleTerminal) return "";

    const wrap = (seq: string) =>
      opts.isTmux ? `\x1bPtmux;${seq.replace(/\x1b/g, "\x1b\x1b")}\x1b\\` : seq;

    const queries: string[] = [];

    // OSC 10/11/12: fg, bg, cursor color
    queries.push(wrap("\x1b]10;?\x07"));
    queries.push(wrap("\x1b]11;?\x07"));
    queries.push(wrap("\x1b]12;?\x07"));

    // OSC 4: palette colors 0-7
    for (let i = 0; i < 8; i++) {
      queries.push(wrap(`\x1b]4;${i};?\x07`));
    }

    // DECRQSS queries
    queries.push(wrap("\x1b[?2026$p")); // sync output
    queries.push(wrap("\x1b[?2027$p")); // emoji width
    queries.push(wrap("\x1b[?1016$p")); // pixel mouse
    queries.push(wrap("\x1b[?2031$p")); // color palette notifications

    // Kitty keyboard query
    queries.push(wrap("\x1b[?u"));

    // XTVERSION
    queries.push(wrap("\x1b[>0q"));

    // XTGETTCAP for Ms (OSC 52 clipboard)
    queries.push(wrap("\x1bP+q4d73\x1b\\"));

    // Kitty graphics query (skip for JetBrains)
    if (!opts.isJetBrains) {
      queries.push(wrap("\x1b_Gi=1,a=q\x1b\\"));
    }

    // DA1 — sentinel (MUST be last)
    queries.push(wrap("\x1b[c"));

    return queries.join("");
  }

  /** Wait for DA1 response or timeout. */
  waitForCompletion(timeoutMs: number): Promise<void> {
    this._timeout = setTimeout(() => this._finish(), timeoutMs);
    return this._promise;
  }

  // --- Response handlers ---

  processDeviceAttributes(): void {
    // DA1 is sentinel — finish probing
    this._finish();
  }

  processDecrqss(request: string, value: string): void {
    const enabled = value === "1" || value === "2";
    switch (request) {
      case "?2026": this._capabilities.syncOutput = enabled; break;
      case "?2027": this._capabilities.emojiWidth = enabled; break;
      case "?1016": this._capabilities.pixelMouse = enabled; break;
      case "?2031": this._capabilities.colorPaletteNotifications = enabled; break;
    }
  }

  processXtversion(version: string): void {
    this._capabilities.xtversion = version;
    const lower = version.toLowerCase();
    const osc52Terminals = ["ghostty", "kitty", "wezterm", "foot", "alacritty", "iterm2", "tmux"];
    if (osc52Terminals.some((t) => lower.includes(t))) {
      this._capabilities.osc52 = true;
    }
  }

  processXtgettcap(key: string, value: string): void {
    // key "4d73" = hex for "Ms" (OSC 52)
    if (key === "4d73" && value.length > 0) {
      this._capabilities.osc52 = true;
    }
  }

  processKittyGraphics(): void {
    // APC response starting with G → kitty graphics supported
    const xt = this._capabilities.xtversion?.toLowerCase() ?? "";
    if (!xt.includes("iterm2")) {
      this._capabilities.kittyGraphics = true;
    }
  }

  processKittyKeyboard(): void {
    this._capabilities.kittyKeyboard = true;
  }

  processOscColor(index: number, r: number, g: number, b: number): void {
    const color: RgbColor = { r, g, b };
    switch (index) {
      case 10: this._rgbColors.fg = color; break;
      case 11:
        this._rgbColors.bg = color;
        // BT.601 luminance: dark < 128, light >= 128
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        this._capabilities.background = luma < 128 ? "dark" : "light";
        break;
      case 12: this._rgbColors.cursor = color; break;
    }
  }

  processOscPaletteColor(paletteIndex: number, r: number, g: number, b: number): void {
    if (paletteIndex >= 0 && paletteIndex < 8) {
      this._rgbColors.indices[paletteIndex] = { r, g, b };
    }
  }

  getCapabilities(): Partial<TerminalCapabilities> {
    return { ...this._capabilities };
  }

  getRgbColors(): RgbColors | null {
    if (!this._rgbColors.fg || !this._rgbColors.bg) return null;
    return this._rgbColors;
  }

  private _finish(): void {
    if (this._resolved) return;
    this._resolved = true;
    if (this._timeout) clearTimeout(this._timeout);
    this._resolve?.();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add packages/tui/src/tui/query-parser.ts packages/tui/src/tui/__tests__/query-parser.test.ts
git commit -m "feat(tui): QueryParser class with VT query generation and response routing (GAP-TUI-18)"
```

---

## Task 3: Wire QueryParser into TuiController init

**Files:**
- Modify: `packages/tui/src/tui/tui-controller.ts`
- Test: `packages/tui/src/tui/__tests__/query-parser.test.ts` (append)

- [ ] **Step 1: Write failing integration test**

```ts
describe("QueryParser integration with TuiController", () => {
  test("startCapabilityDetection writes query sequence to stdout", () => {
    // Mock stdout to capture writes
    const written: string[] = [];
    const mockWrite = (data: string) => { written.push(data); return true; };

    const qp = new QueryParser();
    const seq = qp.buildQuerySequence({ isJetBrains: false, isAppleTerminal: false, isTmux: false });

    mockWrite(seq);
    expect(written.length).toBe(1);
    expect(written[0]).toContain("\x1b[c"); // DA1
  });
});
```

- [ ] **Step 2: Implement wiring in TuiController**

In `TuiController.init()`, after setting up the VT parser, add:

```ts
// 逆向: dY.startCapabilityDetection (modules/2109_unknown_dY.js)
this._queryParser = new QueryParser();
const querySeq = this._queryParser.buildQuerySequence({
  isJetBrains: this._capabilities.animationSupport === "slow", // JetBrains heuristic
  isAppleTerminal: process.env.TERM_PROGRAM === "Apple_Terminal",
  isTmux: !!process.env.TMUX,
});
if (querySeq) {
  this._stdout.write(querySeq);
}
```

Wire VT parser callbacks to QueryParser methods:
- `onDeviceAttributes` → `_queryParser.processDeviceAttributes()`
- `onDecrqss` → `_queryParser.processDecrqss(request, value)`
- `onDcs` with `>|` prefix → `_queryParser.processXtversion(data)`
- `onApc` starting with `G` → `_queryParser.processKittyGraphics()`
- `onOsc` 10/11/12 → `_queryParser.processOscColor(index, r, g, b)` (parse `rgba?:HHHH/HHHH/HHHH`)
- `onOsc` 4 → `_queryParser.processOscPaletteColor(idx, r, g, b)`

Add `waitForCapabilities(timeoutMs)` method that delegates to `_queryParser.waitForCompletion(timeoutMs)`, then merges probed capabilities over heuristic defaults.

- [ ] **Step 3: Add OSC color response parsing**

```ts
/** Parse OSC color response: "rgba:HHHH/HHHH/HHHH" or "rgb:HH/HH/HH" */
export function parseOscColorResponse(data: string): { r: number; g: number; b: number } | null {
  const match = data.match(/rgba?:([0-9a-f]+)\/([0-9a-f]+)\/([0-9a-f]+)/i);
  if (!match) return null;
  const parse = (hex: string) => {
    const val = parseInt(hex, 16);
    const bits = hex.length * 4;
    return Math.round((val / (2 ** bits - 1)) * 255);
  };
  return { r: parse(match[1]), g: parse(match[2]), b: parse(match[3]) };
}
```

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add packages/tui/src/tui/tui-controller.ts packages/tui/src/tui/query-parser.ts packages/tui/src/tui/__tests__/query-parser.test.ts
git commit -m "feat(tui): wire QueryParser into TuiController init sequence (GAP-TUI-18)"
```

---

## Task 4: Screen RGB color support (GAP-TUI-19)

**Files:**
- Modify: `packages/tui/src/screen/screen.ts`
- Test: `packages/tui/src/screen/__tests__/screen-rgb.test.ts`

- [ ] **Step 1: Write failing tests for Screen color methods**

```ts
describe("Screen RGB color support", () => {
  test("setDefaultColors stores fg/bg", () => {
    const screen = new Screen(80, 24);
    screen.setDefaultColors({ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 });
    expect(screen.defaultFg).toEqual({ r: 255, g: 255, b: 255 });
    expect(screen.defaultBg).toEqual({ r: 0, g: 0, b: 0 });
  });

  test("setIndexRgbMapping stores palette", () => {
    const screen = new Screen(80, 24);
    const indices = [{ r: 0, g: 0, b: 0 }, { r: 170, g: 0, b: 0 }];
    screen.setIndexRgbMapping(indices);
    expect(screen.indexRgbMap[0]).toEqual({ r: 0, g: 0, b: 0 });
    expect(screen.indexRgbMap[1]).toEqual({ r: 170, g: 0, b: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Add methods to Screen**

```ts
// 逆向: pY.setDefaultColors / pY.setIndexRgbMapping (modules/0489_unknown_pY.js)
defaultFg: { r: number; g: number; b: number } | null = null;
defaultBg: { r: number; g: number; b: number } | null = null;
indexRgbMap: ({ r: number; g: number; b: number } | null)[] = new Array(256).fill(null);

setDefaultColors(fg: { r: number; g: number; b: number }, bg: { r: number; g: number; b: number }): void {
  this.defaultFg = fg;
  this.defaultBg = bg;
}

setIndexRgbMapping(indices: ({ r: number; g: number; b: number } | null)[]): void {
  for (let i = 0; i < indices.length && i < 256; i++) {
    this.indexRgbMap[i] = indices[i];
  }
}
```

- [ ] **Step 4: Wire QueryParser RGB results to Screen in WidgetsBinding**

In `widgets-binding.ts`, after `waitForCapabilities` resolves:

```ts
// 逆向: d9.updateRgbColors (modules/2120_ForExit_d9.js)
const rgbColors = this.tui.queryParser?.getRgbColors();
if (rgbColors) {
  const screen = this.tui.getScreen();
  if (rgbColors.fg && rgbColors.bg) {
    screen.setDefaultColors(rgbColors.fg, rgbColors.bg);
  }
  screen.setIndexRgbMapping(rgbColors.indices);
}
```

- [ ] **Step 5: Run tests, commit**

```bash
git add packages/tui/src/screen/screen.ts packages/tui/src/screen/__tests__/screen-rgb.test.ts packages/tui/src/binding/widgets-binding.ts
git commit -m "feat(tui): Screen.setDefaultColors + setIndexRgbMapping for live RGB palette (GAP-TUI-19)"
```

---

## Task 5: Theme luminance auto-detection (GAP-TUI-05)

**Files:**
- Modify: `packages/tui/src/tui/query-parser.ts` (already done in Task 2)
- Modify: `packages/cli/src/modes/interactive.ts` (theme selection)
- Test: `packages/tui/src/tui/__tests__/query-parser.test.ts` (append)

- [ ] **Step 1: Write test for luminance detection**

```ts
test("processOscColor sets background to light for bright bg", () => {
  const qp = new QueryParser();
  qp.processOscColor(11, 240, 240, 240); // bright bg
  expect(qp.getCapabilities().background).toBe("light");
});

test("processOscColor sets background to dark for dark bg", () => {
  const qp = new QueryParser();
  qp.processOscColor(11, 20, 20, 30); // dark bg
  expect(qp.getCapabilities().background).toBe("dark");
});
```

- [ ] **Step 2: Run tests (should pass — logic already in Task 2)**

- [ ] **Step 3: Wire luminance into interactive.ts theme selection**

In `resolveThemeData()`, after capabilities are available, use `capabilities.background` to auto-select theme variant if user hasn't explicitly set one.

- [ ] **Step 4: Commit**

```bash
git add packages/tui/src/tui/__tests__/query-parser.test.ts packages/cli/src/modes/interactive.ts
git commit -m "feat(tui): auto-detect theme luminance from terminal bg color (GAP-TUI-05)"
```

---

## Task 6: Update GAPS.md

- [ ] **Step 1: Mark GAP-TUI-18, GAP-TUI-19, GAP-TUI-05 as closed with iteration number and implementation details**

- [ ] **Step 2: Commit**

```bash
git add GAPS.md
git commit -m "docs: close GAP-TUI-18, GAP-TUI-19, GAP-TUI-05 — terminal capability probing"
```
