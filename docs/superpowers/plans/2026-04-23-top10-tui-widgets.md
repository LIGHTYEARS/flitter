# TUI Widgets — Image Display, Image Paste, Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Kitty Graphics image display (GAP-TUI-01), clipboard image paste (GAP-TUI-20), and chart render object (GAP-TUI-25).

**Architecture:** `ImageWidget` uses Kitty APC protocol with chunked PNG transmission and Unicode placeholder cells. `ClipboardImage` dispatches per-platform readers (macOS osascript, Wayland wl-paste, X11 xclip, WSL, PowerShell). `RenderChart` supports 6 chart types with braille sub-cell resolution for line/area charts and block characters for bar charts.

**Tech Stack:** TypeScript, Kitty Graphics Protocol (APC), braille characters (U+2800 block), ANSI block characters (▁▂▃▄▅▆▇█).

**Amp reference:** `misc_utils.js` VQT/YQT (image), `chunk-004.js:32090` VTR (clipboard), `misc_utils.js:4227` uRR (chart)

**Depends on:** GAP-TUI-18 (QueryParser) for `kittyGraphics` capability detection.

---

## Task 1: Kitty Graphics ImageWidget (GAP-TUI-01)

**Files:**
- Create: `packages/tui/src/widgets/image-widget.ts`
- Create: `packages/tui/src/render-object/render-image.ts`
- Test: `packages/tui/src/widgets/__tests__/image-widget.test.ts`

- [ ] **Step 1: Write failing test for image transmission encoding**

```ts
import { encodeKittyGraphicsTransmit, buildPlaceholderGrid } from "../render-object/render-image";

describe("Kitty Graphics", () => {
  test("encodeKittyGraphicsTransmit produces chunked APC sequence", () => {
    const pngBase64 = Buffer.from("fake-png-data").toString("base64");
    const result = encodeKittyGraphicsTransmit(pngBase64, { id: 1, cols: 10, rows: 5 });

    // First chunk has full params
    expect(result).toContain("\x1b_Gq=2,a=T,U=1,f=100,i=1,c=10,r=5,m=");
    // Ends with APC terminator
    expect(result).toContain("\x1b\\");
  });

  test("buildPlaceholderGrid produces cols x rows of placeholder chars", () => {
    const grid = buildPlaceholderGrid(3, 2, 42);
    expect(grid.length).toBe(2); // rows
    expect(grid[0].length).toBe(3); // cols per row
    // Each cell is 3 codepoints: base + row diacritic + col diacritic
    for (const row of grid) {
      for (const cell of row) {
        expect(cell.char.length).toBeGreaterThanOrEqual(1);
        expect(cell.imageId).toBe(42);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement render-image.ts**

```ts
// packages/tui/src/render-object/render-image.ts
// 逆向: VQT.transmitImage + YQT.paint (misc_utils.js)
// Kitty Graphics APC protocol: ESC_G<params>;<base64>ESC\

const CHUNK_SIZE = 4096;
// 逆向: ly array — diacritic table for row/col encoding in placeholder grid
const DIACRITICS = [
  0x0305, 0x030D, 0x030E, 0x0310, 0x0312, 0x033D, 0x033E, 0x033F,
  0x0346, 0x034A, 0x034B, 0x034C, 0x0350, 0x0351, 0x0352, 0x0357,
];
const PLACEHOLDER_BASE = 0x10EFFE;

interface TransmitOpts {
  id: number;    // 1-255, cycling
  cols: number;
  rows: number;
}

export function encodeKittyGraphicsTransmit(base64Data: string, opts: TransmitOpts): string {
  const chunks: string[] = [];
  for (let i = 0; i < base64Data.length; i += CHUNK_SIZE) {
    chunks.push(base64Data.slice(i, i + CHUNK_SIZE));
  }

  let result = "";
  for (let i = 0; i < chunks.length; i++) {
    const more = i < chunks.length - 1 ? 1 : 0;
    if (i === 0) {
      result += `\x1b_Gq=2,a=T,U=1,f=100,i=${opts.id},c=${opts.cols},r=${opts.rows},m=${more};${chunks[i]}\x1b\\`;
    } else {
      result += `\x1b_Gm=${more};${chunks[i]}\x1b\\`;
    }
  }
  return result;
}

