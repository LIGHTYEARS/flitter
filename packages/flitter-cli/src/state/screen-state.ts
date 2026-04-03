// ScreenState — first-class screen state derivation for flitter-cli TUI.
//
// Derives the current "screen mode" from session lifecycle and conversation state.
// The TUI layer uses ScreenState to decide which placeholder, spinner, error card,
// or normal chat view to render. This is a pure derivation — no side effects,
// no stored state, call it on every render frame.
//
// Six variants:
//   welcome     — first launch, no history, show onboarding
//   empty       — new thread after previous conversation, show prompt hint
//   loading     — first prompt submitted, waiting for stream to start
//   processing  — actively processing or streaming a response
//   error       — session error with recovery context
//   ready       — idle with conversation history, normal chat

import type { SessionLifecycle, SessionError } from './types';

// ---------------------------------------------------------------------------
// ScreenState Discriminated Union
// ---------------------------------------------------------------------------

/** First-launch state — no session history, show welcome/onboarding. */
export interface WelcomeScreen { kind: 'welcome'; }

/** Conversation cleared (new thread) — show empty state with prompt hint. */
export interface EmptyScreen { kind: 'empty'; }

/** First prompt submitted, waiting for streaming to begin. */
export interface LoadingScreen { kind: 'loading'; }

/** Actively processing or streaming a response. */
export interface ProcessingScreen { kind: 'processing'; }

/** Session entered error state — show error with recovery options. */
export interface ErrorScreen { kind: 'error'; error: SessionError; }

/** Idle with conversation history — normal chat state. */
export interface ReadyScreen { kind: 'ready'; }

/** Discriminated union of all screen states. */
export type ScreenState =
  | WelcomeScreen
  | EmptyScreen
  | LoadingScreen
  | ProcessingScreen
  | ErrorScreen
  | ReadyScreen;

// ---------------------------------------------------------------------------
// Derivation Function
// ---------------------------------------------------------------------------

/**
 * Derive the current screen state from session lifecycle and conversation state.
 *
 * This is a pure function with no side effects — call it whenever the UI
 * needs to know which screen/placeholder to render.
 *
 * Priority ordering: error > loading > processing > welcome > empty > ready.
 *
 * @param lifecycle - Current SessionLifecycle state
 * @param conversationIsEmpty - Whether the conversation items array is empty
 * @param turnCount - Number of turns in metadata (persists across newThread)
 * @param error - Current SessionError or null
 * @returns The derived ScreenState
 */
export function deriveScreenState(
  lifecycle: SessionLifecycle,
  conversationIsEmpty: boolean,
  turnCount: number,
  error: SessionError | null,
): ScreenState {
  // 1. Error takes highest priority
  if (lifecycle === 'error' && error !== null) {
    return { kind: 'error', error };
  }

  // 2. Processing + empty = loading (first prompt, no stream yet)
  if (lifecycle === 'processing' && conversationIsEmpty) {
    return { kind: 'loading' };
  }

  // 3. Processing or streaming = actively working
  if (lifecycle === 'processing' || lifecycle === 'streaming') {
    return { kind: 'processing' };
  }

  // 4. Idle + empty + no previous turns = welcome (first launch)
  if (lifecycle === 'idle' && conversationIsEmpty && turnCount === 0) {
    return { kind: 'welcome' };
  }

  // 5. Idle + empty + had turns = empty (new thread after conversation)
  if (lifecycle === 'idle' && conversationIsEmpty && turnCount > 0) {
    return { kind: 'empty' };
  }

  // 6. Otherwise (idle/complete/cancelled with items) = ready
  return { kind: 'ready' };
}
