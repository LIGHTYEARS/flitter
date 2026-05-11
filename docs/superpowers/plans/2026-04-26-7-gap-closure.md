# Implementation Plan: 7-Gap Closure (flitter-cli vs amp-cli)

**Spec:** `docs/superpowers/specs/2026-04-26-7-gap-closure-design.md`
**Date:** 2026-04-26

## Structure

Two parallel phases:
- **Phase A** (sequential): Gap 5 → Gap 1 → Gap 2 (selection pipeline, dependency chain)
- **Phase B** (parallel): Gap 3, Gap 8, Gap 11, Gap 15 (independent)

---

## Phase A: Selection Pipeline

### Step A1: Gap 5 — Inline Span Click (onTap) in RenderParagraph

**File: `packages/tui/src/widgets/rich-text.ts`**

**A1.1** Add a private helper to check if any span in the tree has `onTap`:
```typescript
// After the existing _flattenSpans or similar helper
private _hasClickableSpan(span: TextSpan): boolean {
  if (span.onTap) return true;
  if (span.children) {
    for (const child of span.children) {
      if (this._hasClickableSpan(child)) return true;
    }
  }
  return false;
}
```

**A1.2** Add a private helper to find the glyph at a local position from `_lines`:
```typescript
private _findGlyphAt(localX: number, localY: number): LayoutGlyph | null {
  if (localY < 0 || localY >= this._lines.length) return null;
  const line = this._lines[localY];
  let col = 0;
  for (const glyph of line) {
    if (localX >= col && localX < col + glyph.width) return glyph;
    col += glyph.width;
  }
  return null;
}
```

**A1.3** Override `hitTest` following the `RenderMouseRegion` pattern (reference: `mouse-region.ts` lines 304–315):
```typescript
override hitTest(result: HitTestResult, position: { x: number; y: number }, offsetX = 0, offsetY = 0): boolean {
  const hit = super.hitTest(result, position, offsetX, offsetY);
  if (hit && (this._hasClickableSpan(this._textSpan) || this._selectable)) {
    result.addMouseTarget(this, position);
  }
  return hit;
}
```
Import `HitTestResult` from `"../gestures/hit-test.js"`.

**A1.4** Add click handler method. Register with `MouseManager` by implementing the same interface as `RenderMouseRegion`:
```typescript
handleMouseEvent(event: MouseEvent): void {
  if (event.type === "click" || event.type === "mousedown") {
    const localX = event.x - this._globalOffset.x;
    const localY = event.y - this._globalOffset.y;
    const glyph = this._findGlyphAt(localX, localY);
    if (glyph?.span?.onTap) {
      glyph.span.onTap();
    }
  }
}
```
Check the exact `MouseManager` registration contract by reading `mouse-region.ts` — the handler may need to be a callback property rather than a method.

**A1.5** Add `_selectable: boolean = false` private field on `RenderParagraph` with a setter, for use in A1.3's `hitTest` condition (will be wired in Step A2).

**A1.6** Add imports at top of file:
```typescript
import type { HitTestResult } from "../gestures/hit-test.js";
```

**Amp reference:** Cross-check `RenderParagraph` hit-test behavior against amp's `t1T` class in `chunk-006.js`.


**A1.7** Unit tests in new file `packages/tui/src/widgets/rich-text-click.test.ts`:
- Test: clicking a `TextSpan` with `onTap` fires the callback
- Test: clicking a `TextSpan` without `onTap` is a no-op
- Test: hit-test returns false when click is outside bounds
- Test: multi-width glyphs (CJK) are correctly hit-tested

**Review checkpoint:** Verify gap 5 unit tests pass before proceeding to A2.

---

### Step A2: Gap 1 — SelectionArea Widget Wiring

**A2.1** Create `packages/tui/src/selection/selection-area-widget.ts`:

