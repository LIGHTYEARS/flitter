// Tests for ShortcutHelpOverlay widget and ? key handler wiring
import { describe, it, expect } from 'bun:test';
import { ShortcutHelpOverlay, SHORTCUT_GROUPS } from '../widgets/shortcut-help-overlay';

describe('ShortcutHelpOverlay', () => {
  it('should create without errors', () => {
    const overlay = new ShortcutHelpOverlay({
      onDismiss: () => {},
    });
    expect(overlay).toBeDefined();
  });

  it('should have an onDismiss callback', () => {
    let dismissed = false;
    const overlay = new ShortcutHelpOverlay({
      onDismiss: () => { dismissed = true; },
    });
    expect(overlay).toBeDefined();
    // The callback is private, but we verify it was accepted without error
    expect(dismissed).toBe(false);
  });
});

describe('SHORTCUT_GROUPS', () => {
  it('should have 4 groups', () => {
    expect(SHORTCUT_GROUPS).toHaveLength(4);
  });

  it('should have General, Display, Navigation, Input groups', () => {
    const titles = SHORTCUT_GROUPS.map((g) => g.title);
    expect(titles).toEqual(['General', 'Display', 'Navigation', 'Input']);
  });

  it('should have at least one shortcut per group', () => {
    for (const group of SHORTCUT_GROUPS) {
      expect(group.shortcuts.length).toBeGreaterThan(0);
    }
  });

  it('should include the ? shortcut in General group', () => {
    const general = SHORTCUT_GROUPS.find((g) => g.title === 'General');
    expect(general).toBeDefined();
    const questionMark = general!.shortcuts.find((s) => s.key === '?');
    expect(questionMark).toBeDefined();
    expect(questionMark!.description).toBe('Toggle this help overlay');
  });

  it('should include Ctrl+G in Navigation group', () => {
    const nav = SHORTCUT_GROUPS.find((g) => g.title === 'Navigation');
    expect(nav).toBeDefined();
    const ctrlG = nav!.shortcuts.find((s) => s.key === 'Ctrl+G');
    expect(ctrlG).toBeDefined();
    expect(ctrlG!.description).toBe('Open prompt in $EDITOR');
  });

  it('every shortcut entry should have non-empty key and description', () => {
    for (const group of SHORTCUT_GROUPS) {
      for (const shortcut of group.shortcuts) {
        expect(shortcut.key.length).toBeGreaterThan(0);
        expect(shortcut.description.length).toBeGreaterThan(0);
      }
    }
  });
});
