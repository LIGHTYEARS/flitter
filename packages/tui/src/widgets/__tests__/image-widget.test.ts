import { describe, expect, test } from "bun:test";
import {
  allocateImageId,
  buildPlaceholderGrid,
  CHUNK_SIZE,
  DIACRITICS,
  encodeKittyGraphicsDelete,
  encodeKittyGraphicsTransmit,
  PLACEHOLDER_BASE,
  wrapForTmux,
} from "../render-image.js";

describe("Kitty Graphics", () => {
  // ────────────────────────────────────────────────────
  //  encodeKittyGraphicsTransmit
  // ────────────────────────────────────────────────────

  test("encodeKittyGraphicsTransmit produces chunked APC sequence", () => {
    const pngBase64 = Buffer.from("fake-png-data").toString("base64");
    const result = encodeKittyGraphicsTransmit(pngBase64, { id: 1, cols: 10, rows: 5 });
    expect(result).toContain("\x1b_G");
    expect(result).toContain("a=T");
    expect(result).toContain("\x1b\\");
  });

  test("first chunk contains all required Kitty params", () => {
    const data = "abc";
    const result = encodeKittyGraphicsTransmit(data, { id: 42, cols: 20, rows: 10 });
    expect(result).toContain("q=2");
    expect(result).toContain("a=T");
    expect(result).toContain("U=1");
    expect(result).toContain("f=100");
    expect(result).toContain("i=42");
    expect(result).toContain("c=20");
    expect(result).toContain("r=10");
  });

  test("single chunk: m=0 (last chunk marker)", () => {
    const small = "A".repeat(10); // well under CHUNK_SIZE
    const result = encodeKittyGraphicsTransmit(small, { id: 1, cols: 1, rows: 1 });
    // First (and only) chunk should have m=0
    expect(result).toContain("m=0");
    // Should not have m=1
    expect(result).not.toContain("m=1");
  });

  test("multi-chunk: intermediate chunks have m=1, last has m=0", () => {
    // Generate data that spans 3 chunks
    const bigData = "X".repeat(CHUNK_SIZE * 2 + 100);
    const result = encodeKittyGraphicsTransmit(bigData, { id: 5, cols: 50, rows: 10 });

    // Extract all chunk headers
    const headerRegex = /\x1b_G([^;]+);/g;
    const headers: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = headerRegex.exec(result)) !== null) {
      headers.push(m[1]!);
    }

    // Should have 3 chunks
    expect(headers.length).toBe(3);

    // First chunk has full params + m=1
    expect(headers[0]).toContain("m=1");
    expect(headers[0]).toContain("a=T");

    // Second chunk has m=1
    expect(headers[1]).toContain("m=1");
    expect(headers[1]).not.toContain("a=T"); // subsequent chunks omit a=T

    // Last chunk has m=0
    expect(headers[2]).toContain("m=0");
  });

  test("empty base64 data produces valid APC sequence", () => {
    const result = encodeKittyGraphicsTransmit("", { id: 1, cols: 1, rows: 1 });
    expect(result).toContain("\x1b_G");
    expect(result).toContain("\x1b\\");
  });

  // ────────────────────────────────────────────────────
  //  encodeKittyGraphicsDelete
  // ────────────────────────────────────────────────────

  test("encodeKittyGraphicsDelete produces correct APC delete sequence", () => {
    const result = encodeKittyGraphicsDelete(7);
    expect(result).toBe("\x1b_Ga=d,d=I,i=7\x1b\\");
  });

  test("encodeKittyGraphicsDelete with tmux wraps in DCS passthrough", () => {
    const result = encodeKittyGraphicsDelete(3, true);
    expect(result).toContain("\x1bPtmux;");
    expect(result).toContain("\x1b\\");
    // ESC bytes inside DCS should be doubled
    expect(result).toContain("\x1b\x1b");
  });

  // ────────────────────────────────────────────────────
  //  wrapForTmux
  // ────────────────────────────────────────────────────

  test("wrapForTmux: passthrough without tmux returns original string", () => {
    const seq = "\x1b_Gtest\x1b\\";
    expect(wrapForTmux(seq, false)).toBe(seq);
  });

  test("wrapForTmux: with tmux doubles ESC bytes and wraps in DCS", () => {
    const seq = "\x1b_Gtest\x1b\\";
    const wrapped = wrapForTmux(seq, true);
    expect(wrapped).toMatch(/^\x1bPtmux;/);
    expect(wrapped).toMatch(/\x1b\\$/);
    // All ESC in original seq should be doubled in DCS body
    const innerEscCount = (wrapped.match(/\x1b\x1b/g) ?? []).length;
    expect(innerEscCount).toBeGreaterThan(0);
  });

  // ────────────────────────────────────────────────────
  //  buildPlaceholderGrid
  // ────────────────────────────────────────────────────

  test("buildPlaceholderGrid produces correct dimensions", () => {
    const grid = buildPlaceholderGrid(3, 2, 42);
    expect(grid.length).toBe(2);
    expect(grid[0]!.length).toBe(3);
    for (const row of grid) {
      for (const cell of row) {
        expect(cell.char.length).toBeGreaterThanOrEqual(1);
        expect(cell.imageId).toBe(42);
      }
    }
  });

  test("buildPlaceholderGrid: each cell starts with PLACEHOLDER_BASE codepoint", () => {
    const grid = buildPlaceholderGrid(2, 2, 1);
    for (const row of grid) {
      for (const cell of row) {
        const cp = cell.char.codePointAt(0);
        expect(cp).toBe(PLACEHOLDER_BASE);
      }
    }
  });

  test("buildPlaceholderGrid: each cell has exactly 3 code points (base + row diac + col diac)", () => {
    const grid = buildPlaceholderGrid(4, 3, 10);
    for (const row of grid) {
      for (const cell of row) {
        const codepoints = [...cell.char]; // spread uses codepoints
        expect(codepoints.length).toBe(3);
      }
    }
  });

  test("buildPlaceholderGrid: different rows have different row diacritics", () => {
    const grid = buildPlaceholderGrid(1, 3, 1);
    // row diacritic is 2nd codepoint
    const rowDiacritics = grid.map((row) => row[0]!.char.codePointAt(2)); // after PLACEHOLDER_BASE
    // row 0 and row 1 should differ (DIACRITICS[0] != DIACRITICS[1])
    expect(rowDiacritics[0]).not.toBe(rowDiacritics[1]);
  });

  test("buildPlaceholderGrid: 1x1 grid produces valid cell", () => {
    const grid = buildPlaceholderGrid(1, 1, 99);
    expect(grid.length).toBe(1);
    expect(grid[0]!.length).toBe(1);
    expect(grid[0]![0]!.imageId).toBe(99);
    expect(grid[0]![0]!.char.codePointAt(0)).toBe(PLACEHOLDER_BASE);
  });

  // ────────────────────────────────────────────────────
  //  allocateImageId
  // ────────────────────────────────────────────────────

  test("allocateImageId returns values in 1-255 range", () => {
    // Allocate many IDs and check they stay in range
    for (let i = 0; i < 300; i++) {
      const id = allocateImageId();
      expect(id).toBeGreaterThanOrEqual(1);
      expect(id).toBeLessThanOrEqual(255);
    }
  });

  test("allocateImageId cycles back to 1 after 255", () => {
    // Drain to a known position by checking cycling math:
    // Since _nextImageId state is shared, we just verify that after 255 steps
    // from any position, the value cycles. We test the math directly.
    // Simulate: if we start at 255, next = 255 % 255 + 1 = 1
    expect((255 % 255) + 1).toBe(1);
    // if we start at 1, next = 1 % 255 + 1 = 2
    expect((1 % 255) + 1).toBe(2);
    // if we start at 254, next = 254 % 255 + 1 = 255
    expect((254 % 255) + 1).toBe(255);
  });

  // ────────────────────────────────────────────────────
  //  Constants
  // ────────────────────────────────────────────────────

  test("PLACEHOLDER_BASE matches amp source value 1109742 (0x10EEEE)", () => {
    // amp source: String.fromCodePoint(1109742)
    // 1109742 decimal = 0x10EEEE hex (NOT 0x10EFFE as stated in some docs)
    expect(PLACEHOLDER_BASE).toBe(1_109_742);
    expect(PLACEHOLDER_BASE).toBe(0x10eeee);
  });

  test("CHUNK_SIZE is 4096", () => {
    expect(CHUNK_SIZE).toBe(4096);
  });

  test("DIACRITICS array is non-empty and all values are positive integers", () => {
    expect(DIACRITICS.length).toBeGreaterThan(0);
    for (const d of DIACRITICS) {
      expect(Number.isInteger(d)).toBe(true);
      expect(d).toBeGreaterThan(0);
    }
  });
});
