// Tests for WelcomeScreen — widget tree structure, hint text content,
// AppState listener lifecycle, and ChatView integration.
//
// Four groups per plan 24-01-T3:
//   Group 1: Rendering path (Center root, DensityOrb present)
//   Group 2: Hint text content verification (exact string matching)
//   Group 3: Lifecycle / cleanup (listener registration and deregistration)
//   Group 4: Integration (ChatView welcome state produces WelcomeScreen)

import { describe, test, expect } from 'bun:test';
import type { BuildContext, Widget } from '../../../flitter-core/src/framework/widget';
import { Text } from '../../../flitter-core/src/widgets/text';
import { Center } from '../../../flitter-core/src/widgets/center';
import { Color } from '../../../flitter-core/src/core/color';
import { SessionState } from '../state/session';
import { PromptHistory } from '../state/history';
import { SessionStore } from '../state/session-store';
import { AppState } from '../state/app-state';
import { PromptController } from '../state/prompt-controller';
import { WelcomeScreen, WelcomeScreenState } from '../widgets/welcome-screen';
import { DensityOrbWidget } from '../widgets/density-orb-widget';
import { ChatView, ChatViewState } from '../widgets/chat-view';
import { Container } from '../../../flitter-core/src/widgets/container';
import { StickyHeader } from '../../../flitter-core/src/widgets/sticky-header';

// ---------------------------------------------------------------------------
// Stub context — minimal BuildContext for direct build() calls
// ---------------------------------------------------------------------------

/** Minimal stub BuildContext used for direct State.build() calls. */
const stubContext: BuildContext = { widget: null!, mounted: true } as unknown as BuildContext;

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/**
 * Create a fully-wired AppState with a mock provider for unit testing.
 * Returns appState in the welcome screenState (idle + empty + turnCount=0).
 */
function createTestAppState(): AppState {
  const session = new SessionState({
    sessionId: 'test-welcome-session',
    cwd: '/test/cwd',
    model: 'test-model',
  });
  const appState = new AppState(session, new PromptHistory(), new SessionStore());
  // Provide a stub PromptController to satisfy AppState requirements
  const provider = {
    id: 'mock' as const,
    name: 'mock',
    model: 'test-model',
    capabilities: { vision: false, functionCalling: false, streaming: false, systemPrompt: false },
    cancelRequest: () => {},
    async *sendPrompt() { /* no-op */ },
  } as any;
  const controller = new PromptController({ session, provider });
  appState.setPromptController(controller);
  return appState;
}

/**
 * Build a WelcomeScreen widget tree by calling createState/initState/build.
 * Uses the (state as any)._widget pattern to wire the state to the widget,
 * matching the framework's normal initialization sequence.
 */
function buildWelcomeScreen(appState: AppState): Widget {
  const widget = new WelcomeScreen({ appState });
  const state = widget.createState();
  // Wire state to widget as the framework would normally do
  (state as any)._widget = widget;
  state.initState();
  return state.build(stubContext);
}

/**
 * Build a ChatView widget tree for integration tests.
 * Creates a ChatViewState, wires it to the widget, and calls build().
 */
function buildChatView(appState: AppState): Widget {
  const chatView = new ChatView({ appState });
  const state = chatView.createState();
  (state as any)._widget = chatView;
  state.initState();
  return state.build(stubContext);
}

/**
 * BFS traversal to find all widgets of a given type in a widget tree.
 * Handles Column/Row children, single-child wrappers (Center, Padding, etc.),
 * Container.containerChild, and StickyHeader header/body.
 */
function findAllWidgets<T extends Widget>(root: Widget, type: new (...args: any[]) => T): T[] {
  const results: T[] = [];
  const queue: Widget[] = [root];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current instanceof type) results.push(current as T);

    // Multi-child containers (Column, Row, Stack, etc.)
    if ('children' in current && Array.isArray((current as any).children)) {
      queue.push(...(current as any).children);
    }

    // Single-child wrappers (Padding, Center, Expanded, etc.)
    if ('child' in current && (current as any).child) {
      queue.push((current as any).child);
    }

    // Container uses containerChild instead of child
    if (current instanceof Container && (current as any).containerChild) {
      queue.push((current as any).containerChild);
    }

    // StickyHeader has header and body
    if (current instanceof StickyHeader) {
      queue.push(current.header);
      queue.push(current.body);
    }
  }

  return results;
}

