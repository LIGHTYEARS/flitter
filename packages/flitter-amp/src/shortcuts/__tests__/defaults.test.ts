// Tests for default shortcut definitions — Gap 30
//
// Integration tests that verify registerDefaultShortcuts populates the
// registry correctly and that each default shortcut behaves as expected.

import { describe, test, expect } from 'bun:test';
import { ShortcutRegistry } from '../registry';
import type { ShortcutContext, ShortcutHooks } from '../registry';
import { registerDefaultShortcuts } from '../defaults';
import { createKeyEvent } from 'flitter-core/src/input/events';
import { OverlayManager } from '../../state/overlay-manager';
import { PromptHistory } from '../../state/history';
import { OVERLAY_IDS } from '../../state/overlay-ids';

function mockHooks(overrides?: Partial<ShortcutHooks>): ShortcutHooks {
  return {
    showCommandPalette: () => {},
    showShortcutHelp: () => {},
    openInEditor: () => {},
    historyPrevious: () => {},
    historyNext: () => {},
    toggleThinking: () => {},
    ...overrides,
  };
}

function mockContext(overrides?: Partial<ShortcutContext>): ShortcutContext {
  return {
    appState: {
      isProcessing: false,
      hasPendingPermission: false,
      conversation: {
        clear: () => {},
        toggleToolCalls: () => {},
        items: [],
      },
      resolvePermission: () => {},
    } as any,
    overlayManager: new OverlayManager(),
    setState: () => {},
    onCancel: () => {},
    promptHistory: new PromptHistory(),
    hooks: mockHooks(),
    ...overrides,
  };
}

