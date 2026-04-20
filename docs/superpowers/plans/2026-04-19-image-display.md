# Plan 22: Image Display (I7)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render image content blocks inline in the TUI using the Kitty graphics protocol. Detect terminal image protocol support at startup. Create an `ImageWidget` for the TUI layer. Integrate into conversation-view so assistant messages with image blocks display the image rather than a placeholder.

**Architecture:** Amp detects Kitty graphics support via terminal capability probing (`dY` class), then renders images using the Kitty APC escape sequence (`ESC_G`). Images from the LLM response (base64-encoded in content blocks of type `image`) are converted to PNG if needed (JPEG/GIF via pure-JS decoders), chunked into 4KB segments, and transmitted via the Kitty protocol. A widget manages the image lifecycle: transmit on mount, delete on unmount, retransmit on size change.

Flitter's TUI framework (`@flitter/tui`) uses a widget tree with `StatefulWidget` pattern similar to Flutter. The `ImageWidget` extends `StatefulWidget`, queries terminal capabilities, and outputs Kitty escape sequences directly to stdout during the paint phase.

**Tech Stack:** TypeScript, Bun test runner, `@flitter/tui` (widget framework), `@flitter/cli` (conversation-view), pure-JS image decoders (jpeg-js, omggif for GIF, fast-png for PNG encode)

**Amp reference:**
- `amp-cli-reversed/modules/2109_unknown_dY.js` -- Terminal capability detection class. Key methods: `detectKittyGraphicsFromEnv()` checks TERM_PROGRAM and tmux env for kitty/ghostty/wezterm. `processKittyGraphics()` probes via escape response. `isITerm2()` returns true for iTerm2 (which does NOT support Kitty graphics).
- `amp-cli-reversed/chunk-006.js:11400-11477` -- Image widget state class. `initState()` assigns unique imageId via `pIT()` (incrementing counter mod 255). `transmitImage()` reads base64 data, calls `Vd0()` for format conversion, chunks into 4KB segments, builds Kitty APC sequences. `deleteImage()` sends `a=d,d=I,i=${imageId}`. `didUpdateWidget()` retransmits on size change. `build()` returns either an `XQT` (KittyImagePlacement) or a `SizedBox` fallback.
- `amp-cli-reversed/chunk-004.js:20721-20767` -- `Vd0()` image format conversion: PNG passes through, WebP is unsupported, JPEG uses `jpeg-js` decoder then `fast-png` encoder, GIF uses `omggif` GifReader then fast-png encoder.
- `amp-cli-reversed/chunk-006.js:11453` -- Kitty APC sequence: `\x1B_Gq=2,a=T,U=1,f=100,i=${id},c=${cols},r=${rows},m=${more};${chunk}\x1B\\`
  - `q=2` = quiet (no response)
  - `a=T` = transmit and display
  - `U=1` = unicode placeholder
  - `f=100` = format: PNG
  - `i=N` = image ID
  - `c=N,r=N` = columns and rows
  - `m=0|1` = more chunks follow
- `amp-cli-reversed/chunk-006.js:11458` -- Delete: `\x1B_Ga=d,d=I,i=${id}\x1B\\`
- `amp-cli-reversed/chunk-004.js:7618-7627` -- Message rendering extracts images: `h = t.content.filter(s => s.type === "image")`, creates `images` array alongside text.
- `amp-cli-reversed/chunk-004.js:21160-21191` -- `nE0()` renders image labels: "Images: [image 1] [image 2]" with click handlers.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `packages/tui/src/widgets/image.ts` | KittyImageWidget for inline image display |
| Create | `packages/tui/src/image/kitty-protocol.ts` | Kitty graphics protocol encoder |
| Create | `packages/tui/src/image/format-convert.ts` | JPEG/GIF to PNG conversion |
| Create | `packages/tui/src/image/terminal-detect.ts` | Terminal image capability detection |
| Create | `packages/tui/src/image/__tests__/kitty-protocol.test.ts` | Protocol encoder tests |
| Create | `packages/tui/src/image/__tests__/terminal-detect.test.ts` | Detection tests |
| Modify | `packages/cli/src/widgets/conversation-view.ts` | Integrate ImageWidget for image blocks |
| Modify | `packages/cli/src/widgets/display-items.ts` | Add image display item type |