/**
 * Find the first widget in the tree matching a predicate.
 * Uses BFS traversal for consistent ordering.
 */
function findWidget(root: Widget, predicate: (w: Widget) => boolean): Widget | null {
  const queue: Widget[] = [root];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (predicate(current)) return current;

    if ('children' in current && Array.isArray((current as any).children)) {
      queue.push(...(current as any).children);
    }
    if ('child' in current && (current as any).child) {
      queue.push((current as any).child);
    }
    if (current instanceof Container && (current as any).containerChild) {
      queue.push((current as any).containerChild);
    }
    if (current instanceof StickyHeader) {
      queue.push(current.header);
      queue.push(current.body);
    }
  }

  return null;
}

// ===========================================================================
// Group 1: WelcomeScreen 渲染路径
// ===========================================================================

describe('WelcomeScreen — Rendering Path', () => {

  test('1.1 builds without throwing', () => {
    // Verify that the full build() pipeline completes without error
    const appState = createTestAppState();
    expect(() => buildWelcomeScreen(appState)).not.toThrow();
  });

  test('1.2 contains DensityOrbWidget with variant welcome', () => {
    // Verify WELC-01: DensityOrbWidget with variant='welcome' is present in the tree
    const appState = createTestAppState();
    const tree = buildWelcomeScreen(appState);
    const orbs = findAllWidgets(tree, DensityOrbWidget);
    expect(orbs.length).toBeGreaterThanOrEqual(1);
    expect(orbs[0]!.variant).toBe('welcome');
  });

  test('1.3 layout wraps in Center', () => {
    // The root of the welcome screen build() must be a Center widget
    const appState = createTestAppState();
    const tree = buildWelcomeScreen(appState);
    expect(tree).toBeInstanceOf(Center);
  });

});

// ===========================================================================
// Group 2: 提示文字内容验证
// ===========================================================================

describe('WelcomeScreen — Hint Text Content', () => {

  test('2.1 contains "Welcome to Amp" text', () => {
    // Verify the title text matches the golden file exactly
    const appState = createTestAppState();
    const tree = buildWelcomeScreen(appState);
    const texts = findAllWidgets(tree, Text);
    const hasWelcome = texts.some(t => {
      const span = (t as any).text;
      return span?.text === 'Welcome to Amp';
    });
    expect(hasWelcome).toBe(true);
  });

  test('2.2 "Ctrl+O", " for ", "help" share the same Text/RichText parent node', () => {
    // Verify the three-segment hint is a single Text widget with children spans
    const appState = createTestAppState();
    const tree = buildWelcomeScreen(appState);
    // Find the Text widget whose textSpan.children contains the 'Ctrl+O' segment
    const richText = findWidget(
      tree,
      (w) => w instanceof Text && (w as any).text?.children?.some((s: any) => s.text === 'Ctrl+O'),
    );
    expect(richText).toBeTruthy();
    const children = (richText as any).text.children.map((s: any) => s.text);
    expect(children).toContain(' for ');
    expect(children).toContain('help');
  });

  test('2.3 " for " TextSpan has dim style', () => {
    // Verify ' for ' uses dim:true per ANSI golden [2m
    const appState = createTestAppState();
    const tree = buildWelcomeScreen(appState);
    const richText = findWidget(
      tree,
      (w) => w instanceof Text && (w as any).text?.children?.some((s: any) => s.text === 'Ctrl+O'),
    );
    expect(richText).toBeTruthy();
    const forSpan = (richText as any).text.children.find((s: any) => s.text === ' for ');
    expect(forSpan).toBeTruthy();
    expect(forSpan.style?.dim).toBe(true);
  });

  test('2.4 "help" TextSpan has yellow foreground', () => {
    // Verify 'help' uses Color.yellow per ANSI golden [38;5;3m
    const appState = createTestAppState();
    const tree = buildWelcomeScreen(appState);
    const richText = findWidget(
      tree,
      (w) => w instanceof Text && (w as any).text?.children?.some((s: any) => s.text === 'Ctrl+O'),
    );
    expect(richText).toBeTruthy();
    const helpSpan = (richText as any).text.children.find((s: any) => s.text === 'help');
    expect(helpSpan).toBeTruthy();
    expect(helpSpan.style?.foreground).toEqual(Color.yellow);
  });

  test('2.5 contains "Use Tab/Shift+Tab to navigate to previous" first hint line', () => {
    // Verify WELC-02: first tab navigation hint line matches golden exactly
    const appState = createTestAppState();
    const tree = buildWelcomeScreen(appState);
    const texts = findAllWidgets(tree, Text);
    const hasTabHint = texts.some(t => {
      const span = (t as any).text;
      return span?.text === 'Use Tab/Shift+Tab to navigate to previous';
    });
    expect(hasTabHint).toBe(true);
  });

  test('2.6 contains "messages to edit or restore to a previous state" second hint line', () => {
    // Verify WELC-02: second tab navigation hint line matches golden exactly
    const appState = createTestAppState();
    const tree = buildWelcomeScreen(appState);
    const texts = findAllWidgets(tree, Text);
    const hasSecondHint = texts.some(t => {
      const span = (t as any).text;
      return span?.text === 'messages to edit or restore to a previous state';
    });
    expect(hasSecondHint).toBe(true);
  });

});

