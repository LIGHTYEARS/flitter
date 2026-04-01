/**
 * app-test-harness — multi-frame headless test harness for flitter-amp.
 *
 * Unlike captureToGrid() which resets singletons in a try/finally block
 * (single-frame pattern), this harness keeps the WidgetsBinding alive
 * across multiple frames, enabling stateful integration tests that
 * simulate ACP session updates and observe incremental UI changes.
 *
 * Usage:
 *   const h = createAppTestHarness(120, 40);
 *   h.simulateFullPrompt('hello', 'Hi there!');
 *   expect(h.findText('Hi there!').length).toBeGreaterThan(0);
 *   h.cleanup();
 */

import { WidgetsBinding } from 'flitter-core/src/framework/binding';
import { FrameScheduler } from 'flitter-core/src/scheduler/frame-scheduler';
import { TextEditingController } from 'flitter-core/src/widgets/text-field';
import type * as acp from '@agentclientprotocol/sdk';
import { AppState } from '../state/app-state';
import { App } from '../app';

export interface AppTestHarness {
  binding: WidgetsBinding;
  appState: AppState;
  inputController: TextEditingController;

  /** Flush streaming text and draw a synchronous frame. */
  drawFrame: () => void;

  /** Read all characters in row `y`, right-trimmed. */
  readRow: (y: number) => string;

  /** Return a grid object with getCell(x,y) for cell-level assertions. */
  readGrid: () => {
    getCell: (x: number, y: number) => { char: string; style: any };
    width: number;
    height: number;
  };

  /** Find all occurrences of `text` in the rendered screen. */
  findText: (text: string) => Array<{ x: number; y: number }>;

  /** Tear down the binding. Must be called in afterEach/finally. */
  cleanup: () => void;

  /** Feed a raw ACP SessionUpdate and draw a frame. */
  simulateSessionUpdate: (update: acp.SessionUpdate) => void;

  /** Simulate a full prompt cycle: user message → agent reply → prompt complete. */
  simulateFullPrompt: (userText: string, agentReply: string) => void;
}

/**
 * Create a multi-frame test harness that mounts the App widget and
 * exposes helpers for driving ACP state changes and reading the screen.
 *
 * The binding is NOT reset in a finally block — callers must invoke
 * `cleanup()` explicitly so that multiple frames can be drawn between
 * setup and teardown.
 */
export function createAppTestHarness(cols?: number, rows?: number): AppTestHarness {
  const c = cols ?? 120;
  const r = rows ?? 40;

  WidgetsBinding.reset();
  FrameScheduler.reset();

  const binding = WidgetsBinding.instance;
  binding.handleResize(c, r);

  const appState = new AppState();
  const inputController = new TextEditingController();

  const app = new App({
    appState,
    onSubmit: () => {},
    onCancel: () => {},
    inputController,
  });

  binding.attachRootWidget(app);
  binding.requestForcedPaintFrame();
  binding.drawFrameSync();

  /**
   * Read all characters in a single row from the front buffer.
   * Trailing whitespace is stripped.
   */
  function readRow(y: number): string {
    const screen = binding.getScreen();
    const frontBuffer = screen.getFrontBuffer();
    const w = screen.width;
    let result = '';
    for (let x = 0; x < w; x++) {
      result += frontBuffer.getCell(x, y).char;
    }
    return result.replace(/\s+$/, '');
  }

  return {
    binding,
    appState,
    inputController,

    /**
     * Flush any buffered streaming text, then force a synchronous frame.
     */
    drawFrame() {
      appState.conversation.flushStreamingText();
      binding.requestForcedPaintFrame();
      binding.drawFrameSync();
    },

    readRow,

    /**
     * Return a grid snapshot backed by the live front buffer.
     * Out-of-bounds reads return a blank cell.
     */
    readGrid() {
      const screen = binding.getScreen();
      const frontBuffer = screen.getFrontBuffer();
      const w = screen.width;
      const h = screen.height;
      return {
        width: w,
        height: h,
        getCell(x: number, y: number) {
          if (x < 0 || x >= w || y < 0 || y >= h) return { char: ' ', style: {} };
          const cell = frontBuffer.getCell(x, y);
          return { char: cell.char, style: cell.style };
        },
      };
    },

    /**
     * Scan every row for occurrences of `text` and return their positions.
     */
    findText(text: string) {
      const results: Array<{ x: number; y: number }> = [];
      const screen = binding.getScreen();
      const h = screen.height;
      for (let y = 0; y < h; y++) {
        const row = readRow(y);
        let idx = 0;
        while ((idx = row.indexOf(text, idx)) !== -1) {
          results.push({ x: idx, y });
          idx += 1;
        }
      }
      return results;
    },

    /**
     * Feed a raw ACP SessionUpdate into AppState and draw a frame.
     * The streaming buffer is flushed before rendering so that
     * agent_message_chunk text is visible in the front buffer.
     */
    simulateSessionUpdate(update: acp.SessionUpdate) {
      appState.onSessionUpdate('test-session', update);
      appState.conversation.flushStreamingText();
      binding.requestForcedPaintFrame();
      binding.drawFrameSync();
    },

    /**
     * Drive a complete prompt round-trip:
     * 1. User sends `userText` (startProcessing)
     * 2. Agent replies with a single `agent_message_chunk`
     * 3. Prompt completes with stop reason `end_turn`
     *
     * Each step flushes streaming text and draws a frame so that
     * assertions can inspect intermediate states if needed.
     */
    simulateFullPrompt(userText: string, agentReply: string) {
      appState.startProcessing(userText);
      appState.conversation.flushStreamingText();
      binding.requestForcedPaintFrame();
      binding.drawFrameSync();

      appState.onSessionUpdate('test-session', {
        sessionUpdate: 'agent_message_chunk',
        content: { type: 'text', text: agentReply },
      } as acp.SessionUpdate);
      appState.conversation.flushStreamingText();
      binding.requestForcedPaintFrame();
      binding.drawFrameSync();

      appState.onPromptComplete('test-session', 'end_turn');
      appState.conversation.flushStreamingText();
      binding.requestForcedPaintFrame();
      binding.drawFrameSync();
    },

    /**
     * Reset the WidgetsBinding and FrameScheduler singletons.
     * Must be called after each test to avoid polluting other tests.
     */
    cleanup() {
      WidgetsBinding.reset();
      FrameScheduler.reset();
    },
  };
}
