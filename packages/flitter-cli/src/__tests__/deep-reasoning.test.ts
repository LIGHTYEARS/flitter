// Tests for deep reasoning toggle (Gap N12).
//
// Covers:
// 1. AppState.toggleDeepReasoning() flips the state and notifies listeners
// 2. Alt+D shortcut is registered and wired to toggleDeepReasoning()
// 3. formatReasoningToggle() utility outputs correct strings

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
// Group 1: AppState.toggleDeepReasoning()
// ===========================================================================

describe('AppState — deep reasoning toggle (N12)', () => {
  let appState: AppState;

  beforeEach(() => {
    const harness = createTestAppState();
    appState = harness.appState;
  });

  test('deepReasoningActive defaults to false', () => {
    expect(appState.deepReasoningActive).toBe(false);
  });

  test('toggleDeepReasoning() flips state to true', () => {
    appState.toggleDeepReasoning();
    expect(appState.deepReasoningActive).toBe(true);
  });

  test('toggleDeepReasoning() flips state back to false on second call', () => {
    appState.toggleDeepReasoning();
    appState.toggleDeepReasoning();
    expect(appState.deepReasoningActive).toBe(false);
  });

  test('toggleDeepReasoning() notifies listeners', () => {
    let callCount = 0;
    appState.addListener(() => { callCount++; });
    appState.toggleDeepReasoning();
    expect(callCount).toBeGreaterThan(0);
  });

  test('multiple toggles cycle correctly', () => {
    expect(appState.deepReasoningActive).toBe(false);
    appState.toggleDeepReasoning();
    expect(appState.deepReasoningActive).toBe(true);
    appState.toggleDeepReasoning();
    expect(appState.deepReasoningActive).toBe(false);
    appState.toggleDeepReasoning();
    expect(appState.deepReasoningActive).toBe(true);
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

  test('Alt+D dispatches to toggle-deep-reasoning and returns handled', () => {
    WidgetsBinding.reset();
    const { appState } = createTestAppState();
    const { state } = buildAppShellState(appState);

    expect(appState.deepReasoningActive).toBe(false);
    const result = handleKey(state, createKeyEvent('d', { altKey: true }));
    expect(result).toBe('handled');
    expect(appState.deepReasoningActive).toBe(true);
  });

  test('Alt+D toggles back to false on second press', () => {
    WidgetsBinding.reset();
    const { appState } = createTestAppState();
    const { state } = buildAppShellState(appState);

    handleKey(state, createKeyEvent('d', { altKey: true }));
    expect(appState.deepReasoningActive).toBe(true);
    handleKey(state, createKeyEvent('d', { altKey: true }));
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

describe('formatReasoningToggle (N12)', () => {

  test('returns "[extended]" when active is true', () => {
    expect(formatReasoningToggle(true)).toBe('[extended]');
  });

  test('returns "[normal]" when active is false', () => {
    expect(formatReasoningToggle(false)).toBe('[normal]');
  });
});