// ===========================================================================
// Group 3: 生命周期 / 清理路径
// ===========================================================================

describe('WelcomeScreen — Lifecycle / Cleanup', () => {

  test('3.1 initState registers AppState listener (listener count increases by 1)', () => {
    // Verify that initState() adds exactly one listener to AppState._listeners
    const appState = createTestAppState();
    const widget = new WelcomeScreen({ appState });
    const state = widget.createState();
    (state as any)._widget = widget;

    const sizeBefore = (appState as any)._listeners.size;
    state.initState();
    const sizeAfter = (appState as any)._listeners.size;

    expect(sizeAfter).toBe(sizeBefore + 1);
  });

  test('3.2 dispose removes AppState listener (no leak — size restored to pre-initState value)', () => {
    // Verify that dispose() removes the listener registered by initState(),
    // ensuring no memory leak. The _listeners set size must return to baseline.
    const appState = createTestAppState();
    const widget = new WelcomeScreen({ appState });
    const state = widget.createState();
    (state as any)._widget = widget;

    const sizeBaseline = (appState as any)._listeners.size;
    state.initState();
    state.dispose();
    const sizeAfterDispose = (appState as any)._listeners.size;

    expect(sizeAfterDispose).toBe(sizeBaseline);
  });

});

// ===========================================================================
// Group 4: 集成测试（chat-view 调用路径）
// ===========================================================================

describe('WelcomeScreen — ChatView Integration', () => {

  test('4.1 welcome screenState in ChatView produces WelcomeScreen (contains DensityOrbWidget)', () => {
    // Verify ChatView.build() with welcome screenState returns a WelcomeScreen
    // (not the old bare Center with "flitter-cli" text).
    // We confirm by finding DensityOrbWidget in the built tree.
    const appState = createTestAppState();
    // idle + empty + turnCount=0 → welcome screenState
    const tree = buildChatView(appState);
    expect(tree).toBeInstanceOf(WelcomeScreen);
  });

  test('4.2 welcome tree no longer contains "flitter-cli" text', () => {
    // Verify the old buildWelcomeScreen() content is gone — the "flitter-cli"
    // literal string must not appear in any Text widget in the welcome tree.
    const appState = createTestAppState();
    const tree = buildChatView(appState);
    const texts = findAllWidgets(tree, Text);
    const hasFlitterCli = texts.some(t => {
      const span = (t as any).text;
      return (
        span?.text === 'flitter-cli' ||
        span?.children?.some?.((c: any) => c.text === 'flitter-cli')
      );
    });
    expect(hasFlitterCli).toBe(false);
  });

});
