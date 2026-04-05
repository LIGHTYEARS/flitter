// Tests for AppShell — layout structure, scroll behavior, follow mode,
// keyboard/mouse scroll, resize handling, and scrollbar coordination.
//
// Groups 6-11 from Phase 15 Plan 03.

import { describe, test, expect, beforeEach } from 'bun:test';
import type { BuildContext, Widget } from '../../../flitter-core/src/framework/widget';
import { Column, Row } from '../../../flitter-core/src/widgets/flex';
import { Expanded } from '../../../flitter-core/src/widgets/flexible';
import { Center } from '../../../flitter-core/src/widgets/center';
import { FocusScope } from '../../../flitter-core/src/widgets/focus-scope';
import { SingleChildScrollView } from '../../../flitter-core/src/widgets/scroll-view';
import { ScrollController } from '../../../flitter-core/src/widgets/scroll-controller';
import { Scrollbar } from '../../../flitter-core/src/widgets/scrollbar';
import { Color } from '../../../flitter-core/src/core/color';
import { Padding } from '../../../flitter-core/src/widgets/padding';
import { SessionState } from '../state/session';
import { PromptHistory } from '../state/history';
import { SessionStore } from '../state/session-store';
import { AppState } from '../state/app-state';
import { PromptController } from '../state/prompt-controller';
import { AppShell } from '../widgets/app-shell';
import { ChatView } from '../widgets/chat-view';
import type { Provider, PromptOptions } from '../provider/provider';
import type { StreamEvent } from '../state/types';

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

const stubContext: BuildContext = { widget: null!, mounted: true } as unknown as BuildContext;

function createTestAppState(): {
  appState: AppState;
  session: SessionState;
  provider: MockProvider;
} {
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

/**
 * Build an AppShell and return the widget tree from AppShellState.build().
 */
function buildAppShell(appState: AppState): Widget {
  const appShell = new AppShell({ appState });
  const state = appShell.createState();
  (state as any)._widget = appShell;
  state.initState();
  return state.build(stubContext);
}

/**
 * Recursively find the first widget of a given type in a widget tree.
 */
function findFirst<T extends Widget>(root: Widget, type: new (...args: any[]) => T): T | null {
  if (root instanceof type) return root as T;
  const queue: Widget[] = [root];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current instanceof type) return current as T;
    if ('children' in current && Array.isArray((current as any).children)) queue.push(...(current as any).children);
    if ('child' in current && (current as any).child) queue.push((current as any).child);
  }
  return null;
}

/**
 * Find all widgets of a given type in a widget tree (recursive).
 */
function findAll<T extends Widget>(root: Widget, type: new (...args: any[]) => T): T[] {
  const results: T[] = [];
  const queue: Widget[] = [root];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current instanceof type) results.push(current as T);
    if ('children' in current && Array.isArray((current as any).children)) queue.push(...(current as any).children);
    if ('child' in current && (current as any).child) queue.push((current as any).child);
  }
  return results;
}

// ===========================================================================
// Group 6: Layout Structure
// ===========================================================================

describe('AppShell — Layout Structure', () => {
  test('6.1 Root widget tree contains FocusScope with autofocus', () => {
    const { appState } = createTestAppState();
    const tree = buildAppShell(appState);
    const focusScope = findFirst(tree, FocusScope);
    expect(focusScope).not.toBeNull();
    expect(focusScope!.autofocus).toBe(true);
  });

  test('6.2 FocusScope contains Column with mainAxisSize:max', () => {
    const { appState } = createTestAppState();
    const tree = buildAppShell(appState);
    const col = findFirst(tree, Column);
    expect(col).not.toBeNull();
    expect(col!.mainAxisSize).toBe('max');
    expect(col!.crossAxisAlignment).toBe('stretch');
  });

  test('6.3 Column wraps content in Expanded', () => {
    const { appState } = createTestAppState();
    const tree = buildAppShell(appState);
    const col = findFirst(tree, Column);
    expect(col).not.toBeNull();
    expect(col!.children.length).toBeGreaterThanOrEqual(1);
    expect(col!.children[0]).toBeInstanceOf(Expanded);
  });

  test('6.4 Welcome screen (non-scroll) uses Center wrapping', () => {
    const { appState } = createTestAppState();
    const tree = buildAppShell(appState);
    const center = findFirst(tree, Center);
    expect(center).not.toBeNull();
    const chatView = findFirst(tree, ChatView);
    expect(chatView).not.toBeNull();
  });

  test('6.5 Ready screen uses Row with SingleChildScrollView + Scrollbar', () => {
    const { appState, session } = createTestAppState();
    session.startProcessing('hello');
    session.beginStreaming();
    session.appendAssistantChunk('Hi');
    session.completeStream('end_turn');
    session.reset();

    const tree = buildAppShell(appState);
    const row = findFirst(tree, Row);
    expect(row).not.toBeNull();
    expect(row!.crossAxisAlignment).toBe('stretch');

    const scrollView = findFirst(tree, SingleChildScrollView);
    expect(scrollView).not.toBeNull();

    const scrollbar = findFirst(tree, Scrollbar);
    expect(scrollbar).not.toBeNull();
  });

  test('6.6 Processing screen also uses scroll wrapping', () => {
    const { appState, session } = createTestAppState();
    session.startProcessing('hello');
    session.beginStreaming();
    session.appendAssistantChunk('Streaming...');

    const tree = buildAppShell(appState);
    const scrollView = findFirst(tree, SingleChildScrollView);
    expect(scrollView).not.toBeNull();
  });

  test('6.7 Error screen uses Center wrapping (no scroll)', () => {
    const { appState, session } = createTestAppState();
    session.startProcessing('hello');
    session.handleError({ message: 'Error', code: '500', retryable: false });

    const tree = buildAppShell(appState);
    const center = findFirst(tree, Center);
    expect(center).not.toBeNull();
    const scrollView = findFirst(tree, SingleChildScrollView);
    expect(scrollView).toBeNull();
  });

  test('6.8 SingleChildScrollView has position:bottom for chat anchoring', () => {
    const { appState, session } = createTestAppState();
    session.startProcessing('hello');
    session.beginStreaming();
    session.appendAssistantChunk('Hi');
    session.completeStream('end_turn');
    session.reset();

    const tree = buildAppShell(appState);
    const scrollView = findFirst(tree, SingleChildScrollView);
    expect(scrollView).not.toBeNull();
    expect((scrollView as any).position).toBe('bottom');
  });
});

