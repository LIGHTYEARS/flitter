// Tests for deep reasoning tri-state cycling (Gap N12, MODE-01).
//
// Covers:
// 1. AppState.cycleDeepReasoning() cycles null → medium → high → xhigh → null
// 2. Alt+D shortcut is registered and wired to cycleDeepReasoning()
// 3. formatReasoningToggle() utility outputs correct strings for tri-state

import { describe, test, expect, beforeEach } from 'bun:test';
import { createKeyEvent } from '../../../flitter-core/src/input/events';
import { WidgetsBinding } from '../../../flitter-core/src/framework/binding';
import { SessionState } from '../state/session';
import { PromptHistory } from '../state/history';
import { SessionStore } from '../state/session-store';
import { AppState } from '../state/app-state';
import { PromptController } from '../state/prompt-controller';
import { AppShell } from '../widgets/app-shell';
import { ShortcutRegistry } from '../shortcuts/registry';
import { registerDefaultShortcuts } from '../shortcuts/defaults';
import { formatReasoningToggle } from '../utils/reasoning-toggle';
import type { Provider, PromptOptions } from '../provider/provider';
import type { StreamEvent } from '../state/types';
import type { Widget } from '../../../flitter-core/src/framework/widget';
import type { KeyEvent, KeyEventResult } from '../../../flitter-core/src/input/events';

// ---------------------------------------------------------------------------
// Mock Provider
// ---------------------------------------------------------------------------

class MockProvider implements Provider {
  readonly id = 'mock' as const;
  readonly name = 'mock';
  readonly model = 'test-model';
  readonly capabilities = { vision: true, functionCalling: true, streaming: true, systemPrompt: true };
  mockEvents: StreamEvent[] = [];
  cancelCalled = false;

  cancelRequest(): void {
    this.cancelCalled = true;
  }

  async *sendPrompt(
    _messages: Array<{ role: string; content: string }>,
    _options: PromptOptions,
  ): AsyncGenerator<StreamEvent> {
    for (const event of this.mockEvents) yield event;
  }
}

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

const stubContext = { widget: null!, mounted: true } as any;

function createTestAppState() {
  const provider = new MockProvider();
  const session = new SessionState({
    sessionId: 'test-session-id',
    cwd: '/test/cwd',
    model: provider.model,
  });
  const appState = new AppState(session, new PromptHistory(), new SessionStore());
  const controller = new PromptController({ session, provider });
  appState.setPromptController(controller);
  return { appState, session, provider };
}

function buildAppShellState(appState: AppState) {
  const appShell = new AppShell({ appState });
  const state = appShell.createState();
  (state as any)._widget = appShell;
  (state as any)._mounted = true;
  state.initState();
  const tree = state.build(stubContext);
  return { state, tree };
}

function handleKey(state: any, event: KeyEvent): KeyEventResult {
  return (state as any)._handleKey(event);
}

// ===========================================================================
// Group 1: AppState.cycleDeepReasoning() — tri-state (MODE-01)
// ===========================================================================

describe('AppState — deep reasoning tri-state (N12, MODE-01)', () => {
  let appState: AppState;

  beforeEach(() => {
    const harness = createTestAppState();
    appState = harness.appState;
  });

  test('deepReasoningActive defaults to false, deepReasoningEffort defaults to null', () => {
    expect(appState.deepReasoningActive).toBe(false);
    expect(appState.deepReasoningEffort).toBeNull();
  });

  test('cycleDeepReasoning() cycles null → medium', () => {
    appState.cycleDeepReasoning();
    expect(appState.deepReasoningActive).toBe(true);
    expect(appState.deepReasoningEffort).toBe('medium');
  });

  test('cycleDeepReasoning() cycles medium → high → xhigh → null', () => {
    appState.cycleDeepReasoning(); // null → medium
    appState.cycleDeepReasoning(); // medium → high
    expect(appState.deepReasoningEffort).toBe('high');
    appState.cycleDeepReasoning(); // high → xhigh
    expect(appState.deepReasoningEffort).toBe('xhigh');
    appState.cycleDeepReasoning(); // xhigh → null
    expect(appState.deepReasoningEffort).toBeNull();
    expect(appState.deepReasoningActive).toBe(false);
  });

  test('cycleDeepReasoning() notifies listeners', () => {
    let callCount = 0;
    appState.addListener(() => { callCount++; });
    appState.cycleDeepReasoning();
    expect(callCount).toBeGreaterThan(0);
  });

  test('toggleDeepReasoning() backward compat alias calls cycleDeepReasoning()', () => {
    appState.toggleDeepReasoning();
    expect(appState.deepReasoningActive).toBe(true);
    expect(appState.deepReasoningEffort).toBe('medium');
  });
});