```typescript
// InheritedSelectionArea — publishes SelectionArea down the tree
// Follow the pattern from MediaQuery, ThemeController, ConfigProvider:
//   static of(context) / static maybeOf(context)
//   using context.dependOnInheritedWidgetOfExactType(InheritedSelectionArea)

import { InheritedWidget } from "../tree/inherited-widget.js";
import type { Element } from "../tree/element.js";
import { SelectionArea } from "./selection-area.js";

export class InheritedSelectionArea extends InheritedWidget {
  readonly selectionArea: SelectionArea;

  constructor(args: { selectionArea: SelectionArea; child: Widget }) {
    super({ child: args.child });
    this.selectionArea = args.selectionArea;
  }

  static of(context: Element): SelectionArea {
    const element = context.dependOnInheritedWidgetOfExactType(InheritedSelectionArea);
    if (!element) throw new Error("InheritedSelectionArea not found");
    return (element.widget as InheritedSelectionArea).selectionArea;
  }

  static maybeOf(context: Element): SelectionArea | null {
    const element = context.dependOnInheritedWidgetOfExactType(InheritedSelectionArea);
    if (!element) return null;
    return (element.widget as InheritedSelectionArea).selectionArea;
  }

  updateShouldNotify(oldWidget: InheritedSelectionArea): boolean {
    return this.selectionArea !== oldWidget.selectionArea;
  }
}
```

**A2.2** In the same file, add `SelectionAreaWidget` (StatefulWidget):
```typescript
export class SelectionAreaWidget extends StatefulWidget {
  readonly child: Widget;
  constructor(args: { key?: Key; child: Widget }) {
    super({ key: args.key });
    this.child = args.child;
  }
  createState() { return new SelectionAreaWidgetState(); }
}

class SelectionAreaWidgetState extends State<SelectionAreaWidget> {
  private _selectionArea!: SelectionArea;
  private _clickCount = 0;
  private _lastClickTime = 0;

  initState(): void {
    super.initState();
    this._selectionArea = new SelectionArea();
  }

  build(context: BuildContext): Widget {
    return new InheritedSelectionArea({
      selectionArea: this._selectionArea,
      child: new MouseRegion({
        onDragStart: (pos) => this._selectionArea.beginDrag(this._toSelectionPos(pos)),
        onDragUpdate: (pos) => this._selectionArea.updateDrag(this._toSelectionPos(pos)),
        onDragEnd: () => this._selectionArea.endDrag(),
        onClick: (pos) => this._handleClick(pos),
        child: this.widget.child,
      }),
    });
  }

  // Click-count branching: single=char, double=word, triple=line
  private _handleClick(pos: MousePosition): void {
    const now = Date.now();
    if (now - this._lastClickTime < 500) {
      this._clickCount++;
    } else {
      this._clickCount = 1;
    }
    this._lastClickTime = now;
    const selPos = this._toSelectionPos(pos);

    switch (this._clickCount) {
      case 2: this._selectionArea.selectWordAt(selPos); break;
      case 3: this._selectionArea.selectLineAt(selPos); this._clickCount = 0; break;
      default: this._selectionArea.beginDrag(selPos); this._selectionArea.endDrag(); break;
    }
  }

  // Convert mouse position to SelectionPosition — needs selectable lookup
  private _toSelectionPos(pos: MousePosition): SelectionPosition {
    // Implementation: hit-test registered selectables to find which one
    // contains this position, then compute the character offset within it.
    // This mirrors amp's _1T.positionForOffset() pattern.
  }

  dispose(): void {
    this._selectionArea.dispose();
    super.dispose();
  }
}
```

Note: The `_toSelectionPos` method needs the actual hit-test → selectable → offset mapping. Cross-reference amp's `chunk-006.js:3486–3514` for the exact logic.


**A2.3** Wire auto-registration in `RenderParagraph` (`packages/tui/src/widgets/rich-text.ts`):

Add `setContext` and `detach` overrides. The `setContext` pattern is used by `RenderObject` when it's attached to the tree — check `packages/tui/src/tree/render-object.ts` for the exact lifecycle hook name (may be `attach`/`detach` or `mount`/`unmount` depending on flitter's naming).

```typescript
// In RenderParagraph class:
private _registeredSelectionArea: SelectionArea | null = null;
private _selectableId: string = `para-${Math.random().toString(36).slice(2, 8)}`;

// Override the lifecycle hook that fires when the element is mounted in the tree
override attach(owner: PipelineOwner): void {
  super.attach(owner);
  if (this._selectable) {
    const area = InheritedSelectionArea.maybeOf(this.element!);
    if (area) {
      area.register(this._asSelectable());
      this._registeredSelectionArea = area;
    }
  }
}

override detach(): void {
  if (this._registeredSelectionArea) {
    this._registeredSelectionArea.unregister(this._selectableId);
    this._registeredSelectionArea = null;
  }
  super.detach();
}
```

