// Tests for overlay-related debugging gaps:
//
// BUG-A — buildOverlays does NOT insert a modal mask Container.
//          A single modal entry should produce exactly 2 Stack children
//          (base + overlay), not 3 (base + mask + overlay).
//
// BUG-1 — CommandPalette borderedPanel must have an opaque background
//          (BoxDecoration with color: Color.black) so content underneath
//          does not bleed through.
//
// BUG-passthrough — buildOverlays returns baseContent directly (same
//          reference, no Stack wrapper) when no overlays are active.

import { describe, test, expect } from 'bun:test';
import { OverlayManager } from '../state/overlay-manager';
import { Text } from '../../../flitter-core/src/widgets/text';
import { Stack } from '../../../flitter-core/src/widgets/stack';

// ---------------------------------------------------------------------------
// BUG-A — buildOverlays must NOT insert a modal mask
// ---------------------------------------------------------------------------

describe('BUG-A: buildOverlays does not insert a modal mask', () => {
  /**
   * When a single modal overlay entry is active, buildOverlays should return
   * a Stack with exactly 2 children: the base content and the Positioned
   * overlay widget. No intermediate mask/backdrop Container should be present.
   */
  test('modal entry produces exactly 2 Stack children (base + overlay)', () => {
    const manager = new OverlayManager();
    const base = new Text({ text: 'base' });
    const overlayWidget = new Text({ text: 'overlay' });

    manager.show({
      id: 'test-modal',
      priority: 100,
      modal: true,
      placement: { type: 'fullscreen' },
      builder: () => overlayWidget,
    });

    const result = manager.buildOverlays(base);

    expect(result).toBeInstanceOf(Stack);

    const stack = result as Stack;
    expect(stack.children).toHaveLength(2);
    expect(stack.children[0]).toBe(base);
  });

  /**
   * Two modal entries should produce exactly 3 children (base + 2 overlays),
   * confirming no mask is inserted between them.
   */
  test('two modal entries produce exactly 3 Stack children', () => {
    const manager = new OverlayManager();
    const base = new Text({ text: 'base' });

    manager.show({
      id: 'modal-a',
      priority: 10,
      modal: true,
      placement: { type: 'fullscreen' },
      builder: () => new Text({ text: 'a' }),
    });

    manager.show({
      id: 'modal-b',
      priority: 20,
      modal: true,
      placement: { type: 'fullscreen' },
      builder: () => new Text({ text: 'b' }),
    });

    const result = manager.buildOverlays(base);
    const stack = result as Stack;
    expect(stack.children).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// BUG-1 — CommandPalette borderedPanel has opaque background
// ---------------------------------------------------------------------------

describe('BUG-1: CommandPalette borderedPanel has opaque background', () => {
  /**
   * The BoxDecoration for the bordered panel must include `color: Color.black`
   * so the palette is rendered with an opaque background. We verify this by
   * reading the source file as text and matching the pattern.
   */
  test('BoxDecoration includes color: Color.black', async () => {
    const src = await Bun.file(
      new URL('../widgets/command-palette.ts', import.meta.url).pathname,
    ).text();

    expect(src).toMatch(/BoxDecoration\(\{[^}]*color:\s*Color\.black/s);
  });
});

// ---------------------------------------------------------------------------
// BUG-passthrough — buildOverlays returns baseContent when no overlays
// ---------------------------------------------------------------------------

describe('buildOverlays returns baseContent directly when no overlays active', () => {
  /**
   * When there are no overlay entries, buildOverlays must return the exact
   * same widget reference that was passed in — no Stack wrapper.
   */
  test('returns same reference as input', () => {
    const manager = new OverlayManager();
    const base = new Text({ text: 'base' });

    const result = manager.buildOverlays(base);

    expect(result).toBe(base);
    expect(result).not.toBeInstanceOf(Stack);
  });
});