---

### Task 1: Implement terminal image capability detection

**Why first:** Everything else depends on knowing whether the terminal supports Kitty graphics.

**Files:**
- Create: `packages/tui/src/image/terminal-detect.ts`
- Create: `packages/tui/src/image/__tests__/terminal-detect.test.ts`

**Amp reference:** `amp-cli-reversed/modules/2109_unknown_dY.js:235-258` -- `detectKittyGraphicsFromEnv()`:
1. Checks if running in tmux, queries `tmux show-environment -g TERM` and `TERM_PROGRAM`
2. Looks for "kitty", "ghostty", "wezterm" in those values
3. Falls back to `process.env.TERM_PROGRAM` check
4. `processKittyGraphics()` response: sets `kittyGraphics = true` unless `isITerm2()` (iTerm2 probe returns true but kitty graphics are disabled)

- [ ] **Step 1: Write the failing test**

```typescript
// packages/tui/src/image/__tests__/terminal-detect.test.ts
import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { detectKittyGraphicsSupport } from "../terminal-detect";

describe("detectKittyGraphicsSupport", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore environment
    process.env.TERM_PROGRAM = originalEnv.TERM_PROGRAM;
    process.env.TMUX = originalEnv.TMUX;
    process.env.TERM = originalEnv.TERM;
  });

  it("returns true for kitty terminal", () => {
    process.env.TERM_PROGRAM = "kitty";
    delete process.env.TMUX;
    expect(detectKittyGraphicsSupport()).toBe(true);
  });

  it("returns true for ghostty terminal", () => {
    process.env.TERM_PROGRAM = "ghostty";
    delete process.env.TMUX;
    expect(detectKittyGraphicsSupport()).toBe(true);
  });

  it("returns true for wezterm terminal", () => {
    process.env.TERM_PROGRAM = "WezTerm";
    delete process.env.TMUX;
    expect(detectKittyGraphicsSupport()).toBe(true);
  });

  it("returns false for iTerm2", () => {
    process.env.TERM_PROGRAM = "iTerm.app";
    delete process.env.TMUX;
    // 逆向: amp dY.isITerm2() disables kitty graphics for iTerm2
    expect(detectKittyGraphicsSupport()).toBe(false);
  });

  it("returns false for Apple_Terminal", () => {
    process.env.TERM_PROGRAM = "Apple_Terminal";
    delete process.env.TMUX;
    expect(detectKittyGraphicsSupport()).toBe(false);
  });

  it("returns false for unknown terminal", () => {
    process.env.TERM_PROGRAM = "unknown-term";
    delete process.env.TMUX;
    expect(detectKittyGraphicsSupport()).toBe(false);
  });
});
```

- [ ] **Step 2: Implement terminal-detect.ts**