Note: The exact lifecycle hook names need verification against flitter's `RenderObject` base class. Amp uses `setContext` (Flutter's term) — flitter may use `attach`/`detach` or `mount`/`unmount`. Check `packages/tui/src/tree/render-object.ts`.

**A2.4** Implement the `Selectable` interface on `RenderParagraph`:
```typescript
private _asSelectable(): Selectable {
  return {
    id: this._selectableId,
    getText: () => this._textSpan.toPlainText(),
    getGlobalBounds: () => ({
      top: this._globalOffset.y,
      left: this._globalOffset.x,
      width: this.size.width,
      height: this.size.height,
    }),
    setHighlightRange: (start, end) => { this._highlightRange = { start, end }; this.markNeedsPaint(); },
    clearHighlight: () => { this._highlightRange = null; this.markNeedsPaint(); },
    wordBoundary: (offset) => this._findWordBoundary(offset),
    lineBoundary: (offset) => this._findLineBoundary(offset),
  };
}
```

**A2.5** Add highlight rendering in `performPaint`:
- If `_highlightRange` is set, paint background highlight (e.g., inverted colors) on the highlighted glyph range
- Cross-reference amp's highlight painting in `t1T.paint()` for the exact visual treatment

**A2.6** Export from `packages/tui/src/selection/index.ts`:
```typescript
export { InheritedSelectionArea, SelectionAreaWidget } from "./selection-area-widget.js";
```

**A2.7** Unit tests in `packages/tui/src/selection/selection-area-widget.test.ts`:
- Test: `InheritedSelectionArea.of()` returns the controller from ancestor
- Test: `InheritedSelectionArea.maybeOf()` returns null when no ancestor
- Test: selectable `RenderParagraph` auto-registers on mount
- Test: selectable `RenderParagraph` auto-unregisters on unmount
- Test: double-click triggers `selectWordAt`
- Test: triple-click triggers `selectLineAt`
- Test: drag triggers `beginDrag` → `updateDrag` → `endDrag`

**Review checkpoint:** Verify all selection wiring tests pass before proceeding to A3.

---

### Step A3: Gap 2 — Markdown Text Selectability

**A3.1** Add `selectable` prop to `RichTextArgs` (`packages/tui/src/widgets/rich-text.ts`):
```typescript
// In RichTextArgs interface (currently: { key?, text, textAlign?, overflow?, maxLines? })
export interface RichTextArgs {
  key?: Key;
  text: TextSpan;
  textAlign?: TextAlign;
  overflow?: TextOverflow;
  maxLines?: number;
  selectable?: boolean;  // NEW
}
```

**A3.2** Propagate `selectable` to `RenderParagraph` in `RichText` constructor and `updateRenderObject`:
```typescript
// In RichText.createRenderObject:
createRenderObject(): RenderParagraph {
  const rp = new RenderParagraph(this.text, { textAlign, overflow, maxLines });
  rp.selectable = this.selectable ?? false;  // NEW
  return rp;
}

// In RichText.updateRenderObject:
updateRenderObject(renderObject: RenderParagraph): void {
  // ... existing updates ...
  renderObject.selectable = this.selectable ?? false;  // NEW
}
```

**A3.3** Add `selectable` setter on `RenderParagraph` that sets `_selectable` and re-registers/unregisters with SelectionArea if the value changed while mounted.


**A3.4** Update the markdown rendering call sites. The `MarkdownRenderer` produces `TextSpan[]`, not widgets. The callers wrap spans in `RichText`. Find all call sites:

File: `packages/cli/src/widgets/conversation-view.ts` — wherever `new RichText({ text: ... })` wraps markdown output, add `selectable: true`:
```typescript
new RichText({ text: markdownSpan, selectable: true })
```

**A3.5** Update `packages/cli/src/widgets/guidance-file-display.ts` (line ~188):
- Remove the "selectable: true is not yet supported" comment
- Add `selectable: true` to the `RichText` constructor

