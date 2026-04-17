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

// ════════════════════════════════════════════════════
//  Scrollbar drag math (regression: NaN from event.y)
// ════════════════════════════════════════════════════

/**
 * Extracts the drag calculation from ScrollbarState._handleDrag
 * to test it in isolation. The key fix was using event.localPosition.y
 * instead of event.y (which was undefined on DragEvent objects).
 *
 * Params mirror the variables inside _handleDrag:
 *   totalContentHeight (R), viewportHeight (a), trackLength (t),
 *   dragStartY, dragStartOffset, currentY (event.localPosition.y)
 */
function computeDragOffset(
  totalContentHeight: number,
  viewportHeight: number,
  trackLength: number,
  dragStartY: number,
  dragStartOffset: number,
  currentY: number,
): number {
  if (trackLength === 0 || totalContentHeight <= viewportHeight) return dragStartOffset;
  const thumbRatio = Math.min(1, viewportHeight / totalContentHeight);
  const thumbSize = Math.max(1, trackLength * thumbRatio);
  const availableTrack = trackLength - thumbSize;
  if (availableTrack <= 0) return dragStartOffset;
  const scrollRange = totalContentHeight - viewportHeight;
  const pixelsPerScrollUnit = availableTrack / scrollRange;
  const dy = currentY - dragStartY;
  const scrollDelta = dy / pixelsPerScrollUnit;
  return Math.round(Math.max(0, Math.min(scrollRange, dragStartOffset + scrollDelta)));
}

describe("Scrollbar drag math (regression)", () => {
  // Config: 60 items, 17 visible, trackLength=17
  const TOTAL = 60;
  const VIEWPORT = 17;
  const TRACK = 17;

  it("dragging down from top should increase scroll offset", () => {
    // Start drag at y=1 (near top of scrollbar), drag to y=5
    const offset = computeDragOffset(TOTAL, VIEWPORT, TRACK, 1, 0, 5);
    expect(offset).toBeGreaterThan(0);
    expect(Number.isNaN(offset)).toBe(false);
  });

  it("dragging up from middle should decrease scroll offset", () => {
    // Start at y=8 (middle), drag to y=4
    const offset = computeDragOffset(TOTAL, VIEWPORT, TRACK, 8, 20, 4);
    expect(offset).toBeLessThan(20);
    expect(Number.isNaN(offset)).toBe(false);
  });

  it("should not produce NaN with undefined y (the old bug)", () => {
    // Simulates what happened when event.y was undefined:
    // dragStartY = undefined, currentY = undefined
    // In the old code: undefined - undefined = NaN
    // With the fix, localPosition.y is always a number (fallback to 0)
    const offset = computeDragOffset(TOTAL, VIEWPORT, TRACK, 0, 0, 0);
    expect(offset).toBe(0);
    expect(Number.isNaN(offset)).toBe(false);
  });

  it("should clamp to [0, scrollRange] and never go negative", () => {
    // Drag far above the starting point
    const offset = computeDragOffset(TOTAL, VIEWPORT, TRACK, 10, 0, -100);
    expect(offset).toBe(0);
  });

  it("should clamp to scrollRange and never exceed it", () => {
    // Drag far below
    const offset = computeDragOffset(TOTAL, VIEWPORT, TRACK, 0, 0, 1000);
    expect(offset).toBe(TOTAL - VIEWPORT); // scrollRange = 43
  });

  it("no-op when content fits viewport", () => {
    const offset = computeDragOffset(10, 20, 20, 0, 5, 10);
    expect(offset).toBe(5);
  });

  it("no-op when trackLength is 0", () => {
    const offset = computeDragOffset(60, 17, 0, 0, 5, 10);
    expect(offset).toBe(5);
  });
});