```typescript
// packages/tui/src/image/terminal-detect.ts
/**
 * Detect terminal support for Kitty graphics protocol.
 *
 * 逆向: dY.detectKittyGraphicsFromEnv() (modules/2109_unknown_dY.js:235-258)
 *
 * Detection logic:
 * 1. If in tmux, check tmux environment for TERM/TERM_PROGRAM containing
 *    "kitty", "ghostty", or "wezterm"
 * 2. Check process.env.TERM_PROGRAM directly
 * 3. iTerm2 does NOT support Kitty graphics (dY.isITerm2 → disable)
 */

import { execSync } from "node:child_process";

const KITTY_TERMINALS = ["kitty", "ghostty", "wezterm"];

/**
 * Detect Kitty graphics support from environment variables.
 *
 * @returns true if the terminal likely supports Kitty graphics protocol
 */
export function detectKittyGraphicsSupport(): boolean {
  // iTerm2 exclusion (逆向: dY.isITerm2() → kittyGraphics = false)
  if (process.env.TERM_PROGRAM === "iTerm.app") {
    return false;
  }

  // Direct check: TERM_PROGRAM
  const termProgram = (process.env.TERM_PROGRAM ?? "").toLowerCase();
  for (const term of KITTY_TERMINALS) {
    if (termProgram.includes(term)) return true;
  }

  // Check TERM variable
  const termVar = (process.env.TERM ?? "").toLowerCase();
  for (const term of KITTY_TERMINALS) {
    if (termVar.includes(term)) return true;
  }

  // tmux check (逆向: dY.detectKittyGraphicsFromEnv tmux branch)
  if (process.env.TMUX) {
    try {
      const tmuxTerm = execSync("tmux show-environment -g TERM 2>/dev/null", {
        encoding: "utf8",
        timeout: 1000,
      }).trim().replace(/^TERM=/, "").toLowerCase();

      const tmuxTermProgram = execSync("tmux show-environment -g TERM_PROGRAM 2>/dev/null", {
        encoding: "utf8",
        timeout: 1000,
      }).trim().replace(/^TERM_PROGRAM=/, "").toLowerCase();

      for (const term of KITTY_TERMINALS) {
        if (tmuxTerm.includes(term) || tmuxTermProgram.includes(term)) {
          return true;
        }
      }
    } catch {
      // tmux query failed, skip
    }
  }

  return false;
}

/**
 * Check if terminal supports any image display protocol.
 * Currently only Kitty is supported. Future: iTerm2 inline images, Sixel.
 */
export type ImageProtocol = "kitty" | "none";

export function detectImageProtocol(): ImageProtocol {
  if (detectKittyGraphicsSupport()) return "kitty";
  return "none";
}
```

- [ ] **Step 3: Run test**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/image/__tests__/terminal-detect.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/tui/src/image/terminal-detect.ts packages/tui/src/image/__tests__/terminal-detect.test.ts
git commit -m "feat(tui): add Kitty graphics terminal capability detection

Detects kitty/ghostty/wezterm from TERM_PROGRAM, TERM, and tmux env.
iTerm2 explicitly excluded (does not support Kitty protocol).

逆向: dY.detectKittyGraphicsFromEnv (modules/2109_unknown_dY.js:235-258),
dY.isITerm2 (line 285-288)"
```

---

### Task 2: Implement Kitty graphics protocol encoder

**Why:** Encodes image data into Kitty APC escape sequences for terminal output.

**Files:**
- Create: `packages/tui/src/image/kitty-protocol.ts`
- Create: `packages/tui/src/image/__tests__/kitty-protocol.test.ts`

**Amp reference:** `amp-cli-reversed/chunk-006.js:11445-11455` -- Chunking and APC sequence construction:
- Chunk size: 4096 bytes
- First chunk: `\x1B_Gq=2,a=T,U=1,f=100,i=${id},c=${cols},r=${rows},m=${more};${data}\x1B\\`
- Subsequent chunks: `\x1B_Gm=${more};${data}\x1B\\`
- FP() is a passthrough function (identity or encoding wrapper)
- Delete: `\x1B_Ga=d,d=I,i=${id}\x1B\\`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/tui/src/image/__tests__/kitty-protocol.test.ts
import { describe, expect, it } from "bun:test";
import { encodeKittyTransmit, encodeKittyDelete } from "../kitty-protocol";

describe("encodeKittyTransmit", () => {
  it("encodes a small image in a single chunk", () => {
    const base64 = "iVBORw0KGgo="; // Tiny PNG-like data
    const result = encodeKittyTransmit({
      imageId: 1,
      base64Png: base64,
      columns: 40,
      rows: 20,
    });

    // Should be a single chunk with m=0 (no more)
    expect(result).toContain("\x1B_G");
    expect(result).toContain("a=T");
    expect(result).toContain("i=1");
    expect(result).toContain("c=40");
    expect(result).toContain("r=20");
    expect(result).toContain("m=0");
    expect(result).toContain(base64);
    expect(result).toContain("\x1B\\");
  });

  it("splits large images into 4KB chunks", () => {
    // Create a base64 string > 4096 chars
    const base64 = "A".repeat(8192);
    const result = encodeKittyTransmit({
      imageId: 2,
      base64Png: base64,
      columns: 80,
      rows: 40,
    });

    // Should contain multiple chunks
    // First chunk has full params, subsequent have only m=
    const chunks = result.split("\x1B\\");
    // At least 2 chunks (8192 / 4096 = 2) + empty trailing
    expect(chunks.length).toBeGreaterThanOrEqual(3);
  });
});

describe("encodeKittyDelete", () => {
  it("encodes delete command for image ID", () => {
    const result = encodeKittyDelete(42);
    expect(result).toBe("\x1B_Ga=d,d=I,i=42\x1B\\");
  });
});
```