**A3.6** Update `packages/cli/src/widgets/repl-tool-widget.ts` (line ~304):
- Remove the "selectable: true is not yet supported" comment
- Add `selectable: true` to the `RichText` constructor

**A3.7** Update `packages/cli/src/widgets/toolbox-tool-widget.ts`:
- Add `selectable: true` where RichText renders tool output

**A3.8** Update `packages/cli/src/widgets/librarian-tool-widget.ts`:
- Add `selectable: true` where RichText renders librarian output

**A3.9** Mount `SelectionAreaWidget` in the app widget tree. The logical place is in `packages/cli/src/widgets/app-widget.ts` or `thread-state-widget.ts` — wrap the conversation area so all markdown content is within a `SelectionAreaWidget`:
```typescript
// In the widget tree, wrap ConversationView:
new SelectionAreaWidget({
  child: new ConversationView({ ... }),
})
```

**A3.10** Unit tests:
- Test: `RichText` with `selectable: true` creates a `RenderParagraph` with `_selectable = true`
- Test: markdown-rendered content in ConversationView is selectable

**A3.11** tmux E2E test for the full selection pipeline:
```bash
tmux new-session -d -s test -x 80 -y 24 "bun run flitter 2>/tmp/test.log"
sleep 3
# Type a message to get markdown content on screen
tmux send-keys -t test "hello" Enter
sleep 3
# SGR mouse click-and-drag to select text
tmux send-keys -t test -- $'\x1b[<0;5;10M'    # press at col=5, row=10
tmux send-keys -t test -- $'\x1b[<32;20;10M'   # drag to col=20, row=10
tmux send-keys -t test -- $'\x1b[<0;20;10m'    # release at col=20, row=10
sleep 0.5
tmux capture-pane -t test -p > /tmp/selection-test.txt
# Verify selection highlight is visible (inverted colors or similar)
tmux kill-session -t test
```

**Review checkpoint:** Full Phase A review — all 3 gaps (5, 1, 2) integrated and working.

---

## Phase B: Independent Gaps (can run in parallel with Phase A)

### Step B1: Gap 3 — Text Editing Undo/Redo

**B1.1** Add undo/redo stacks to `TextEditingController` (`packages/tui/src/editing/text-editing-controller.ts`):

After the existing private fields (`_text`, `_cursorPosition`, `_killBuffer`, etc.), add:
```typescript
private _undoStack: Array<{ text: string; cursorPosition: number }> = [];
private _redoStack: Array<{ text: string; cursorPosition: number }> = [];
private static readonly MAX_UNDO_SIZE = 100;
```

**B1.2** Add private `_pushUndo()` method:
```typescript
private _pushUndo(): void {
  this._undoStack.push({ text: this._text, cursorPosition: this._cursorPosition });
  if (this._undoStack.length > TextEditingController.MAX_UNDO_SIZE) {
    this._undoStack.shift(); // Remove oldest entry
  }
  this._redoStack.length = 0; // Clear redo on new mutation
}
```

**B1.3** Add `_pushUndo()` call at the top of every text-mutating method. The exact methods (from line references):
- `insertText` (line 338)
- `deleteText` (line 359)
- `deleteForward` (line 382)
- `deleteSelectedText` (line 518)
- `deleteSelectedOrText` (line 538) — NOTE: this calls `deleteSelectedText` or `deleteText` internally, so do NOT double-push. Only push in the leaf methods.
- `deleteWordLeft` (line 640)
- `deleteWordRight` (line 664)
- `deleteToLineEnd` (line 688)
- `deleteToLineStart` (line 721)
- `deleteCurrentLine` (line 760)
- `yankText` (line 824) — inserts text from kill buffer

**Important:** `deleteSelectedOrText` delegates to `deleteSelectedText` or `deleteText`, so push undo only in `deleteSelectedText` and `deleteText`, NOT in `deleteSelectedOrText` (to avoid double-push).


