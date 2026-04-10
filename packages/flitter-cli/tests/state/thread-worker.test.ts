// thread-worker.test.ts -- Tests for the ThreadWorker event-driven state machine.
//
// Validates delta event handling, AbortController lifecycle, error/retry,
// dispose cleanup, and legacy compatibility getters.

import { describe, it, expect, beforeEach } from 'bun:test';
import { ThreadWorker } from '../../src/state/thread-worker';
import type { ThreadID } from '../../src/state/types';

describe('ThreadWorker', () => {
  let worker: ThreadWorker;

  beforeEach(() => {
    worker = new ThreadWorker('T-test-1' as ThreadID);
  });

  // -------------------------------------------------------------------------
  // 1. Initial state
  // -------------------------------------------------------------------------
  it('initializes with idle state and null fields', () => {
    expect(worker.threadID).toBe('T-test-1');
    expect(worker.state).toBe('idle');
    expect(worker.inferenceState).toBe('none');
    expect(worker.ops.inference).toBeNull();
    expect(worker.ops.titleGeneration).toBeNull();
    expect(Object.keys(worker.ops.tools)).toEqual([]);
    expect(worker.ephemeralError).toBeNull();
    expect(worker.retryCountdownSeconds).toBe(0);
    expect(worker.turnStartTime).toBeNull();
    expect(worker.isIdle).toBe(true);
    expect(worker.isRunning).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 2. handle user:message-queue:dequeue
  // -------------------------------------------------------------------------
  it('transitions to running/streaming on dequeue', () => {
    worker.handle({ type: 'user:message-queue:dequeue' });

    expect(worker.state).toBe('running');
    expect(worker.inferenceState).toBe('streaming');
    expect(worker.ops.inference).not.toBeNull();
    expect(worker.ops.inference).toBeInstanceOf(AbortController);
    expect(worker.turnStartTime).not.toBeNull();
    expect(typeof worker.turnStartTime).toBe('number');
    expect(worker.isRunning).toBe(true);
    expect(worker.isIdle).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 3. handle inference:completed
  // -------------------------------------------------------------------------
  it('returns to idle on inference:completed', () => {
    worker.handle({ type: 'user:message-queue:dequeue' });
    expect(worker.state).toBe('running');

    worker.handle({ type: 'inference:completed' });

    expect(worker.state).toBe('idle');
    expect(worker.inferenceState).toBe('none');
    expect(worker.ops.inference).toBeNull();
    expect(worker.turnStartTime).toBeNull();
    expect(worker.isIdle).toBe(true);
    expect(worker.isRunning).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 4. handle cancelled
  // -------------------------------------------------------------------------
  it('transitions to cancelled and aborts inference controller', () => {
    worker.handle({ type: 'user:message-queue:dequeue' });
    const controller = worker.ops.inference!;
    expect(controller.signal.aborted).toBe(false);

    worker.handle({ type: 'cancelled' });

    expect(worker.state).toBe('cancelled');
    expect(worker.inferenceState).toBe('none');
    expect(worker.ops.inference).toBeNull();
    expect(controller.signal.aborted).toBe(true);
    expect(worker.turnStartTime).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 5. handle tool:data
  // -------------------------------------------------------------------------
  it('transitions to tool_running on tool:data', () => {
    worker.handle({ type: 'user:message-queue:dequeue' });

    worker.handle({ type: 'tool:data', payload: { toolCallId: 'tc1' } });

    expect(worker.state).toBe('tool_running');
    expect(worker.inferenceState).toBe('tool_call');
    expect(worker.toolCallUpdates).toEqual([{ toolCallId: 'tc1' }]);
    expect(worker.isRunning).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 6. handle error
  // -------------------------------------------------------------------------
  it('transitions to error state with ephemeral error and retry countdown', () => {
    worker.handle({ type: 'error', payload: 'Rate limited' });

    expect(worker.state).toBe('error');
    expect(worker.ephemeralError).toBe('Rate limited');
    expect(worker.retryCountdownSeconds).toBe(5);
    expect(worker.retryTimer).not.toBeNull();

    // Clean up timer to avoid leaking in tests
    worker.dispose();
  });

  it('defaults ephemeral error to "Unknown error" when no payload', () => {
    worker.handle({ type: 'error' });

    expect(worker.ephemeralError).toBe('Unknown error');

    worker.dispose();
  });

  // -------------------------------------------------------------------------
  // 7. handle user:message-queue:enqueue when idle
  // -------------------------------------------------------------------------
  it('remains idle on enqueue when idle (caller should dequeue)', () => {
    expect(worker.state).toBe('idle');

    worker.handle({ type: 'user:message-queue:enqueue' });

    expect(worker.state).toBe('idle');
  });

  // -------------------------------------------------------------------------
  // 8. handle user:message-queue:enqueue when running
  // -------------------------------------------------------------------------
  it('remains running on enqueue when running (message stays queued)', () => {
    worker.handle({ type: 'user:message-queue:dequeue' });
    expect(worker.state).toBe('running');

    worker.handle({ type: 'user:message-queue:enqueue' });

    expect(worker.state).toBe('running');
  });

  // -------------------------------------------------------------------------
  // 9. handle assistant:message
  // -------------------------------------------------------------------------
  it('sets inferenceState to streaming on assistant:message', () => {
    worker.handle({ type: 'user:message-queue:dequeue' });
    // After tool:data, inferenceState is tool_call
    worker.handle({ type: 'tool:data' });
    expect(worker.inferenceState).toBe('tool_call');

    worker.handle({ type: 'assistant:message' });

    expect(worker.inferenceState).toBe('streaming');
  });

  // -------------------------------------------------------------------------
  // 10. handle thread:truncate
  // -------------------------------------------------------------------------
  it('resets fileChanges and toolCallUpdates on thread:truncate', () => {
    worker.fileChanges = ['file1.ts', 'file2.ts'];
    worker.toolCallUpdates = [{ id: 1 }, { id: 2 }];

    worker.handle({ type: 'thread:truncate' });

    expect(worker.fileChanges).toEqual([]);
    expect(worker.toolCallUpdates).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // 11. handle title:generation (toggle)
  // -------------------------------------------------------------------------
  it('creates and clears titleGeneration AbortController on toggle', () => {
    expect(worker.ops.titleGeneration).toBeNull();

    // First call: start title generation
    worker.handle({ type: 'title:generation' });
    expect(worker.ops.titleGeneration).not.toBeNull();
    expect(worker.ops.titleGeneration).toBeInstanceOf(AbortController);

    // Second call: complete title generation
    worker.handle({ type: 'title:generation' });
    expect(worker.ops.titleGeneration).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 12. abortInference
  // -------------------------------------------------------------------------
  it('aborts inference controller and sets state to cancelled', () => {
    worker.handle({ type: 'user:message-queue:dequeue' });
    const controller = worker.ops.inference!;

    worker.abortInference();

    expect(controller.signal.aborted).toBe(true);
    expect(worker.ops.inference).toBeNull();
    expect(worker.state).toBe('cancelled');
  });

  // -------------------------------------------------------------------------
  // 13. abortTitleGeneration
  // -------------------------------------------------------------------------
  it('aborts title generation controller and clears it', () => {
    worker.handle({ type: 'title:generation' });
    const controller = worker.ops.titleGeneration!;

    worker.abortTitleGeneration();

    expect(controller.signal.aborted).toBe(true);
    expect(worker.ops.titleGeneration).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 14. dispose
  // -------------------------------------------------------------------------
  it('disposes all operations and resets to idle', () => {
    // Set up some state
    worker.handle({ type: 'user:message-queue:dequeue' });
    worker.handle({ type: 'title:generation' });
    const inferCtrl = worker.ops.inference!;
    const titleCtrl = worker.ops.titleGeneration!;

    worker.dispose();

    expect(inferCtrl.signal.aborted).toBe(true);
    expect(titleCtrl.signal.aborted).toBe(true);
    expect(worker.ops.inference).toBeNull();
    expect(worker.ops.titleGeneration).toBeNull();
    expect(worker.state).toBe('idle');
    expect(worker.inferenceState).toBe('none');
    expect(worker.turnStartTime).toBeNull();
    expect(worker.ephemeralError).toBeNull();
    expect(worker.retryCountdownSeconds).toBe(0);
    expect(worker.retryTimer).toBeNull();
  });

  it('clears retry timer on dispose after error', () => {
    worker.handle({ type: 'error', payload: 'test error' });
    expect(worker.retryTimer).not.toBeNull();

    worker.dispose();

    expect(worker.retryTimer).toBeNull();
    expect(worker.ephemeralError).toBeNull();
    expect(worker.state).toBe('idle');
  });

  // -------------------------------------------------------------------------
  // 15. workerState legacy compat getter
  // -------------------------------------------------------------------------
  it('maps idle to "initial" in legacy workerState getter', () => {
    expect(worker.workerState).toBe('initial');
  });

  it('maps running to "active" in legacy workerState getter', () => {
    worker.handle({ type: 'user:message-queue:dequeue' });
    expect(worker.workerState).toBe('active');
  });

  it('maps tool_running to "active" in legacy workerState getter', () => {
    worker.handle({ type: 'user:message-queue:dequeue' });
    worker.handle({ type: 'tool:data' });
    expect(worker.workerState).toBe('active');
  });

  it('maps cancelled to "initial" in legacy workerState getter', () => {
    worker.handle({ type: 'user:message-queue:dequeue' });
    worker.handle({ type: 'cancelled' });
    expect(worker.workerState).toBe('initial');
  });

  it('maps error to "initial" in legacy workerState getter', () => {
    worker.handle({ type: 'error', payload: 'test' });
    expect(worker.workerState).toBe('initial');
    worker.dispose();
  });

  // -------------------------------------------------------------------------
  // 16. tool:data accumulates payloads
  // -------------------------------------------------------------------------
  it('accumulates multiple tool:data payloads', () => {
    worker.handle({ type: 'user:message-queue:dequeue' });

    worker.handle({ type: 'tool:data', payload: { id: 'tc1' } });
    worker.handle({ type: 'tool:data', payload: { id: 'tc2' } });
    worker.handle({ type: 'tool:data', payload: { id: 'tc3' } });

    expect(worker.toolCallUpdates).toEqual([
      { id: 'tc1' },
      { id: 'tc2' },
      { id: 'tc3' },
    ]);
  });

  // -------------------------------------------------------------------------
  // 17. tool:data without payload does not push undefined
  // -------------------------------------------------------------------------
  it('does not push undefined when tool:data has no payload', () => {
    worker.handle({ type: 'user:message-queue:dequeue' });
    worker.handle({ type: 'tool:data' });

    expect(worker.toolCallUpdates).toEqual([]);
    expect(worker.state).toBe('tool_running');
  });

  // -------------------------------------------------------------------------
  // 18. Full turn lifecycle: dequeue -> tool -> inference:completed
  // -------------------------------------------------------------------------
  it('handles full turn lifecycle: dequeue -> tool -> completed', () => {
    // Start turn
    worker.handle({ type: 'user:message-queue:dequeue' });
    expect(worker.state).toBe('running');
    expect(worker.isRunning).toBe(true);

    // Tool call
    worker.handle({ type: 'tool:data', payload: { id: 'bash' } });
    expect(worker.state).toBe('tool_running');
    expect(worker.isRunning).toBe(true);

    // Back to streaming after tool completes
    worker.handle({ type: 'assistant:message' });
    expect(worker.inferenceState).toBe('streaming');

    // Turn ends
    worker.handle({ type: 'inference:completed' });
    expect(worker.state).toBe('idle');
    expect(worker.isIdle).toBe(true);
    expect(worker.isRunning).toBe(false);
    expect(worker.turnStartTime).toBeNull();
  });
});
