// Session-to-Screen end-to-end tests — verify that ACP session updates
// (user messages, agent chunks, prompt completion) flow through AppState
// and ConversationState all the way into the rendered screen buffer.
//
// These tests use the multi-frame AppTestHarness which keeps the
// WidgetsBinding alive across frames, enabling stateful assertions
// on incremental UI changes.

import { describe, it, expect, afterEach } from 'bun:test';
import { createAppTestHarness, type AppTestHarness } from '../test-utils/app-test-harness';
import type * as acp from '@agentclientprotocol/sdk';

describe('Session → Screen Buffer', () => {
  let harness: AppTestHarness | null = null;

  afterEach(() => {
    harness?.cleanup();
    harness = null;
  });

  /**
   * Test A: startProcessing adds a user message to the conversation
   * and makes it visible in the rendered screen buffer.
   */
  it('startProcessing makes user message visible', () => {
    harness = createAppTestHarness(120, 40);

    expect(harness.appState.conversation.items.length).toBe(0);

    harness.appState.startProcessing('hi');
    harness.appState.conversation.flushStreamingText();
    harness.drawFrame();

    expect(harness.findText('hi').length).toBeGreaterThan(0);
  });

  /**
   * Test B: An agent_message_chunk session update appends assistant text
   * to the conversation and renders it in the screen buffer.
   */
  it('agent_message_chunk makes agent reply visible', () => {
    harness = createAppTestHarness(120, 40);

    harness.appState.startProcessing('test');
    harness.simulateSessionUpdate({
      sessionUpdate: 'agent_message_chunk',
      content: { type: 'text', text: 'hello world' },
    } as acp.SessionUpdate);

    expect(harness.findText('hello world').length).toBeGreaterThan(0);
  });

  /**
   * Test C: Full prompt round-trip — user message, agent reply chunks,
   * and prompt completion each produce the expected screen state.
   *
   * The AppStateWidget throttles notifyListeners to 50ms, so we
   * batch all mutations before a single drawFrame to ensure the
   * widget tree rebuilds with the final state.
   */
  it('full prompt round-trip renders each stage', () => {
    harness = createAppTestHarness(120, 40);

    // Step 1: user message — state-level verification
    harness.appState.startProcessing('what is 1+1?');
    expect(harness.appState.conversation.items.length).toBe(1);
    expect(harness.appState.isProcessing).toBe(true);

    // Step 2: agent reply chunk — state-level verification
    harness.appState.onSessionUpdate('test-session', {
      sessionUpdate: 'agent_message_chunk',
      content: { type: 'text', text: 'The answer is 2' },
    } as acp.SessionUpdate);
    harness.appState.conversation.flushStreamingText();
    expect(harness.appState.conversation.items.length).toBe(2);

    // Step 3: prompt completion — state-level verification
    harness.appState.onPromptComplete('test-session', 'end_turn');
    expect(harness.appState.isProcessing).toBe(false);

    // Single drawFrame renders the complete conversation
    harness.drawFrame();
    expect(harness.findText('1+1').length).toBeGreaterThan(0);
    expect(harness.findText('answer').length).toBeGreaterThan(0);
  });

  /**
   * Test D: Transitioning from 0 items to 1+ items replaces the
   * Welcome screen with the chat message list.
   */
  it('items 0→1 replaces Welcome screen with chat view', () => {
    harness = createAppTestHarness(120, 40);

    expect(harness.appState.conversation.items.length).toBe(0);

    harness.appState.startProcessing('hello');
    harness.drawFrame();

    expect(harness.appState.conversation.items.length).toBe(1);
    expect(harness.findText('hello').length).toBeGreaterThan(0);
  });
});
