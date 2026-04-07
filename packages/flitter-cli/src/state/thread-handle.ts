// thread-handle.ts -- Factory for creating ThreadHandle instances.
//
// Each ThreadHandle wraps a per-thread SessionState + ConversationState.
// Mirrors AMP's yZR class from 20_thread_management.js SECTION 2c.

import { SessionState } from './session';
import { ConversationState } from './conversation';
import type { ThreadHandle, ThreadID, ThreadVisibility } from './types';
import { generateThreadID } from './types';

/**
 * Options for creating a new ThreadHandle.
 */
export interface CreateThreadHandleOptions {
  /** Thread ID. If omitted, a new "T-{uuid}" ID is generated. */
  threadID?: ThreadID;
  /** Working directory for the thread's session. */
  cwd: string;
  /** Model name for the thread's session. */
  model: string;
  /** Initial thread title (null for auto-generation later). */
  title?: string | null;
  /** Thread visibility. Defaults to 'visible'. */
  visibility?: ThreadVisibility;
  /** Agent mode active at creation time. */
  agentMode?: string | null;
  /** Whether tool calls default to expanded. */
  defaultToolExpanded?: boolean;
}

/**
 * Create a new ThreadHandle with fresh SessionState and ConversationState.
 * Each thread gets its own independent state instances to enable concurrent
 * thread execution without shared mutable state.
 */
export function createThreadHandle(options: CreateThreadHandleOptions): ThreadHandle {
  const threadID = options.threadID ?? generateThreadID();

  const session = new SessionState({
    sessionId: threadID,
    cwd: options.cwd,
    model: options.model,
    title: options.title ?? null,
    defaultToolExpanded: options.defaultToolExpanded,
  });

  const conversation = new ConversationState(session);

  return {
    threadID,
    session,
    conversation,
    title: options.title ?? null,
    createdAt: Date.now(),
    visibility: options.visibility ?? 'visible',
    agentMode: options.agentMode ?? null,
  };
}