// ===========================================================================
// Group 2: Alt+D shortcut registration
// ===========================================================================

describe('Alt+D shortcut — toggle-deep-reasoning (N12)', () => {

  test('toggle-deep-reasoning is registered in default shortcuts', () => {
    const registry = new ShortcutRegistry();
    registerDefaultShortcuts(registry);
    const entry = registry.get('toggle-deep-reasoning');
    expect(entry).toBeDefined();
    expect(entry!.displayKey).toBe('Alt+D');
    expect(entry!.binding.key).toBe('d');
    expect(entry!.binding.alt).toBe(true);
    expect(entry!.category).toBe('display');
  });

  test('Alt+D dispatches to cycleDeepReasoning and returns handled', () => {
    WidgetsBinding.reset();
    const { appState } = createTestAppState();
    const { state } = buildAppShellState(appState);

    expect(appState.deepReasoningActive).toBe(false);
    const result = handleKey(state, createKeyEvent('d', { altKey: true }));
    expect(result).toBe('handled');
    expect(appState.deepReasoningActive).toBe(true);
    expect(appState.deepReasoningEffort).toBe('medium');
  });

  test('Alt+D cycles through medium → high → xhigh → off', () => {
    WidgetsBinding.reset();
    const { appState } = createTestAppState();
    const { state } = buildAppShellState(appState);

    handleKey(state, createKeyEvent('d', { altKey: true })); // null → medium
    expect(appState.deepReasoningEffort).toBe('medium');
    handleKey(state, createKeyEvent('d', { altKey: true })); // medium → high
    expect(appState.deepReasoningEffort).toBe('high');
    handleKey(state, createKeyEvent('d', { altKey: true })); // high → xhigh
    expect(appState.deepReasoningEffort).toBe('xhigh');
    handleKey(state, createKeyEvent('d', { altKey: true })); // xhigh → null
    expect(appState.deepReasoningEffort).toBeNull();
    expect(appState.deepReasoningActive).toBe(false);
  });

  test('plain "d" key without Alt is not handled', () => {
    WidgetsBinding.reset();
    const { appState } = createTestAppState();
    const { state } = buildAppShellState(appState);

    const result = handleKey(state, createKeyEvent('d'));
    expect(result).toBe('ignored');
    expect(appState.deepReasoningActive).toBe(false);
  });
});

// ===========================================================================
// Group 3: formatReasoningToggle utility
// ===========================================================================

describe('formatReasoningToggle (N12, MODE-01)', () => {

  test('returns "[normal]" when effort is null', () => {
    expect(formatReasoningToggle(null)).toBe('[normal]');
  });

  test('returns "[medium]" when effort is "medium"', () => {
    expect(formatReasoningToggle('medium')).toBe('[medium]');
  });

  test('returns "[high]" when effort is "high"', () => {
    expect(formatReasoningToggle('high')).toBe('[high]');
  });

  test('returns "[xhigh]" when effort is "xhigh"', () => {
    expect(formatReasoningToggle('xhigh')).toBe('[xhigh]');
  });
});