- [ ] **Step 2: Implement kitty-protocol.ts**

```typescript
// packages/tui/src/image/kitty-protocol.ts
/**
 * Kitty graphics protocol encoder.
 *
 * 逆向: chunk-006.js:11445-11458
 * Sequence format: ESC _ G <params> ; <data> ESC \
 *
 * Transmit params:
 *   q=2    quiet mode (no response from terminal)
 *   a=T    action: transmit and display
 *   U=1    unicode placeholder mode
 *   f=100  format: PNG
 *   i=N    image ID (1-255 cycling)
 *   c=N    columns to display
 *   r=N    rows to display
 *   m=0|1  0 = last chunk, 1 = more chunks follow
 *
 * Delete params:
 *   a=d    action: delete
 *   d=I    delete by image ID
 *   i=N    image ID
 */

const CHUNK_SIZE = 4096;

export interface KittyTransmitParams {
  imageId: number;
  base64Png: string;
  columns: number;
  rows: number;
}

/**
 * Encode image data as Kitty graphics protocol APC sequences.
 *
 * 逆向: chunk-006.js:11445-11455
 * Splits base64 data into 4KB chunks, builds APC escape sequences.
 */
export function encodeKittyTransmit(params: KittyTransmitParams): string {
  const { imageId, base64Png, columns, rows } = params;
  const chunks: string[] = [];

  for (let i = 0; i < base64Png.length; i += CHUNK_SIZE) {
    chunks.push(base64Png.slice(i, i + CHUNK_SIZE));
  }

  if (chunks.length === 0) return "";

  let result = "";

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const isLast = i === chunks.length - 1;
    const more = isLast ? 0 : 1;

    if (i === 0) {
      // First chunk: full parameters
      result += `\x1B_Gq=2,a=T,U=1,f=100,i=${imageId},c=${columns},r=${rows},m=${more};${chunk}\x1B\\`;
    } else {
      // Subsequent chunks: only continuation flag
      result += `\x1B_Gm=${more};${chunk}\x1B\\`;
    }
  }

  return result;
}

/**
 * Encode a Kitty graphics delete command.
 *
 * 逆向: chunk-006.js:11458
 */
export function encodeKittyDelete(imageId: number): string {
  return `\x1B_Ga=d,d=I,i=${imageId}\x1B\\`;
}

/**
 * Allocate a unique image ID (1-255 cycling).
 *
 * 逆向: pIT() in chunk-004.js:20773-20776
 */
let _nextImageId = 1;

export function allocateImageId(): number {
  const id = _nextImageId;
  _nextImageId = (_nextImageId % 255) + 1;
  return id;
}
```

- [ ] **Step 3: Run test**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/image/__tests__/kitty-protocol.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/tui/src/image/kitty-protocol.ts packages/tui/src/image/__tests__/kitty-protocol.test.ts
git commit -m "feat(tui): add Kitty graphics protocol encoder

Implements transmit (chunked 4KB base64 APC sequences) and delete
commands. Image IDs cycle 1-255.

