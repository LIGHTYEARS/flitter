// Tests for ShortcutRegistry — Gap 30: Centralized shortcut registry
//
// Verifies: register, dispatch, guard predicates, conflict detection,
// introspection (getEntries, getGroupedEntries), unregister

import { describe, test, expect } from 'bun:test';
import { ShortcutRegistry } from '../registry';
import type { ShortcutContext, ShortcutHooks } from '../registry';
import { createKeyEvent } from 'flitter-core/src/input/events';
import { OverlayManager } from '../../state/overlay-manager';
import { PromptHistory } from '../../state/history';

function mockHooks(overrides?: Partial<ShortcutHooks>): ShortcutHooks {
  return {
    showCommandPalette: () => {},
    showShortcutHelp: () => {},
    openInEditor: () => {},
    historyPrevious: () => {},
    historyNext: () => {},
    toggleThinking: () => {},
    copyLastResponse: () => {},
    ...overrides,
  };
}

function mockContext(overrides?: Partial<ShortcutContext>): ShortcutContext {
  return {
    appState: {
      isProcessing: false,
      hasPendingPermission: false,
      conversation: { clear: () => {}, toggleToolCalls: () => {}, items: [] },
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

describe('ShortcutRegistry', () => {
  test('register and dispatch a simple shortcut', () => {
    const registry = new ShortcutRegistry();
    let fired = false;
    registry.register({
      id: 'test-shortcut',
      binding: { key: 'x', ctrl: true },
      displayKey: 'Ctrl+X',
      description: 'Test shortcut',
      category: 'general',
      action: () => { fired = true; return 'handled'; },
    });

    const event = createKeyEvent('x', { ctrlKey: true });
    const result = registry.dispatch(event, mockContext());

    expect(result).toBe('handled');
    expect(fired).toBe(true);
  });

  test('returns ignored when no shortcut matches', () => {
    const registry = new ShortcutRegistry();
    const event = createKeyEvent('z');
    expect(registry.dispatch(event, mockContext())).toBe('ignored');
  });

  test('throws on duplicate id', () => {
    const registry = new ShortcutRegistry();
    const entry = {
      id: 'dup',
      binding: { key: 'a' },
      displayKey: 'a',
      description: 'dup',
      category: 'general' as const,
      action: () => 'handled' as const,
    };
    registry.register(entry);
    expect(() => registry.register(entry)).toThrow(/duplicate id/);
  });

  test('enabled guard prevents dispatch', () => {
    const registry = new ShortcutRegistry();
    let fired = false;
    const overlayManager = new OverlayManager();
    registry.register({
      id: 'guarded',
      binding: { key: '?' },
      displayKey: '?',
      description: 'Guarded',
      category: 'general',
      enabled: (ctx) => !ctx.overlayManager.hasOverlays,
      action: () => { fired = true; return 'handled'; },
    });

    const event = createKeyEvent('?');

    // Guard passes: no overlays
    registry.dispatch(event, mockContext({ overlayManager }));
    expect(fired).toBe(true);

    // Guard fails: overlays present
    fired = false;
    const overlayMgrWithEntries = new OverlayManager();
    overlayMgrWithEntries.show({
      id: 'test',
      priority: 50,
      modal: false,
      placement: { type: 'fullscreen' },
      builder: () => ({ } as any),
    });
    const result = registry.dispatch(event, mockContext({ overlayManager: overlayMgrWithEntries }));
    expect(result).toBe('ignored');
    expect(fired).toBe(false);
  });

  test('unregister removes a shortcut', () => {
    const registry = new ShortcutRegistry();
    registry.register({
      id: 'temp',
      binding: { key: 'q' },
      displayKey: 'q',
      description: 'Temp',
      category: 'general',
      action: () => 'handled',
    });
    expect(registry.size).toBe(1);
    expect(registry.unregister('temp')).toBe(true);
    expect(registry.size).toBe(0);
  });

  test('unregister returns false for non-existent id', () => {
    const registry = new ShortcutRegistry();
    expect(registry.unregister('nonexistent')).toBe(false);
  });

  test('getEntries returns all entries', () => {
    const registry = new ShortcutRegistry();
    registry.register({
      id: 'a', binding: { key: 'a' }, displayKey: 'a',
      description: 'A', category: 'general',
      action: () => 'handled',
    });
    registry.register({
      id: 'b', binding: { key: 'b' }, displayKey: 'b',
      description: 'B', category: 'display',
      action: () => 'handled',
    });

    expect(registry.getEntries()).toHaveLength(2);
  });

  test('getEntries filters by category', () => {
    const registry = new ShortcutRegistry();
    registry.register({
      id: 'a', binding: { key: 'a' }, displayKey: 'a',
      description: 'A', category: 'general',
      action: () => 'handled',
    });
    registry.register({
      id: 'b', binding: { key: 'b' }, displayKey: 'b',
      description: 'B', category: 'display',
      action: () => 'handled',
    });

    expect(registry.getEntries('general')).toHaveLength(1);
    expect(registry.getEntries('display')).toHaveLength(1);
    expect(registry.getEntries('navigation')).toHaveLength(0);
  });

  test('getGroupedEntries returns categories in display order', () => {
    const registry = new ShortcutRegistry();
    registry.register({
      id: 'nav', binding: { key: 'n' }, displayKey: 'n',
      description: 'Nav', category: 'navigation',
      action: () => 'handled',
    });
    registry.register({
      id: 'gen', binding: { key: 'g' }, displayKey: 'g',
      description: 'Gen', category: 'general',
      action: () => 'handled',
    });

    const grouped = registry.getGroupedEntries();
    const keys = Array.from(grouped.keys());
    expect(keys).toEqual(['general', 'display', 'navigation', 'input']);
    expect(grouped.get('general')).toHaveLength(1);
    expect(grouped.get('navigation')).toHaveLength(1);
    expect(grouped.get('display')).toHaveLength(0);
  });

  test('first matching entry wins on same binding', () => {
    const registry = new ShortcutRegistry();
    const order: string[] = [];

    registry.register({
      id: 'first',
      binding: { key: 'Escape' },
      displayKey: 'Esc',
      description: 'First',
      category: 'general',
      action: () => { order.push('first'); return 'handled'; },
    });
    registry.register({
      id: 'second',
      binding: { key: 'Escape' },
      displayKey: 'Esc',
      description: 'Second',
      category: 'general',
      action: () => { order.push('second'); return 'handled'; },
    });

    const event = createKeyEvent('Escape');
    registry.dispatch(event, mockContext());

    expect(order).toEqual(['first']);
  });

  test('skips disabled entry, dispatches to next match', () => {
    const registry = new ShortcutRegistry();
    const order: string[] = [];

    registry.register({
      id: 'disabled',
      binding: { key: 'Escape' },
      displayKey: 'Esc',
      description: 'Disabled',
      category: 'general',
      enabled: () => false,
      action: () => { order.push('disabled'); return 'handled'; },
    });
    registry.register({
      id: 'fallback',
      binding: { key: 'Escape' },
      displayKey: 'Esc',
      description: 'Fallback',
      category: 'general',
      action: () => { order.push('fallback'); return 'handled'; },
    });

    const event = createKeyEvent('Escape');
    registry.dispatch(event, mockContext());

    expect(order).toEqual(['fallback']);
  });

  test('get returns entry by id', () => {
    const registry = new ShortcutRegistry();
    registry.register({
      id: 'test',
      binding: { key: 'x' },
      displayKey: 'x',
      description: 'Test',
      category: 'general',
      action: () => 'handled',
    });

    const entry = registry.get('test');
    expect(entry).toBeDefined();
    expect(entry!.id).toBe('test');
  });

  test('get returns undefined for unknown id', () => {
    const registry = new ShortcutRegistry();
    expect(registry.get('unknown')).toBeUndefined();
  });

  test('clear removes all entries', () => {
    const registry = new ShortcutRegistry();
    registry.register({
      id: 'a', binding: { key: 'a' }, displayKey: 'a',
      description: 'A', category: 'general',
      action: () => 'handled',
    });
    registry.register({
      id: 'b', binding: { key: 'b' }, displayKey: 'b',
      description: 'B', category: 'general',
      action: () => 'handled',
    });

    expect(registry.size).toBe(2);
    registry.clear();
    expect(registry.size).toBe(0);
    expect(registry.getEntries()).toHaveLength(0);
  });

  test('size returns correct count', () => {
    const registry = new ShortcutRegistry();
    expect(registry.size).toBe(0);

    registry.register({
      id: 'a', binding: { key: 'a' }, displayKey: 'a',
      description: 'A', category: 'general',
      action: () => 'handled',
    });
    expect(registry.size).toBe(1);
  });

  test('does not match when modifiers differ', () => {
    const registry = new ShortcutRegistry();
    let fired = false;
    registry.register({
      id: 'ctrl-x',
      binding: { key: 'x', ctrl: true },
      displayKey: 'Ctrl+X',
      description: 'Ctrl+X',
      category: 'general',
      action: () => { fired = true; return 'handled'; },
    });

    // Plain 'x' should not trigger Ctrl+X shortcut
    const event = createKeyEvent('x');
    const result = registry.dispatch(event, mockContext());
    expect(result).toBe('ignored');
    expect(fired).toBe(false);
  });
});