**B1.4** Add public `undo()` and `redo()`:
```typescript
undo(): void {
  if (this._undoStack.length === 0) return;
  this._redoStack.push({ text: this._text, cursorPosition: this._cursorPosition });
  const prev = this._undoStack.pop()!;
  this._text = prev.text;
  this._cursorPosition = prev.cursorPosition;
  this._selectionBase = null;
  this._selectionExtent = null;
  this._notify();
}

redo(): void {
  if (this._redoStack.length === 0) return;
  this._undoStack.push({ text: this._text, cursorPosition: this._cursorPosition });
  const next = this._redoStack.pop()!;
  this._text = next.text;
  this._cursorPosition = next.cursorPosition;
  this._selectionBase = null;
  this._selectionExtent = null;
  this._notify();
}
```
Use the existing `_notify()` or equivalent change notification method that triggers widget rebuild.

**B1.5** Wire keybindings in `InputField` (`packages/cli/src/widgets/input-field.ts`).

In `_handleKeyEvent` (line 425), add within the `event.modifiers.ctrl` block (lines 488–605):
```typescript
// Add before existing ctrl+key handlers or in alphabetical order:
if (event.key === "z") {
  if (event.modifiers.shift) {
    this._controller.redo();
  } else {
    this._controller.undo();
  }
  return "handled";
}
```

**B1.6** Handle Ctrl+Z priority conflict. Currently `widgets-binding.ts` (line 670) intercepts Ctrl+Z globally as SIGTSTP. The key dispatch order is:
1. Raw event callbacks
2. Key interceptors
3. Focus manager (focused widget handlers) ← InputField runs here
4. Global handler (Ctrl+Z → suspend) ← this runs AFTER focus

Since focus handlers run BEFORE the global handler (step 3 before step 4), and `_handleKeyEvent` returns `"handled"` which stops propagation, the InputField's Ctrl+Z will naturally take priority when the input is focused. **No change needed to widgets-binding.ts.** Verify this assumption with a manual test.

**B1.7** Unit tests in `packages/tui/src/editing/text-editing-controller.test.ts` (add to existing test file):
- Test: `undo()` restores previous text and cursor after `insertText`
- Test: `redo()` re-applies undone change
- Test: `undo()` on empty stack is a no-op
- Test: `redo()` on empty stack is a no-op
- Test: new mutation after undo clears redo stack
- Test: stack caps at 100 entries (oldest dropped)
- Test: `deleteWordLeft` → `undo()` restores the deleted word
- Test: multiple sequential undos walk back through history
- Test: `yankText` is undoable

**B1.8** tmux E2E test:
```bash
tmux new-session -d -s test -x 80 -y 24 "bun run flitter 2>/tmp/test.log"
sleep 3
# Type text
tmux send-keys -t test "hello world"
sleep 0.5
# Ctrl+Z to undo
tmux send-keys -t test C-z
sleep 0.5
tmux capture-pane -t test -p > /tmp/undo-test.txt
# Verify "hello world" is partially undone
tmux kill-session -t test
```

**Review checkpoint:** Undo/redo tests pass; Ctrl+Y (yank) still works.

---

### Step B2: Gap 8 — Kitty Image Preview + JPEG/GIF Transcoding

**B2.1** Install pure-JS image dependencies:
```bash
cd packages/tui && bun add jpeg-js upng-js omggif
```
These are all pure-JS (no native bindings), safe for Bun.

**B2.2** Create `packages/tui/src/image/image-transcoder.ts`:
```typescript
import * as jpegJs from "jpeg-js";
import UPNG from "upng-js";
import { GifReader } from "omggif";

export type TranscodeResult =
  | { success: true; png: string }
  | { success: false; reason: string };

export function transcodeToKittyPng(base64: string, mediaType: string): TranscodeResult {
  switch (mediaType) {
    case "image/png":
      return { success: true, png: base64 };

    case "image/jpeg":
    case "image/jpg": {
      const buf = Buffer.from(base64, "base64");
      const { data, width, height } = jpegJs.decode(buf);
      const pngBuf = UPNG.encode([data.buffer], width, height, 0);
      return { success: true, png: Buffer.from(pngBuf).toString("base64") };
    }

    case "image/gif": {
      const buf = Buffer.from(base64, "base64");
      const reader = new GifReader(buf);
      const { width, height } = reader;
      const pixels = new Uint8Array(width * height * 4);
      reader.decodeAndBlitFrameRGBA(0, pixels); // first frame only
      const pngBuf = UPNG.encode([pixels.buffer], width, height, 0);
      return { success: true, png: Buffer.from(pngBuf).toString("base64") };
    }

    default:
      return { success: false, reason: "unsupported-format" };
  }
}
```