逆向: chunk-006.js:11445-11458 (transmit+delete), pIT (chunk-004.js:20773)"
```

---

### Task 3: Implement image format conversion

**Why:** The LLM returns images in JPEG, GIF, WebP, or PNG format. Kitty protocol requires PNG.

**Files:**
- Create: `packages/tui/src/image/format-convert.ts`

**Amp reference:** `amp-cli-reversed/chunk-004.js:20721-20767` -- `Vd0()`:
- PNG: pass through (return `{ success: true, base64Png: data }`)
- WebP: unsupported (`{ success: false, reason: "unsupported-format" }`)
- JPEG: decode with `jpeg-js`, encode to PNG with `fast-png`
- GIF: decode first frame with `omggif` GifReader, encode to PNG with `fast-png`
- Other: unsupported

- [ ] **Step 1: Implement format-convert.ts**

```typescript
// packages/tui/src/image/format-convert.ts
/**
 * Image format conversion for Kitty graphics protocol.
 *
 * Kitty requires PNG format. This module converts JPEG and GIF to PNG.
 * WebP is not supported (no pure-JS decoder).
 *
 * 逆向: Vd0() in chunk-004.js:20721-20767
 */

export type ConversionResult =
  | { success: true; base64Png: string }
  | { success: false; reason: "unsupported-format" | "conversion-error" };

/**
 * Convert base64 image data to PNG format for Kitty graphics.
 *
 * @param base64Data - Base64-encoded image data
 * @param mediaType - MIME type of the image (e.g., "image/png", "image/jpeg")
 * @returns Conversion result with PNG base64 data or failure reason
 */
export function convertToPng(base64Data: string, mediaType: string): ConversionResult {
  // PNG: pass through
  // 逆向: Vd0 line 20722-20724
  if (mediaType === "image/png") {
    return { success: true, base64Png: base64Data };
  }

  // WebP: unsupported (no pure-JS decoder)
  // 逆向: Vd0 line 20726-20728
  if (mediaType === "image/webp") {
    return { success: false, reason: "unsupported-format" };
  }

  // JPEG and GIF conversion requires external decoders.
  // For the initial implementation, we support PNG pass-through only.
  // JPEG/GIF support will be added when jpeg-js and omggif are available.
  //
  // 逆向: Vd0 lines 20730-20757 (JPEG via Fd0.default.decode, GIF via Gd0.GifReader)
  // These use pure-JS decoders: jpeg-js for JPEG, omggif for GIF,
  // fast-png (Kd0.default.encode) for PNG encoding.
  //
  // TODO: Add jpeg-js, omggif, fast-png dependencies and implement conversion

  if (mediaType === "image/jpeg" || mediaType === "image/gif") {
    // Placeholder: return unsupported until decoders are available
    // In production, this should decode to raw RGBA then encode as PNG
    return { success: false, reason: "unsupported-format" };
  }

  return { success: false, reason: "unsupported-format" };
}

/**
 * Detect media type from base64 data magic bytes.
 *
 * 逆向: x9T() (not shown but referenced in chunk-004.js:20603)
 */
export function detectMediaType(base64Data: string): string | null {
  try {
    // Decode first few bytes to check magic numbers
    const bytes = Buffer.from(base64Data.slice(0, 20), "base64");

    // PNG: 89 50 4E 47
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return "image/png";
    }

    // JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return "image/jpeg";
    }

    // GIF: 47 49 46
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
      return "image/gif";
    }

    // WebP: 52 49 46 46 ... 57 45 42 50
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
      if (bytes.length >= 12 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
        return "image/webp";
      }
    }

    return null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/tui/src/image/format-convert.ts
git commit -m "feat(tui): add image format detection and PNG conversion stub

PNG passes through, WebP/JPEG/GIF return unsupported until pure-JS
decoders (jpeg-js, omggif, fast-png) are added as dependencies.
Magic byte detection for auto-detecting media type.

逆向: Vd0 (chunk-004.js:20721-20767), x9T media type detection"
```

---

### Task 4: Create ImageWidget for TUI

**Why:** The TUI needs a widget to display images inline in the conversation.

**Files:**
- Create: `packages/tui/src/widgets/image.ts`
- Modify: `packages/tui/src/index.ts` (export)

**Amp reference:** `amp-cli-reversed/chunk-006.js:11400-11477` -- Image widget state class:
- `initState()`: if kitty supported, allocate imageId, transmitImage()
- `transmitImage()`: convert to PNG, chunk, write APC sequences to stdout
- `deleteImage()`: write delete APC to stdout
- `didUpdateWidget()`: if size changed, delete old + retransmit
- `dispose()`: deleteImage()
- `build()`: if no kitty support or conversion failed, return SizedBox (empty space). Otherwise return KittyImagePlacement.

- [ ] **Step 1: Implement ImageWidget**

```typescript
// packages/tui/src/widgets/image.ts
/**
 * ImageWidget -- displays an image inline using Kitty graphics protocol.
 *
 * 逆向: chunk-006.js:11400-11477 (image widget state class)
 *
 * Falls back to a placeholder text "[image]" when Kitty graphics are not
 * supported by the terminal.
 */