// ===========================================================================
// Group 7: Follow Mode (ScrollController unit tests)
// ===========================================================================

describe('AppShell — Follow Mode', () => {
  let ctrl: ScrollController;

  beforeEach(() => {
    ctrl = new ScrollController();
    ctrl.updateViewportSize(20);
    ctrl.updateMaxScrollExtent(100);
  });

  test('7.1 followMode is enabled by default', () => {
    expect(ctrl.followMode).toBe(true);
  });

  test('7.2 scrolling up disables followMode', () => {
    ctrl.jumpTo(100);
    ctrl.disableFollowMode();
    ctrl.scrollBy(-10);
    expect(ctrl.followMode).toBe(false);
  });

  test('7.3 jumping to bottom re-enables followMode', () => {
    ctrl.disableFollowMode();
    ctrl.jumpTo(50);
    expect(ctrl.followMode).toBe(false);
    ctrl.jumpTo(100);
    expect(ctrl.followMode).toBe(true);
  });

  test('7.4 updateMaxScrollExtent auto-scrolls when followMode is on and at bottom', () => {
    ctrl.jumpTo(100);
    expect(ctrl.atBottom).toBe(true);
    ctrl.updateMaxScrollExtent(200);
    expect(ctrl.offset).toBe(200);
    expect(ctrl.atBottom).toBe(true);
  });

  test('7.5 updateMaxScrollExtent does NOT auto-scroll when followMode is off', () => {
    ctrl.jumpTo(50);
    ctrl.disableFollowMode();
    const prevOffset = ctrl.offset;
    ctrl.updateMaxScrollExtent(200);
    expect(ctrl.offset).toBe(prevOffset);
  });
});

// ===========================================================================
// Group 8: Keyboard Scroll (ScrollController direct tests)
// ===========================================================================

describe('AppShell — Keyboard Scroll', () => {
  let ctrl: ScrollController;

  beforeEach(() => {
    ctrl = new ScrollController();
    ctrl.updateViewportSize(20);
    ctrl.updateMaxScrollExtent(100);
    ctrl.jumpTo(50);
  });

  test('8.1 scrollBy(1) scrolls down by 1 (j/ArrowDown)', () => {
    ctrl.scrollBy(1);
    expect(ctrl.offset).toBe(51);
  });

  test('8.2 scrollBy(-1) scrolls up by 1 (k/ArrowUp)', () => {
    ctrl.disableFollowMode();
    ctrl.scrollBy(-1);
    expect(ctrl.offset).toBe(49);
  });

  test('8.3 jumpTo(0) scrolls to top (g key)', () => {
    ctrl.disableFollowMode();
    ctrl.jumpTo(0);
    expect(ctrl.offset).toBe(0);
  });

  test('8.4 jumpTo(max) scrolls to bottom (G key)', () => {
    ctrl.jumpTo(ctrl.maxScrollExtent);
    expect(ctrl.offset).toBe(100);
    expect(ctrl.atBottom).toBe(true);
  });

  test('8.5 scrollBy(viewportSize) page down', () => {
    ctrl.scrollBy(20);
    expect(ctrl.offset).toBe(70);
  });

  test('8.6 scrollBy(-viewportSize) page up', () => {
    ctrl.disableFollowMode();
    ctrl.scrollBy(-20);
    expect(ctrl.offset).toBe(30);
  });

  test('8.7 scrollBy(10) half page down (Ctrl+D)', () => {
    ctrl.scrollBy(10);
    expect(ctrl.offset).toBe(60);
  });

  test('8.8 scrollBy(-10) half page up (Ctrl+U)', () => {
    ctrl.disableFollowMode();
    ctrl.scrollBy(-10);
    expect(ctrl.offset).toBe(40);
  });

  test('8.9 offset is clamped to [0, maxScrollExtent]', () => {
    ctrl.jumpTo(-100);
    expect(ctrl.offset).toBe(0);
    ctrl.jumpTo(9999);
    expect(ctrl.offset).toBe(100);
  });
});