describe('registerDefaultShortcuts', () => {
  test('registers all expected shortcuts without throwing', () => {
    const registry = new ShortcutRegistry();
    registerDefaultShortcuts(registry);

    // Verify expected ids are registered
    expect(registry.get('dismiss-overlay')).toBeDefined();
    expect(registry.get('open-command-palette')).toBeDefined();
    expect(registry.get('cancel-operation')).toBeDefined();
    expect(registry.get('clear-conversation')).toBeDefined();
    expect(registry.get('toggle-tool-calls')).toBeDefined();
    expect(registry.get('open-editor')).toBeDefined();
    expect(registry.get('history-previous')).toBeDefined();
    expect(registry.get('history-next')).toBeDefined();
    expect(registry.get('toggle-shortcut-help')).toBeDefined();
  });

  test('registers 9 shortcuts total', () => {
    const registry = new ShortcutRegistry();
    registerDefaultShortcuts(registry);
    expect(registry.size).toBe(9);
  });

  test('every entry has a non-empty description and displayKey', () => {
    const registry = new ShortcutRegistry();
    registerDefaultShortcuts(registry);

    for (const entry of registry.getEntries()) {
      expect(entry.description.length).toBeGreaterThan(0);
      expect(entry.displayKey.length).toBeGreaterThan(0);
    }
  });

  test('Ctrl+L clears conversation via context', () => {
    const registry = new ShortcutRegistry();
    registerDefaultShortcuts(registry);

    let cleared = false;
    const ctx = mockContext({
      appState: {
        isProcessing: false,
        hasPendingPermission: false,
        conversation: {
          clear: () => { cleared = true; },
          toggleToolCalls: () => {},
          items: [],
        },
        resolvePermission: () => {},
      } as any,
    });

    const event = createKeyEvent('l', { ctrlKey: true });
    const result = registry.dispatch(event, ctx);

    expect(result).toBe('handled');
    expect(cleared).toBe(true);
  });

  test('Ctrl+C calls onCancel', () => {
    const registry = new ShortcutRegistry();
    registerDefaultShortcuts(registry);

    let cancelled = false;
    const ctx = mockContext({ onCancel: () => { cancelled = true; } });

    const event = createKeyEvent('c', { ctrlKey: true });
    registry.dispatch(event, ctx);

    expect(cancelled).toBe(true);
  });

  test('Alt+T toggles tool calls', () => {
    const registry = new ShortcutRegistry();
    registerDefaultShortcuts(registry);

    let toggled = false;
    const ctx = mockContext({
      appState: {
        isProcessing: false,
        hasPendingPermission: false,
        conversation: {
          clear: () => {},
          toggleToolCalls: () => { toggled = true; },
          items: [],
        },
        resolvePermission: () => {},
      } as any,
    });

    const event = createKeyEvent('t', { altKey: true });
    const result = registry.dispatch(event, ctx);

    expect(result).toBe('handled');
    expect(toggled).toBe(true);
  });

  test('Ctrl+O calls showCommandPalette hook', () => {
    const registry = new ShortcutRegistry();
    registerDefaultShortcuts(registry);

    let paletteShown = false;
    const ctx = mockContext({
      hooks: mockHooks({ showCommandPalette: () => { paletteShown = true; } }),
    });

    const event = createKeyEvent('o', { ctrlKey: true });
    const result = registry.dispatch(event, ctx);

    expect(result).toBe('handled');
    expect(paletteShown).toBe(true);
  });

  test('Ctrl+O dismisses palette if already open', () => {
    const registry = new ShortcutRegistry();
    registerDefaultShortcuts(registry);

    const overlayManager = new OverlayManager();
    overlayManager.show({
      id: OVERLAY_IDS.COMMAND_PALETTE,
      priority: 50,
      modal: false,
      placement: { type: 'fullscreen' },
      builder: () => ({} as any),
    });

    const ctx = mockContext({ overlayManager });

    const event = createKeyEvent('o', { ctrlKey: true });
    registry.dispatch(event, ctx);

    expect(overlayManager.has(OVERLAY_IDS.COMMAND_PALETTE)).toBe(false);
  });

  test('Ctrl+G calls openInEditor hook', () => {
    const registry = new ShortcutRegistry();
    registerDefaultShortcuts(registry);

    let editorOpened = false;
    const ctx = mockContext({
      hooks: mockHooks({ openInEditor: () => { editorOpened = true; } }),
    });

    const event = createKeyEvent('g', { ctrlKey: true });
    const result = registry.dispatch(event, ctx);

    expect(result).toBe('handled');
    expect(editorOpened).toBe(true);
  });

  test('Ctrl+R calls historyPrevious hook', () => {
    const registry = new ShortcutRegistry();
    registerDefaultShortcuts(registry);

    let histPrev = false;
    const ctx = mockContext({
      hooks: mockHooks({ historyPrevious: () => { histPrev = true; } }),
    });

    const event = createKeyEvent('r', { ctrlKey: true });
    const result = registry.dispatch(event, ctx);

    expect(result).toBe('handled');
    expect(histPrev).toBe(true);
  });

  test('Ctrl+S calls historyNext hook', () => {
    const registry = new ShortcutRegistry();
    registerDefaultShortcuts(registry);

    let histNext = false;
    const ctx = mockContext({
      hooks: mockHooks({ historyNext: () => { histNext = true; } }),
    });

    const event = createKeyEvent('s', { ctrlKey: true });
    const result = registry.dispatch(event, ctx);

    expect(result).toBe('handled');
    expect(histNext).toBe(true);
  });

  test('? shortcut is guarded by isProcessing', () => {
    const registry = new ShortcutRegistry();
    registerDefaultShortcuts(registry);

    const event = createKeyEvent('?');

    // While processing, ? should not fire
    const ctxBusy = mockContext({
      appState: {
        isProcessing: true,
        hasPendingPermission: false,
        conversation: { clear: () => {}, toggleToolCalls: () => {}, items: [] },
        resolvePermission: () => {},
      } as any,
    });
    expect(registry.dispatch(event, ctxBusy)).toBe('ignored');

    // When idle, ? should fire
    let helpShown = false;
    const ctxIdle = mockContext({
      appState: {
        isProcessing: false,
        hasPendingPermission: false,
        conversation: { clear: () => {}, toggleToolCalls: () => {}, items: [] },
        resolvePermission: () => {},
      } as any,
      hooks: mockHooks({ showShortcutHelp: () => { helpShown = true; } }),
    });
    expect(registry.dispatch(event, ctxIdle)).toBe('handled');
    expect(helpShown).toBe(true);
  });

  test('? shortcut is guarded by open overlays', () => {
    const registry = new ShortcutRegistry();
    registerDefaultShortcuts(registry);

    const event = createKeyEvent('?');

    const overlayManager = new OverlayManager();
    overlayManager.show({
      id: 'some-overlay',
      priority: 50,
      modal: false,
      placement: { type: 'fullscreen' },
      builder: () => ({} as any),
    });

    // Escape should dismiss the overlay first, not ?
    // The ? shortcut should be disabled when overlays are present
    const ctx = mockContext({ overlayManager });
    // dismiss-overlay matches Escape, not ?. So ? with overlays should be 'ignored'
    // because the ? entry's enabled guard returns false
    expect(registry.dispatch(event, ctx)).toBe('ignored');
  });

  test('Escape dismisses topmost overlay', () => {
    const registry = new ShortcutRegistry();
    registerDefaultShortcuts(registry);

    const overlayManager = new OverlayManager();
    overlayManager.show({
      id: 'test-overlay',
      priority: 50,
      modal: false,
      placement: { type: 'fullscreen' },
      builder: () => ({} as any),
    });

    const ctx = mockContext({ overlayManager });
    const event = createKeyEvent('Escape');
    const result = registry.dispatch(event, ctx);

    expect(result).toBe('handled');
    expect(overlayManager.hasOverlays).toBe(false);
  });

  test('Escape returns ignored when no overlays', () => {
    const registry = new ShortcutRegistry();
    registerDefaultShortcuts(registry);

    const ctx = mockContext();
    const event = createKeyEvent('Escape');
    const result = registry.dispatch(event, ctx);

    expect(result).toBe('ignored');
  });

  test('Escape resolves permission when permission dialog dismissed', () => {
    const registry = new ShortcutRegistry();
    registerDefaultShortcuts(registry);

    let resolved = false;
    const overlayManager = new OverlayManager();
    overlayManager.show({
      id: OVERLAY_IDS.PERMISSION_DIALOG,
      priority: 100,
      modal: true,
      placement: { type: 'fullscreen' },
      builder: () => ({} as any),
    });

    const ctx = mockContext({
      overlayManager,
      appState: {
        isProcessing: false,
        hasPendingPermission: true,
        conversation: { clear: () => {}, toggleToolCalls: () => {}, items: [] },
        resolvePermission: () => { resolved = true; },
      } as any,
    });

    const event = createKeyEvent('Escape');
    registry.dispatch(event, ctx);

    expect(resolved).toBe(true);
  });

  test('categories are correctly assigned', () => {
    const registry = new ShortcutRegistry();
    registerDefaultShortcuts(registry);

    expect(registry.get('dismiss-overlay')!.category).toBe('general');
    expect(registry.get('open-command-palette')!.category).toBe('general');
    expect(registry.get('cancel-operation')!.category).toBe('general');
    expect(registry.get('clear-conversation')!.category).toBe('general');
    expect(registry.get('toggle-tool-calls')!.category).toBe('display');
    expect(registry.get('open-editor')!.category).toBe('navigation');
    expect(registry.get('history-previous')!.category).toBe('navigation');
    expect(registry.get('history-next')!.category).toBe('navigation');
    expect(registry.get('toggle-shortcut-help')!.category).toBe('general');
  });
});