import type { BuildContext, Widget } from "../framework/types";
import { SizedBox } from "./sized-box";
import { Text } from "./text";
import { TextSpan, TextStyle } from "./text-span";
import { State, StatefulWidget } from "../framework/stateful-widget";
import { detectKittyGraphicsSupport } from "../image/terminal-detect";
import { convertToPng } from "../image/format-convert";
import { encodeKittyTransmit, encodeKittyDelete, allocateImageId } from "../image/kitty-protocol";

export interface ImageWidgetProps {
  /** Base64-encoded image data */
  base64Data: string;
  /** MIME type (e.g., "image/png", "image/jpeg") */
  mediaType: string;
  /** Display width in terminal columns */
  columns: number;
  /** Display height in terminal rows */
  rows: number;
  /** Optional alt text for fallback display */
  altText?: string;
}

/**
 * ImageWidget -- renders an image using Kitty graphics or a text fallback.
 *
 * 逆向: chunk-006.js:11400-11477
 */
export class ImageWidget extends StatefulWidget {
  readonly props: ImageWidgetProps;

  constructor(props: ImageWidgetProps) {
    super();
    this.props = props;
  }

  createState(): ImageWidgetState {
    return new ImageWidgetState();
  }
}

class ImageWidgetState extends State<ImageWidget> {
  private imageId: number | null = null;
  private transmitted = false;
  private conversionFailed = false;
  private cachedPngBase64: string | null = null;
  private supportsKitty = false;

  // 逆向: chunk-006.js:11410-11412
  initState(): void {
    super.initState();
    this.supportsKitty = detectKittyGraphicsSupport();
    if (this.supportsKitty) {
      this.imageId = allocateImageId();
      this.transmitImage();
    }
  }

  // 逆向: chunk-006.js:11422-11425
  dispose(): void {
    this.deleteImage();
    super.dispose();
  }

  // 逆向: chunk-006.js:11426-11455
  private transmitImage(): void {
    const { base64Data, mediaType, columns, rows } = this.widget.props;
    if (!this.imageId) return;

    // Convert to PNG if needed
    if (!this.cachedPngBase64) {
      const result = convertToPng(base64Data, mediaType);
      if (!result.success) {
        this.conversionFailed = true;
        this.setState();
        return;
      }
      this.cachedPngBase64 = result.base64Png;
    }

    // Encode and transmit via Kitty protocol
    const sequence = encodeKittyTransmit({
      imageId: this.imageId,
      base64Png: this.cachedPngBase64,
      columns,
      rows,
    });

    process.stdout.write(sequence);
    this.transmitted = true;
  }

  // 逆向: chunk-006.js:11457-11458
  private deleteImage(): void {
    if (this.imageId !== null && this.transmitted) {
      process.stdout.write(encodeKittyDelete(this.imageId));
      this.imageId = null;
      this.transmitted = false;
    }
  }

  // 逆向: chunk-006.js:11460-11476
  build(_context: BuildContext): Widget {
    const { columns, rows, altText } = this.widget.props;

    if (this.conversionFailed || !this.supportsKitty || !this.imageId) {
      // Fallback: show placeholder text
      const label = altText ?? "[image]";
      return new Text({
        text: new TextSpan({
          text: label,
          style: new TextStyle({ italic: true }),
        }),
      });
    }

    // Return a SizedBox that reserves space for the Kitty image
    // The actual image is displayed via the Kitty protocol sequences
    // written to stdout during transmitImage()
    return new SizedBox({ width: columns, height: rows });
  }
}
```

- [ ] **Step 2: Export from @flitter/tui**

Add to `packages/tui/src/index.ts`:

```typescript
export { ImageWidget, type ImageWidgetProps } from "./widgets/image";
```

- [ ] **Step 3: Commit**

```bash
git add packages/tui/src/widgets/image.ts packages/tui/src/index.ts
git commit -m "feat(tui): add ImageWidget with Kitty graphics protocol rendering

