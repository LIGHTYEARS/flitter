import { describe, expect, it } from "bun:test";

// Test the scrollbar metrics calculation in isolation
// (same logic as RenderScrollbar._calculateMetrics)
interface ScrollbarMetrics {
  showScrollbar: boolean;
  thumbStartFloat: number;
  thumbEndFloat: number;
}

function calculateScrollbarMetrics(
  totalContent: number,
  viewport: number,
  scrollOffset: number,
  trackLength: number,
): ScrollbarMetrics {
  if (totalContent <= viewport || trackLength <= 0) {
    return { showScrollbar: false, thumbStartFloat: 0, thumbEndFloat: 0 };
  }
  const scrollFraction = Math.max(0, Math.min(1, scrollOffset / (totalContent - viewport)));
  const thumbRatio = Math.min(1, viewport / totalContent);
  const thumbSize = Math.max(1, trackLength * thumbRatio);
  const availableTrack = trackLength - thumbSize;
  const thumbStartFloat = Math.max(0, availableTrack * scrollFraction);
  const thumbEndFloat = thumbStartFloat + thumbSize;
  return { showScrollbar: true, thumbStartFloat, thumbEndFloat };
}

describe("Scrollbar metrics", () => {
  it("hides scrollbar when content fits viewport", () => {
    const m = calculateScrollbarMetrics(10, 20, 0, 20);
    expect(m.showScrollbar).toBe(false);
  });

  it("hides scrollbar when content equals viewport", () => {
    const m = calculateScrollbarMetrics(20, 20, 0, 20);
    expect(m.showScrollbar).toBe(false);
  });

  it("shows scrollbar when content exceeds viewport", () => {
    const m = calculateScrollbarMetrics(100, 20, 0, 20);
    expect(m.showScrollbar).toBe(true);
  });

  it("thumb is at top when scrollOffset=0", () => {
    const m = calculateScrollbarMetrics(100, 20, 0, 20);
    expect(m.thumbStartFloat).toBe(0);
    expect(m.thumbStartFloat).toBeCloseTo(0);
  });

  it("thumb is at bottom when fully scrolled", () => {
    const m = calculateScrollbarMetrics(100, 20, 80, 20);
    // thumbSize = max(1, 20 * 20/100) = 4; availableTrack = 16; thumbStart = 16
    expect(m.thumbStartFloat).toBeCloseTo(16);
    expect(m.thumbEndFloat).toBeCloseTo(20);
  });

  it("thumb size = max(1, trackLength * viewport/total)", () => {
    const m = calculateScrollbarMetrics(100, 20, 0, 20);
    // thumbSize = 20 * 20/100 = 4
    const expectedThumbSize = 4;
    expect(m.thumbEndFloat - m.thumbStartFloat).toBeCloseTo(expectedThumbSize);
  });

  it("thumb stays within track with minimal content", () => {
    const m = calculateScrollbarMetrics(21, 20, 1, 10);
    expect(m.thumbStartFloat).toBeGreaterThanOrEqual(0);
    expect(m.thumbEndFloat).toBeLessThanOrEqual(10);
  });
});

describe("Scrollbar block element selection", () => {
  const BLOCKS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

  function getThumbStartChar(thumbStart: number, row: number): string {
    if (Math.floor(thumbStart) !== row) return "—";
    const fraction = 1 - (thumbStart - row);
    const idx = Math.floor(fraction * 8);
    return BLOCKS[idx] ?? "█";
  }

  it("full thumb start (thumbStart=2.0) gives '█'", () => {
    expect(getThumbStartChar(2.0, 2)).toBe("█");
  });

  it("half-way thumb start (thumbStart=2.5) gives '▅'", () => {
    // fraction = 1 - 0.5 = 0.5; idx = floor(0.5*8)=4 → '▅'
    expect(getThumbStartChar(2.5, 2)).toBe("▅");
  });

  it("quarter thumb start (thumbStart=2.75) gives lower block", () => {
    // fraction = 1 - 0.75 = 0.25; idx = floor(0.25*8)=2 → '▃'
    expect(getThumbStartChar(2.75, 2)).toBe("▃");
  });
});