Cross-reference amp module `2452_WebP_Vd0.js` for exact decode/encode patterns (especially UPNG.encode args).


**B2.3** Add terminal capability detection. Create or add to `packages/tui/src/image/kitty-detect.ts`:
```typescript
export function supportsKittyGraphics(): boolean {
  const termProgram = process.env.TERM_PROGRAM?.toLowerCase() ?? "";
  const termName = process.env.TERM?.toLowerCase() ?? "";
  return (
    termProgram === "kitty" ||
    termProgram === "wezterm" ||
    termProgram === "ghostty" ||
    termName.includes("kitty") ||
    termName.includes("xterm-kitty")
  );
}
```
Cross-reference amp's env-var detection in chunk-005.js.

**B2.4** Update `packages/cli/src/widgets/image-preview-modal.ts`:

Replace the placeholder at lines 195–200:
```typescript
// OLD:
const imagePlaceholder = new RichText({
  text: new TextSpan({
    text: "(Terminal does not support inline images)",
    style: new TextStyle({ foreground: fgColor, dim: true, italic: true }),
  }),
});

// NEW:
let imageWidget: Widget;
if (supportsKittyGraphics() && this._imageBase64 && this._imageMimeType) {
  const result = transcodeToKittyPng(this._imageBase64, this._imageMimeType);
  if (result.success) {
    imageWidget = new RenderImageWidget({
      base64Png: result.png,
      cols: Math.min(availableWidth - 4, 60),
      rows: Math.min(availableHeight - 8, 20),
    });
  } else {
    imageWidget = new RichText({
      text: new TextSpan({
        text: `(Cannot display: ${result.reason})`,
        style: new TextStyle({ foreground: fgColor, dim: true, italic: true }),
      }),
    });
  }
} else {
  imageWidget = new RichText({
    text: new TextSpan({
      text: this._altText ? `[Image: ${this._altText}]` : "(Terminal does not support inline images)",
      style: new TextStyle({ foreground: fgColor, dim: true, italic: true }),
    }),
  });
}
```

Note: `RenderImageWidget` may need to be created as a thin StatefulWidget wrapper around the existing `encodeKittyGraphicsTransmit` + `buildPlaceholderGrid` functions from `render-image.ts`. Check if one already exists; if not, create it.

**B2.5** Remove the "no Kitty graphics yet" and simplification comments from `image-preview-modal.ts`.

**B2.6** Add imports to `image-preview-modal.ts`:
```typescript
import { transcodeToKittyPng } from "@flitter/tui/image/image-transcoder";
import { supportsKittyGraphics } from "@flitter/tui/image/kitty-detect";
```
Adjust import paths to match the package's export structure.

**B2.7** Unit tests in `packages/tui/src/image/image-transcoder.test.ts`:
- Test: PNG passthrough returns input unchanged
- Test: JPEG transcodes to valid PNG (use a small test fixture)
- Test: GIF first frame transcodes to valid PNG
- Test: WebP returns `{success: false, reason: "unsupported-format"}`
- Test: Unknown mime type returns `{success: false}`
- Test: Invalid/corrupt JPEG data throws or returns error gracefully

**B2.8** Unit tests for `supportsKittyGraphics()` in `packages/tui/src/image/kitty-detect.test.ts`:
- Test: `TERM_PROGRAM=kitty` → true
- Test: `TERM_PROGRAM=WezTerm` → true (case-insensitive)
- Test: `TERM_PROGRAM=ghostty` → true
- Test: `TERM_PROGRAM=Apple_Terminal` → false
- Test: unset env → false

**Review checkpoint:** Transcoding tests pass. Manual verification: open flitter in Kitty/WezTerm, trigger image preview, confirm image renders.

---

### Step B3: Gap 11 — keyboard-tester Hidden Command

