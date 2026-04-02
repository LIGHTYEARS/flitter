// PromptController — orchestrates prompt submission, stream dispatch,
// cancellation, and error propagation between Provider and SessionState.
//
// This is the bridge between user intent (submit/cancel) and the session
// state machine. It drives the deterministic lifecycle: idle -> processing
// -> streaming -> complete/cancelled/error.

import type { Provider } from '../provider/provider';
import type { SessionState } from './session';
import type { ConversationItem, StreamEvent } from './types';
import { log } from '../utils/logger';

/** Constructor options for PromptController. */
export interface PromptControllerOptions {
  session: SessionState;
  provider: Provider;
}

/**
 * PromptController orchestrates the prompt submission lifecycle.
 *
 * Responsibilities:
 * - Submit user prompts through the provider and dispatch stream events to session
 * - Prevent double-submission while a prompt is in-flight
 * - Auto-reset from terminal states before new submissions
 * - Drive session through processing -> streaming -> complete lifecycle
 * - Handle cancellation via provider.cancelRequest()
 * - Catch and propagate errors to session.handleError()
 * - Track elapsed time during processing/streaming
 */
export class PromptController {
  private _session: SessionState;
  private _provider: Provider;
  private _isSubmitting: boolean = false;
  private _elapsedTimer: ReturnType<typeof setInterval> | null = null;
  private _promptStartedAt: number | null = null;

  /** Elapsed milliseconds since the current prompt started. */
  elapsedMs: number = 0;

  constructor(options: PromptControllerOptions) {
    this._session = options.session;
    this._provider = options.provider;
  }

  /**
   * Submit a user prompt, streaming the provider response through the session.
   *
   * Guards against double-submission. Automatically resets from terminal
   * states (complete/cancelled/error) before starting a new prompt.
   * Drives the session lifecycle: processing -> streaming -> complete/error.
   */
  async submitPrompt(text: string): Promise<void> {
    const lifecycle = this._session.lifecycle;

    // Prevent double-submit while actively processing/streaming
    if (this._isSubmitting) {
      log.debug('PromptController: submitPrompt ignored — already submitting');
      return;
    }

    // Auto-reset from terminal states
    if (lifecycle === 'complete' || lifecycle === 'cancelled' || lifecycle === 'error') {
      this._session.reset();
    }

    // Guard: only submit from idle
    if (this._session.lifecycle !== 'idle') {
      log.warn(`PromptController: submitPrompt ignored — lifecycle is '${this._session.lifecycle}'`);
      return;
    }

    this._isSubmitting = true;
    this._startElapsedTimer();

    // Transition to processing and add user message
    this._session.startProcessing(text);

    try {
      // Build messages array from conversation history
      const messages = this._buildMessages(this._session.items);

      // Get the stream from the provider
      const stream = this._provider.sendPrompt(messages, {});
      let hasBegunStreaming = false;

      for await (const event of stream) {
        // Transition to streaming on first content event
        if (!hasBegunStreaming && (event.type === 'text_delta' || event.type === 'thinking_delta')) {
          this._session.beginStreaming();
          hasBegunStreaming = true;
        }

        this._dispatchEvent(event);

        // Terminal events — stop processing
        if (event.type === 'message_complete' || event.type === 'error') {
          break;
        }
      }
    } catch (err) {
      // Provider threw an exception — route to session error
      const errMsg = err instanceof Error ? err.message : String(err);
      log.error(`PromptController: provider error: ${errMsg}`);

      // Only route to handleError if session is still in an active state.
      // The session may have already transitioned (e.g., cancelled) so we
      // read lifecycle as a string to avoid tsc narrowing issues.
      const currentLifecycle: string = this._session.lifecycle;
      if (currentLifecycle === 'processing' || currentLifecycle === 'streaming') {
        this._session.handleError({
          message: errMsg,
          code: 'PROVIDER_ERROR',
          retryable: false,
        });
      }
    } finally {
      this._stopElapsedTimer();
      this._isSubmitting = false;
    }
  }

  /**
   * Cancel the in-flight prompt.
   *
   * No-op if the session is not processing or streaming.
   * Aborts the provider HTTP request and transitions session to cancelled.
   */
  cancel(): void {
    const lifecycle = this._session.lifecycle;
    if (lifecycle !== 'processing' && lifecycle !== 'streaming') {
      return;
    }

    this._provider.cancelRequest();
    this._session.cancelStream();
    this._stopElapsedTimer();
  }

  /**
   * Dispatch a single StreamEvent to the appropriate SessionState method.
   */
  private _dispatchEvent(event: StreamEvent): void {
    switch (event.type) {
      case 'text_delta':
        this._session.appendAssistantChunk(event.text);
        break;

      case 'thinking_delta':
        this._session.appendThinkingChunk(event.text);
        break;

      case 'tool_call_start':
        this._session.addToolCall(
          event.toolCallId,
          event.title,
          event.kind,
          'pending',
        );
        break;

      case 'tool_call_end':
        this._session.updateToolCall(
          event.toolCallId,
          event.status,
          undefined,
          event.rawOutput ? { raw: event.rawOutput } : undefined,
        );
        break;

      case 'usage_update':
        this._session.setUsage(event.usage);
        break;

      case 'message_complete':
        this._session.completeStream(event.stopReason);
        this._stopElapsedTimer();
        break;

      case 'error':
        this._session.handleError(event.error);
        this._stopElapsedTimer();
        break;
    }
  }

  /**
   * Build provider-compatible messages from conversation items.
   *
   * Maps user_message to role:'user', assistant_message to role:'assistant'.
   * Skips thinking, tool_call, plan, and system_message items — those are
   * not part of the basic provider message format.
   */
  private _buildMessages(
    items: ReadonlyArray<ConversationItem>,
  ): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];

    for (const item of items) {
      switch (item.type) {
        case 'user_message':
          messages.push({ role: 'user', content: item.text });
          break;
        case 'assistant_message':
          if (item.text) {
            messages.push({ role: 'assistant', content: item.text });
          }
          break;
        // Skip thinking, tool_call, plan, system_message for provider messages
      }
    }

    return messages;
  }

  /** Start the elapsed-time timer (ticks every 100ms). */
  private _startElapsedTimer(): void {
    this._stopElapsedTimer();
    this._promptStartedAt = Date.now();
    this.elapsedMs = 0;
    this._elapsedTimer = setInterval(() => {
      if (this._promptStartedAt !== null) {
        this.elapsedMs = Date.now() - this._promptStartedAt;
      }
    }, 100);
  }

  /** Stop the elapsed-time timer. */
  private _stopElapsedTimer(): void {
    if (this._elapsedTimer !== null) {
      clearInterval(this._elapsedTimer);
      this._elapsedTimer = null;
    }
    if (this._promptStartedAt !== null) {
      this.elapsedMs = Date.now() - this._promptStartedAt;
      this._promptStartedAt = null;
    }
  }
}