export function encodeKittyGraphicsDelete(imageId: number): string {
  return `\x1b_Ga=d,d=I,i=${imageId}\x1b\\`;
}

interface PlaceholderCell {
  char: string;
  imageId: number;
}

export function buildPlaceholderGrid(cols: number, rows: number, imageId: number): PlaceholderCell[][] {
  const grid: PlaceholderCell[][] = [];
  for (let row = 0; row < rows; row++) {
    const line: PlaceholderCell[] = [];
    for (let col = 0; col < cols; col++) {
      const base = String.fromCodePoint(PLACEHOLDER_BASE);
      const rowDiac = String.fromCodePoint(DIACRITICS[row % DIACRITICS.length]);
      const colDiac = String.fromCodePoint(DIACRITICS[col % DIACRITICS.length]);
      line.push({ char: base + rowDiac + colDiac, imageId });
    }
    grid.push(line);
  }
  return grid;
}
```

- [ ] **Step 4: Create ImageWidget StatefulWidget**

```ts
// packages/tui/src/widgets/image-widget.ts
// 逆向: VQT (image state) + YQT (render object) in misc_utils.js

import { StatefulWidget, State } from "../framework";
import { RenderBox } from "../render-object";
import { encodeKittyGraphicsTransmit, encodeKittyGraphicsDelete, buildPlaceholderGrid } from "../render-object/render-image";

let _nextImageId = 1;
function allocateImageId(): number {
  const id = _nextImageId;
  _nextImageId = (_nextImageId % 255) + 1;
  return id;
}

export class ImageWidget extends StatefulWidget {
  constructor(
    public readonly base64Data: string,
    public readonly mediaType: string,
    public readonly width?: number,
    public readonly height?: number,
  ) {
    super();
  }
  createState() { return new ImageWidgetState(); }
}

class ImageWidgetState extends State<ImageWidget> {
  private _imageId = 0;
  private _transmitted = false;

  initState() {
    super.initState();
    this._imageId = allocateImageId();
  }

  dispose() {
    // Delete image from terminal on dispose
    if (this._transmitted) {
      // queue deletion sequence
    }
    super.dispose();
  }

  build() {
    return new RenderImageProxy(this.widget.base64Data, this._imageId, this.widget.width, this.widget.height);
  }
}
```

- [ ] **Step 5: Run tests, commit**

```bash
git add packages/tui/src/render-object/render-image.ts packages/tui/src/widgets/image-widget.ts packages/tui/src/widgets/__tests__/image-widget.test.ts
git commit -m "feat(tui): Kitty Graphics ImageWidget with APC chunked protocol (GAP-TUI-01)"
```

---

## Task 2: Clipboard image paste (GAP-TUI-20)

**Files:**
- Create: `packages/tui/src/selection/clipboard-image.ts`
- Test: `packages/tui/src/selection/__tests__/clipboard-image.test.ts`

- [ ] **Step 1: Write failing test for platform detection**

```ts
import { detectImageClipboardMethod } from "../clipboard-image";