**B3.1** Create `packages/cli/src/commands/keyboard-tester.ts`:
```typescript
import { VtInputParser } from "@flitter/tui";

export async function handleKeyboardTester(opts: { raw?: boolean }): Promise<void> {
  const { stdin, stdout } = process;

  if (!stdin.isTTY) {
    console.error("keyboard-tester requires a TTY");
    process.exit(1);
  }

  // Enable raw mode
  stdin.setRawMode(true);
  stdin.resume();

  // Enable terminal protocols (Kitty keyboard, bracketed paste, focus, resize)
  const enableSeqs = [
    "\x1b[>4;1u",   // Kitty keyboard protocol (progressive enhancement level 1)
    "\x1b[?2004h",  // Bracketed paste
    "\x1b[?1004h",  // Focus events
    "\x1b[?2048h",  // In-band resize (if supported)
  ];
  stdout.write(enableSeqs.join(""));

  console.error("keyboard-tester: Press keys to see parsed events. Ctrl+C to exit.");
  console.error(opts.raw ? "(raw mode enabled — hex bytes shown)" : "");

  const parser = new VtInputParser();

  // Cross-reference amp module 0525_unknown_sy0.js for exact protocol setup

  stdin.on("data", (data: Buffer) => {
    if (opts.raw) {
      stdout.write(JSON.stringify({ raw: data.toString("hex") }) + "\n");
    }

    const events = parser.parse(data);
    for (const event of events) {
      stdout.write(JSON.stringify(event) + "\n");
    }

    // Exit on Ctrl+C (raw byte 0x03)
    if (data.length === 1 && data[0] === 0x03) {
      cleanup();
      process.exit(0);
    }
  });

  function cleanup() {
    // Disable protocols
    const disableSeqs = [
      "\x1b[<u",     // Disable Kitty keyboard
      "\x1b[?2004l", // Disable bracketed paste
      "\x1b[?1004l", // Disable focus events
      "\x1b[?2048l", // Disable in-band resize
    ];
    stdout.write(disableSeqs.join(""));
    stdin.setRawMode(false);
    stdin.pause();
  }

  // Handle SIGINT gracefully
  process.on("SIGINT", () => { cleanup(); process.exit(0); });
}
```


Note: The exact VtInputParser API (constructor, `parse(data)` method signature, event shape) must be verified against the actual flitter implementation. Cross-reference amp's `sy0` in `modules/0525_unknown_sy0.js` for the protocol enable/disable sequences.

**B3.2** Register in `packages/cli/src/program.ts`:

Follow the existing hidden command pattern (lines 416–446 where `install` is registered):
```typescript
import { handleKeyboardTester } from "./commands/keyboard-tester.js";

// After existing command registrations:
const keyboardTesterCmd = program
  .command("keyboard-tester")
  .description("Test terminal keyboard input (developer tool)")
  .option("--raw", "Also log raw hex bytes before parsing")
  .action(handleKeyboardTester);

// Hide it from --help
// @ts-expect-error — Commander's _hidden is internal but stable
keyboardTesterCmd._hidden = true;
```

**B3.3** Unit test in `packages/cli/src/commands/keyboard-tester.test.ts`:
- Test: JSONL output format matches expected shape
- Test: `--raw` includes hex bytes in output
- Test: non-TTY exits with error message

**B3.4** Manual verification:
```bash
bun run flitter keyboard-tester
# Press various keys, verify JSONL output
# Press Ctrl+C, verify clean exit (terminal not stuck in raw mode)

bun run flitter keyboard-tester --raw
# Verify hex bytes appear before parsed events

bun run flitter --help
# Verify keyboard-tester does NOT appear in help output
```

**Review checkpoint:** Command works, terminal restores cleanly, hidden from help.

---

### Step B4: Gap 15 — Config TTL Cache

**B4.1** Update `packages/data/src/config/config-service.ts`:

Add import:
```typescript
import { GlobalCachedValue } from "@flitter/util";
```

**B4.2** Add admin settings cache as a class field (or module-level if ConfigService is a plain object):
```typescript
private _adminSettingsCache: GlobalCachedValue<AdminSettings, AdminSettingsChange>;

// In constructor or init:
this._adminSettingsCache = new GlobalCachedValue({
  softTTL: 30_000,   // 30 seconds — background recompute
  hardTTL: 120_000,  // 120 seconds — blocking recompute
  compute: () => readAdminSettings(),
  changes: (oldVal, newVal) => this._diffAdminSettings(oldVal, newVal),
});
```

