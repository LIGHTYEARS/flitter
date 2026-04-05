// Stream event builder helpers for concise test setup.
//
// Provides terse factory functions for creating StreamEvent objects
// used in MockProvider.mockEvents / MockProvider.callSequences.

import type { StreamEvent } from '../state/types';

/** Create a text_delta event. */
export function textDelta(text: string): StreamEvent {
  return { type: 'text_delta', text };
}

/** Create a thinking_delta event. */
export function thinkingDelta(text: string): StreamEvent {
  return { type: 'thinking_delta', text };
}

/** Create a tool_call_start event. */
export function toolCallStart(id: string, name: string, kind?: string): StreamEvent {
  return { type: 'tool_call_start', toolCallId: id, name, title: name, kind: kind ?? name };
}

/** Create a tool_call_ready event. */
export function toolCallReady(id: string, name: string, input?: Record<string, unknown>): StreamEvent {
  return { type: 'tool_call_ready', toolCallId: id, name, input: input ?? {} };
}

/** Create a tool_call_end event. */
export function toolCallEnd(id: string, status: 'completed' | 'failed', rawOutput?: string): StreamEvent {
  return { type: 'tool_call_end', toolCallId: id, status, rawOutput };
}

/** Create a usage_update event. */
export function usageUpdate(size: number, used: number, cost?: { amount: number; currency: string }): StreamEvent {
  return { type: 'usage_update', usage: { size, used, cost } };
}

/** Create a message_complete event. */
export function messageComplete(stopReason: string = 'end_turn'): StreamEvent {
  return { type: 'message_complete', stopReason } as StreamEvent;
}

/** Create an error event. */
export function streamError(message: string, code: string | null = null, retryable = false): StreamEvent {
  return { type: 'error', error: { message, code, retryable } };
}