describe("ClipboardImage", () => {
  test("macOS uses osascript", () => {
    const method = detectImageClipboardMethod("darwin", {});
    expect(method).toBe("osascript");
  });

  test("Linux with WAYLAND_DISPLAY uses wl-paste", () => {
    const method = detectImageClipboardMethod("linux", { WAYLAND_DISPLAY: "wayland-0" });
    expect(method).toBe("wl-paste");
  });

  test("Linux with DISPLAY uses xclip", () => {
    const method = detectImageClipboardMethod("linux", { DISPLAY: ":0" });
    expect(method).toBe("xclip");
  });

  test("WSL uses powershell", () => {
    const method = detectImageClipboardMethod("linux", { WSL_DISTRO_NAME: "Ubuntu" });
    expect(method).toBe("wsl");
  });

  test("win32 uses powershell", () => {
    const method = detectImageClipboardMethod("win32", {});
    expect(method).toBe("powershell");
  });

  test("unknown platform returns null", () => {
    const method = detectImageClipboardMethod("freebsd", {});
    expect(method).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement clipboard-image.ts**

```ts
// packages/tui/src/selection/clipboard-image.ts
// 逆向: VTR function (chunk-004.js:32090) — per-platform clipboard image dispatch

import { execSync, spawnSync } from "child_process";
import { tmpdir } from "os";
import { join } from "path";
import { writeFileSync, readFileSync, unlinkSync, existsSync } from "fs";
import { randomUUID } from "crypto";

export type ClipboardImageMethod = "osascript" | "wl-paste" | "xclip" | "wsl" | "powershell";

const IMAGE_FORMATS = [
  { ext: "png", osascriptClass: "«class PNGf»", mimeType: "image/png" },
  { ext: "jpg", osascriptClass: "«class JPEG»", mimeType: "image/jpeg" },
  { ext: "gif", osascriptClass: "«class GIFf»", mimeType: "image/gif" },
] as const;

export function detectImageClipboardMethod(
  platform: string,
  env: Record<string, string | undefined>,
): ClipboardImageMethod | null {
  if (platform === "darwin") return "osascript";
  if (platform === "win32") return "powershell";
  if (platform === "linux") {
    if (env.WSL_DISTRO_NAME) return "wsl";
    if (env.WAYLAND_DISPLAY) return "wl-paste";
    if (env.DISPLAY) return "xclip";
  }
  return null;
}

/** Read image from clipboard. Returns { path, mimeType } or null. */
export async function readClipboardImage(): Promise<{ path: string; mimeType: string } | null> {
  const method = detectImageClipboardMethod(process.platform, process.env as Record<string, string>);
  if (!method) return null;

  try {
    switch (method) {
      case "osascript": return readOsascript();
      case "wl-paste": return readWlPaste();
      case "xclip": return readXclip();
      case "powershell": return readPowerShell();
      case "wsl": return readWSL();
    }
  } catch {
    return null;
  }
}

function readOsascript(): { path: string; mimeType: string } | null {
  // 逆向: jN0 (chunk-004.js) — tries PNG, JPEG, GIF via AppleScript
  for (const fmt of IMAGE_FORMATS) {
    if (!fmt.osascriptClass) continue;
    const tmpFile = join(tmpdir(), `flitter-paste-${randomUUID()}.${fmt.ext}`);
    try {
      const script = `set theImage to the clipboard as ${fmt.osascriptClass}\nset theFile to open for access POSIX file "${tmpFile}" with write permission\nwrite theImage to theFile\nclose access theFile\nreturn "${tmpFile}"`;
      execSync(`osascript -e '${script}'`, { timeout: 5000, stdio: "pipe" });
      if (existsSync(tmpFile)) return { path: tmpFile, mimeType: fmt.mimeType };
    } catch { /* try next format */ }
  }
  return null;
}

function readWlPaste(): { path: string; mimeType: string } | null {
  // 逆向: SN0 — wl-paste --type image/png
  for (const fmt of IMAGE_FORMATS) {
    const tmpFile = join(tmpdir(), `flitter-paste-${randomUUID()}.${fmt.ext}`);
    try {
      const result = spawnSync("wl-paste", ["--type", fmt.mimeType, "--no-newline"], {
        timeout: 5000, maxBuffer: 50 * 1024 * 1024,
      });
      if (result.status === 0 && result.stdout.length > 0) {
        writeFileSync(tmpFile, result.stdout);
        return { path: tmpFile, mimeType: fmt.mimeType };
      }
    } catch { /* try next */ }
  }
  return null;
}

function readXclip(): { path: string; mimeType: string } | null {
  // 逆向: ON0 — xclip -selection clipboard -t image/png -o
  for (const fmt of IMAGE_FORMATS) {
    const tmpFile = join(tmpdir(), `flitter-paste-${randomUUID()}.${fmt.ext}`);
    try {
      const result = spawnSync("xclip", ["-selection", "clipboard", "-t", fmt.mimeType, "-o"], {
        timeout: 5000, maxBuffer: 50 * 1024 * 1024,
      });
      if (result.status === 0 && result.stdout.length > 0) {
        writeFileSync(tmpFile, result.stdout);
        return { path: tmpFile, mimeType: fmt.mimeType };
      }
    } catch { /* try next */ }
  }
  return null;
}

function readPowerShell(): { path: string; mimeType: string } | null {
  // 逆向: dN0/fN0 — PowerShell clipboard image read
  const script = `Add-Type -AssemblyName System.Windows.Forms;Add-Type -AssemblyName System.Drawing;if(-not [System.Windows.Forms.Clipboard]::ContainsImage()){exit 2};$i=[System.Windows.Forms.Clipboard]::GetImage();$t=Join-Path([System.IO.Path]::GetTempPath())("flitter-paste-$([System.Guid]::NewGuid().ToString('N')).png");$i.Save($t,[System.Drawing.Imaging.ImageFormat]::Png);Write-Output $t`;
  try {
    const result = execSync(`powershell.exe -NoProfile -STA -Command "${script}"`, {
      timeout: 10000, encoding: "utf-8",
    });
    const path = result.trim();
    if (path && existsSync(path)) return { path, mimeType: "image/png" };
  } catch { /* no image */ }
  return null;
}

function readWSL(): { path: string; mimeType: string } | null {
  // 逆向: EN0 — PowerShell via WSL + wslpath conversion
  const psResult = readPowerShell();
  if (!psResult) return null;
  try {
    const linuxPath = execSync(`wslpath -u "${psResult.path}"`, { encoding: "utf-8" }).trim();
    const tmpFile = join(tmpdir(), `flitter-paste-${randomUUID()}.png`);
    const data = readFileSync(linuxPath);
    writeFileSync(tmpFile, data);
    try { unlinkSync(linuxPath); } catch { /* ignore */ }
    return { path: tmpFile, mimeType: "image/png" };
  } catch { return null; }
}
```

- [ ] **Step 4: Wire into command-palette-provider.ts**

Replace the no-op `() => {}` for `prompt-paste-image` with a call to `readClipboardImage()` that converts the result to a base64 image attachment on the current message.

- [ ] **Step 5: Run tests, commit**

```bash
git add packages/tui/src/selection/clipboard-image.ts packages/tui/src/selection/__tests__/clipboard-image.test.ts packages/cli/src/widgets/command-palette-provider.ts
git commit -m "feat(tui): multi-platform clipboard image paste (GAP-TUI-20)"
```

---

## Task 3: Chart RenderObject — data structures and bar chart (GAP-TUI-25)

**Files:**
- Create: `packages/tui/src/render-object/render-chart.ts`
- Test: `packages/tui/src/render-object/__tests__/render-chart.test.ts`

- [ ] **Step 1: Write failing test for bar chart rendering**

```ts
import { RenderChart, type ChartData } from "../render-chart";

describe("RenderChart", () => {
  test("bar chart renders correct height for simple data", () => {
    const data: ChartData = {
      chartType: "bar",
      series: [{ label: "A", values: [10, 20, 30] }],
      xLabels: ["x1", "x2", "x3"],
    };
    const chart = new RenderChart(data);
    const lines = chart.renderToLines(40, 10);
    expect(lines.length).toBe(10);
    // Tallest bar (30) should use full block at top
    expect(lines.some(l => l.includes("█"))).toBe(true);
  });

  test("horizontal-bar chart renders horizontally", () => {
    const data: ChartData = {
      chartType: "horizontal-bar",
      series: [{ label: "A", values: [50, 100] }],
      xLabels: ["row1", "row2"],
    };
    const chart = new RenderChart(data);
    const lines = chart.renderToLines(40, 6);
    expect(lines.length).toBe(6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement core chart data types and bar rendering**

```ts
// packages/tui/src/render-object/render-chart.ts
// 逆向: uRR (misc_utils.js:4227-4382), rU0 (bar), aL (y-axis), AU0 (x-axis)

import { Color } from "../theme/color";

export interface ChartSeries {
  label: string;
  values: number[];
}

export interface ChartData {
  chartType: "bar" | "stacked-bar" | "line" | "sparkline" | "stacked-area" | "horizontal-bar";
  series: ChartSeries[];
  xLabels?: string[];
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  valueFormatter?: (v: number) => string;
}

// 逆向: QrT — default chart colors (data_structures.js:117)
const DEFAULT_COLORS: Color[] = [
  Color.index(2),  // green
  Color.index(5),  // magenta
  Color.index(6),  // cyan
  Color.index(3),  // yellow
  Color.index(4),  // blue
  Color.index(1),  // red
  Color.index(10), // bright green
  Color.index(14), // bright cyan
];

// 逆向: ue array — ANSI block chars for sub-cell vertical fill
const BLOCK_CHARS = ["█", "▇", "▆", "▅", "▄", "▃", "▂", "▁"];

// Layout constants matching amp: QN0, ZN0, JN0, lgT, TU0, ra, bRR
const Y_AXIS_WIDTH = 8;      // ra = 8
const X_AXIS_HEIGHT = 2;     // lgT = 2
const MIN_HEIGHT = 10;       // QN0 = 10
const MAX_HEIGHT = 35;       // ZN0 = 35
const HBAR_LABEL_WIDTH = 20; // bRR = 20

export class RenderChart {
  readonly data: ChartData;
  readonly colors: Color[];

  constructor(data: ChartData, colors?: Color[]) {
    this.data = data;
    this.colors = colors ?? DEFAULT_COLORS;
  }

  renderToLines(width: number, height: number): string[] {
    switch (this.data.chartType) {
      case "bar": return this._renderBar(width, height, false);
      case "stacked-bar": return this._renderBar(width, height, true);
      case "horizontal-bar": return this._renderHorizontalBar(width, height);
      case "line":
      case "sparkline": return this._renderLine(width, height, false);
      case "stacked-area": return this._renderLine(width, height, true);
      default: return [`Unsupported chart type: ${this.data.chartType}`];
    }
  }

  private _renderBar(width: number, height: number, stacked: boolean): string[] {
    const { series, xLabels } = this.data;
    const chartW = width - Y_AXIS_WIDTH;
    const chartH = height - X_AXIS_HEIGHT;
    if (chartW < 1 || chartH < 1) return [];

    const numBars = series[0]?.values.length ?? 0;
    const barWidth = Math.max(1, Math.floor(chartW / numBars));

    // Compute max value
    let maxVal = 0;
    for (let i = 0; i < numBars; i++) {
      if (stacked) {
        let sum = 0;
        for (const s of series) sum += Math.abs(s.values[i] ?? 0);
        maxVal = Math.max(maxVal, sum);
      } else {
        for (const s of series) maxVal = Math.max(maxVal, Math.abs(s.values[i] ?? 0));
      }
    }
    if (maxVal === 0) maxVal = 1;

    // Render grid top-to-bottom
    const lines: string[] = [];
    for (let row = 0; row < chartH; row++) {
      const threshold = ((chartH - row) / chartH) * maxVal;
      const prevThreshold = ((chartH - row + 1) / chartH) * maxVal;
      let line = "";

      // Y-axis label (top, mid, bottom)
      if (row === 0) line += this._padYLabel(maxVal);
      else if (row === Math.floor(chartH / 2)) line += this._padYLabel(maxVal / 2);
      else if (row === chartH - 1) line += this._padYLabel(0);
      else line += " ".repeat(Y_AXIS_WIDTH);

      for (let i = 0; i < numBars && line.length < width; i++) {
        const val = stacked
          ? series.reduce((s, sr) => s + Math.abs(sr.values[i] ?? 0), 0)
          : Math.abs(series[0]?.values[i] ?? 0);

        if (val >= threshold) {
          line += "█".repeat(Math.min(barWidth, width - line.length));
        } else if (val >= prevThreshold) {
          const frac = (val - prevThreshold) / (threshold - prevThreshold);
          const idx = Math.min(BLOCK_CHARS.length - 1, Math.floor((1 - frac) * BLOCK_CHARS.length));
          line += BLOCK_CHARS[idx] + " ".repeat(Math.max(0, barWidth - 1));
        } else {
          line += " ".repeat(Math.min(barWidth, width - line.length));
        }
      }
      lines.push(line.slice(0, width));
    }

    // X-axis
    let xLine = " ".repeat(Y_AXIS_WIDTH);
    if (xLabels) {
      for (let i = 0; i < numBars && xLine.length < width; i++) {
        const label = (xLabels[i] ?? "").slice(0, barWidth);
        xLine += label + " ".repeat(Math.max(0, barWidth - label.length));
      }
    }
    lines.push(xLine.slice(0, width));
    lines.push(""); // padding

    return lines;
  }

  private _renderHorizontalBar(width: number, height: number): string[] {
    const { series, xLabels } = this.data;
    const numBars = series[0]?.values.length ?? 0;
    const barArea = width - HBAR_LABEL_WIDTH;
    if (barArea < 1) return [];

    let maxVal = 0;
    for (const s of series) for (const v of s.values) maxVal = Math.max(maxVal, Math.abs(v));
    if (maxVal === 0) maxVal = 1;

    const lines: string[] = [];
    for (let i = 0; i < numBars && lines.length < height; i++) {
      const val = Math.abs(series[0]?.values[i] ?? 0);
      const label = (xLabels?.[i] ?? `${i}`).slice(0, HBAR_LABEL_WIDTH - 2);
      const barLen = Math.round((val / maxVal) * barArea);
      lines.push(label.padEnd(HBAR_LABEL_WIDTH) + "█".repeat(barLen));
    }
    return lines;
  }

  private _renderLine(width: number, height: number, stacked: boolean): string[] {
    // 逆向: oU0/cU0 — braille grid rendering
    const chartW = width - Y_AXIS_WIDTH;
    const chartH = height - X_AXIS_HEIGHT;
    if (chartW < 1 || chartH < 1) return [];

    // Braille: 2x horizontal, 4x vertical sub-cell resolution
    const dotW = chartW * 2;
    const dotH = chartH * 4;

    // Initialize braille dot grid
    const grid: number[][] = [];
    for (let r = 0; r < chartH; r++) {
      grid.push(new Array(chartW).fill(0));
    }

    const { series } = this.data;
    let maxVal = 0;
    if (stacked) {
      const numPts = series[0]?.values.length ?? 0;
      for (let i = 0; i < numPts; i++) {
        let sum = 0;
        for (const s of series) sum += Math.abs(s.values[i] ?? 0);
        maxVal = Math.max(maxVal, sum);
      }
    } else {
      for (const s of series) for (const v of s.values) maxVal = Math.max(maxVal, Math.abs(v));
    }
    if (maxVal === 0) maxVal = 1;

    // Braille dot bit positions: [row%4][col%2]
    const BRAILLE_BITS = [[1, 8], [2, 16], [4, 32], [64, 128]];

    // Plot each series
    for (const s of series) {
      const numPts = s.values.length;
      for (let i = 0; i < numPts - 1; i++) {
        const x0 = Math.round((i / (numPts - 1)) * (dotW - 1));
        const y0 = Math.round((1 - s.values[i] / maxVal) * (dotH - 1));
        const x1 = Math.round(((i + 1) / (numPts - 1)) * (dotW - 1));
        const y1 = Math.round((1 - s.values[i + 1] / maxVal) * (dotH - 1));

        // Bresenham line between (x0,y0) and (x1,y1)
        const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let err = dx - dy, cx = x0, cy = y0;

        while (true) {
          const cellR = Math.floor(cy / 4);
          const cellC = Math.floor(cx / 2);
          if (cellR >= 0 && cellR < chartH && cellC >= 0 && cellC < chartW) {
            grid[cellR][cellC] |= BRAILLE_BITS[cy % 4][cx % 2];
          }
          if (cx === x1 && cy === y1) break;
          const e2 = 2 * err;
          if (e2 > -dy) { err -= dy; cx += sx; }
          if (e2 < dx) { err += dx; cy += sy; }
        }
      }
    }

    // Convert grid to braille characters
    const BRAILLE_BASE = 0x2800;
    const lines: string[] = [];
    for (let r = 0; r < chartH; r++) {
      let yLabel = "";
      if (r === 0) yLabel = this._padYLabel(maxVal);
      else if (r === chartH - 1) yLabel = this._padYLabel(0);
      else yLabel = " ".repeat(Y_AXIS_WIDTH);

      let line = yLabel;
      for (let c = 0; c < chartW; c++) {
        line += String.fromCharCode(BRAILLE_BASE + grid[r][c]);
      }
      lines.push(line.slice(0, width));
    }

    // X-axis
    lines.push(" ".repeat(Y_AXIS_WIDTH) + (this.data.xLabels?.join("  ") ?? "").slice(0, width - Y_AXIS_WIDTH));
    lines.push("");
    return lines;
  }

  private _padYLabel(value: number): string {
    const fmt = this.data.valueFormatter ?? ((v) => v % 1 === 0 ? `${v}` : v.toFixed(1));
    return (fmt(value) + " ┤").padStart(Y_AXIS_WIDTH);
  }
}
```

- [ ] **Step 4: Run tests, commit**

```bash
git add packages/tui/src/render-object/render-chart.ts packages/tui/src/render-object/__tests__/render-chart.test.ts
git commit -m "feat(tui): RenderChart with bar/line/area/horizontal-bar via braille (GAP-TUI-25)"
```

---

## Task 4: Wire chart into ConversationView

**Files:**
- Modify: `packages/cli/src/widgets/display-items.ts` (chart tool result → chart widget)
- Modify: `packages/cli/src/widgets/conversation-view.ts` (render chart output)

- [ ] **Step 1: Add chart display item type and wire tool result to RenderChart**

In `display-items.ts`, when processing `chart` tool results with `success: true`, extract chart data and create a display item that carries the `ChartData`.

In `conversation-view.ts`, render the chart display item using `RenderChart.renderToLines()` and output as `RichText` spans.

- [ ] **Step 2: Test with a real chart tool result by running flitter and asking it to generate a chart**

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/widgets/display-items.ts packages/cli/src/widgets/conversation-view.ts
git commit -m "feat(cli): wire chart tool results to RenderChart widget (GAP-TUI-25)"
```

---

## Task 5: Update GAPS.md

- [ ] **Step 1: Mark GAP-TUI-01, GAP-TUI-20, GAP-TUI-25 as closed**
- [ ] **Step 2: Commit**

```bash
git add GAPS.md
git commit -m "docs: close GAP-TUI-01, GAP-TUI-20, GAP-TUI-25 — image display, clipboard, chart"
```