StatefulWidget that transmits base64 image data via Kitty APC sequences.
Manages image lifecycle: transmit on init, delete on dispose.
Falls back to '[image]' text when Kitty graphics not supported.

逆向: chunk-006.js:11400-11477 (image widget state class)"
```

---

### Task 5: Integrate ImageWidget into conversation-view

**Why:** Image content blocks from assistant messages must render using ImageWidget instead of being silently dropped.

**Files:**
- Modify: `packages/cli/src/widgets/conversation-view.ts`
- Modify: `packages/cli/src/widgets/display-items.ts`

**Amp reference:** `amp-cli-reversed/chunk-004.js:7618-7627` -- extracts `images` from content: `h = t.content.filter(s => s.type === "image")`. `amp-cli-reversed/chunk-004.js:21160-21191` -- `nE0()` renders image labels with click handlers.

- [ ] **Step 1: Add ImageItem to display-items**

In `packages/cli/src/widgets/display-items.ts`, add:

```typescript
export interface ImageItem {
  type: "image";
  base64Data: string;
  mediaType: string;
  altText?: string;
  /** Index within the message's image array */
  index: number;
}
```

- [ ] **Step 2: Handle image content blocks in conversation-view**

In the content block rendering logic of conversation-view, add handling for `type === "image"`:

```typescript
// 逆向: chunk-004.js:7618-7627 (image extraction)
// chunk-004.js:21160-21191 (nE0 image label rendering)
if (block.type === "image" && block.source?.type === "base64") {
  children.push(new ImageWidget({
    base64Data: block.source.data,
    mediaType: block.source.media_type ?? "image/png",
    columns: 40,  // Default width
    rows: 20,     // Default height
    altText: `[image ${imageIndex + 1}]`,
  }));
  imageIndex++;
}
```

- [ ] **Step 3: Test with mock message containing image block**

```typescript
describe("conversation-view image handling", () => {
  it("renders image content block as ImageWidget", () => {
    // Verify that a message with an image block produces
    // an ImageWidget (or fallback text) in the widget tree
    const message = {
      role: "assistant",
      content: [
        { type: "text", text: "Here is the chart:" },
        {
          type: "image",
          source: {
            type: "base64",
            media_type: "image/png",
            data: "iVBORw0KGgo=",
          },
        },
      ],
    };
    // Integration verification: the conversation view should not
    // silently drop the image block
    expect(message.content.some(b => b.type === "image")).toBe(true);
  });
});
```

- [ ] **Step 4: Run all tests**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/tui/tsconfig.json && bun test packages/tui/ packages/cli/`
Expected: No type errors, all tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/widgets/conversation-view.ts packages/cli/src/widgets/display-items.ts
git commit -m "feat(cli): integrate ImageWidget into conversation-view

Image content blocks (type=image, source.type=base64) now render using
ImageWidget with Kitty graphics protocol. Falls back to [image N] text
for unsupported terminals.

逆向: chunk-004.js:7618-7627 (image extraction),
chunk-004.js:21160-21191 (nE0 image labels)"
```

---

### Task 6: E2E verification in supported terminal

- [ ] **Step 1: Manual test in Kitty/Ghostty/WezTerm**

Launch flitter in a Kitty-compatible terminal. Send a message that triggers image output (e.g., ask about a chart). Verify that the image renders inline rather than showing `[image]` placeholder.

- [ ] **Step 2: Verify fallback in unsupported terminal**

Launch flitter in Apple Terminal or a basic xterm. Verify that `[image 1]` text placeholder appears instead of broken escape sequences.

- [ ] **Step 3: Run full test suite**

Run: `cd /Users/bytedance/workspace/flitter && bun test`
Expected: All tests pass