// ===========================================================================
// Group 9: Mouse Scroll (ScrollController direct tests)
// ===========================================================================

describe('AppShell — Mouse Scroll', () => {
  let ctrl: ScrollController;

  beforeEach(() => {
    ctrl = new ScrollController();
    ctrl.updateViewportSize(20);
    ctrl.updateMaxScrollExtent(100);
    ctrl.jumpTo(50);
  });

  test('9.1 scroll up (button 64 equivalent): scrollBy(-3)', () => {
    ctrl.disableFollowMode();
    ctrl.scrollBy(-3);
    expect(ctrl.offset).toBe(47);
  });

  test('9.2 scroll down (button 65 equivalent): scrollBy(3)', () => {
    ctrl.scrollBy(3);
    expect(ctrl.offset).toBe(53);
  });

  test('9.3 scroll up at top is clamped to 0', () => {
    ctrl.jumpTo(1);
    ctrl.disableFollowMode();
    ctrl.scrollBy(-3);
    expect(ctrl.offset).toBe(0);
  });

  test('9.4 scroll down at bottom is clamped to maxScrollExtent', () => {
    ctrl.jumpTo(99);
    ctrl.scrollBy(3);
    expect(ctrl.offset).toBe(100);
  });
});

// ===========================================================================
// Group 10: Resize (ScrollController direct tests)
// ===========================================================================

describe('AppShell — Resize Handling', () => {
  let ctrl: ScrollController;

  beforeEach(() => {
    ctrl = new ScrollController();
    ctrl.updateViewportSize(20);
    ctrl.updateMaxScrollExtent(100);
  });

  test('10.1 updateViewportSize updates the viewportSize', () => {
    ctrl.updateViewportSize(40);
    expect(ctrl.viewportSize).toBe(40);
  });

  test('10.2 offset is preserved after viewport resize within range', () => {
    ctrl.jumpTo(50);
    ctrl.disableFollowMode();
    ctrl.updateViewportSize(40);
    expect(ctrl.offset).toBe(50);
  });

  test('10.3 atBottom is computed correctly after viewport resize', () => {
    ctrl.jumpTo(100);
    expect(ctrl.atBottom).toBe(true);
    ctrl.updateViewportSize(40);
    expect(ctrl.atBottom).toBe(true);
  });
});

// ===========================================================================
// Group 11: Scrollbar Coordination
// ===========================================================================

describe('AppShell — Scrollbar Coordination', () => {
  test('11.1 Scrollbar uses brightBlack thumb color', () => {
    const { appState, session } = createTestAppState();
    session.startProcessing('hello');
    session.beginStreaming();
    session.appendAssistantChunk('Hi');
    session.completeStream('end_turn');
    session.reset();

    const tree = buildAppShell(appState);
    const scrollbar = findFirst(tree, Scrollbar);
    expect(scrollbar).not.toBeNull();
    expect((scrollbar as any).thumbColor.equals(Color.brightBlack)).toBe(true);
  });

  test('11.2 Scrollbar uses defaultColor for track', () => {
    const { appState, session } = createTestAppState();
    session.startProcessing('hello');
    session.beginStreaming();
    session.appendAssistantChunk('Hi');
    session.completeStream('end_turn');
    session.reset();

    const tree = buildAppShell(appState);
    const scrollbar = findFirst(tree, Scrollbar);
    expect(scrollbar).not.toBeNull();
    expect((scrollbar as any).trackColor.equals(Color.defaultColor)).toBe(true);
  });

  test('11.3 SingleChildScrollView enables keyboard and mouse scroll', () => {
    const { appState, session } = createTestAppState();
    session.startProcessing('hello');
    session.beginStreaming();
    session.appendAssistantChunk('Hi');
    session.completeStream('end_turn');
    session.reset();

    const tree = buildAppShell(appState);
    const scrollView = findFirst(tree, SingleChildScrollView);
    expect(scrollView).not.toBeNull();
    expect((scrollView as any).enableKeyboardScroll).toBe(true);
    expect((scrollView as any).enableMouseScroll).toBe(true);
  });

  test('11.4 ChatView is nested inside Padding inside SingleChildScrollView', () => {
    const { appState, session } = createTestAppState();
    session.startProcessing('hello');
    session.beginStreaming();
    session.appendAssistantChunk('Hi');
    session.completeStream('end_turn');
    session.reset();

    const tree = buildAppShell(appState);
    const scrollView = findFirst(tree, SingleChildScrollView);
    expect(scrollView).not.toBeNull();
    const child = (scrollView as any).child;
    expect(child).toBeInstanceOf(Padding);
    const paddingChild = (child as any).child;
    expect(paddingChild).toBeInstanceOf(ChatView);
  });
});