Verify the exact type signatures: `readAdminSettings()` must return `Promise<T>`, and `changes` must return `E | undefined`. Check the actual return type of `readAdminSettings` in `packages/data/src/config/admin-settings.ts`.

**B4.3** Update `reload()` method (line ~226). Replace the direct `readAdminSettings()` call:
```typescript
// OLD:
const adminSettings = await readAdminSettings();

// NEW:
const adminSettings = await this._adminSettingsCache.get();
```

**B4.4** Wire change events. Subscribe to `_adminSettingsCache.events` in the constructor/init to feed into the existing config change pipeline:
```typescript
this._adminSettingsCache.events.subscribe((change) => {
  if (change) {
    // Trigger config reload to pick up new admin settings
    this.reload();
  }
});
```
Be careful to avoid infinite loops (reload calls get, get may emit change, change triggers reload). The TTL guard in `GlobalCachedValue.get()` prevents this — within softTTL, `get()` returns cached value without recompute, so the loop terminates.

**B4.5** Add a `_diffAdminSettings` helper:
```typescript
private _diffAdminSettings(
  oldVal: AdminSettings | undefined,
  newVal: AdminSettings | undefined
): AdminSettingsChange | undefined {
  if (!oldVal || !newVal) return newVal ? { changed: true } : undefined;
  // Simple JSON equality check
  if (JSON.stringify(oldVal) === JSON.stringify(newVal)) return undefined;
  return { changed: true };
}
```
The exact change type depends on what consumers expect. Check the existing config change notification pattern.

**B4.6** Dispose the cache on service shutdown:
```typescript
// In dispose/asyncDispose:
// GlobalCachedValue may not have dispose — check the API.
// If it has an internal timer, clear it.
```

**B4.7** Unit tests (add to existing config-service test file or new `config-service-ttl.test.ts`):
- Test: first `reload()` calls `readAdminSettings()` via cache
- Test: second `reload()` within 30s returns cached value (no second read)
- Test: `reload()` after 30s triggers background recompute
- Test: `reload()` after 120s blocks until recompute completes
- Test: change event fires when admin settings change
- Test: change event does NOT fire when settings are identical

**Review checkpoint:** Config TTL tests pass. No regressions in config loading.

---

## Final Integration

### Step F1: Integration testing

After all Phase A and Phase B steps complete:

1. Run full test suite: `bun test`
2. Run type check: `bun run typecheck` (or equivalent)
3. tmux E2E smoke test:
   ```bash
   tmux new-session -d -s test -x 120 -y 40 "bun run flitter 2>/tmp/test.log"
   sleep 3
   # Test selection: send a message, then drag-select the response
   tmux send-keys -t test "say hello" Enter
   sleep 5
   # Test undo: type in input, then Ctrl+Z
   tmux send-keys -t test "test undo text"
   sleep 0.5
   tmux send-keys -t test C-z
   sleep 0.5
   tmux capture-pane -t test -p > /tmp/integration-test.txt
   tmux kill-session -t test
   ```

### Step F2: Update HEALTH.md

Per CLAUDE.md Rule 6, update the affected sections:
- New tests added (selection, undo/redo, image transcoding, keyboard-tester, config TTL)
- New dependencies (jpeg-js, upng-js, omggif)
- Debt items closed (selection wiring, markdown selectability, undo/redo)

### Step F3: Commit

Group by logical unit:
1. `feat(tui): wire RenderParagraph hit-test and inline span onTap` (Gap 5)
2. `feat(tui): add SelectionAreaWidget + InheritedSelectionArea` (Gap 1)
3. `feat(tui): add selectable prop to RichText + markdown selectability` (Gap 2)
4. `feat(tui): add undo/redo to TextEditingController` (Gap 3)
5. `feat(tui): add JPEG/GIF→PNG transcoding and wire Kitty image preview` (Gap 8)
6. `feat(cli): add keyboard-tester hidden command` (Gap 11)
7. `feat(data): wire GlobalCachedValue for admin settings TTL cache` (Gap 15)
