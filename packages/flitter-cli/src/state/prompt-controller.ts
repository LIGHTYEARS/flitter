// PromptController — orchestrates prompt submission, agentic tool loop,
// stream dispatch, cancellation, and error propagation.
//
// This is the bridge between user intent (submit/cancel) and the session
// state machine. It drives the deterministic lifecycle:
//   idle -> processing -> streaming -> complete (simple turn)
//   idle -> processing -> streaming -> tool_execution -> processing -> ... (agentic loop)

import type { Provider, PromptOptions } from '../provider/provider';
import type { SessionState } from './session';
import type {
  ConversationItem,
  ProviderMessage,
  ContentBlock,
  ToolUseBlock,
  ToolResultBlock,
  StreamEvent,
  StreamToolCallReady,
  QueuedMessage,
  CompactionState,
  CompactionStatus,
} from './types';
import type { PermissionRequest, PermissionResult } from './permission-types';
import type { ToolRegistry } from '../tools/registry';
import type { ToolContext } from '../tools/executor';
import { log } from '../utils/logger';
import { computeDelay, sleep, isRetryableError, DEFAULT_RETRY_CONFIG } from '../provider/retry';
import type { RetryConfig } from '../provider/retry';

/** Maximum number of agentic loop iterations before forcing stop. */
const MAX_AGENTIC_ITERATIONS = 50;

/** Constructor options for PromptController. */
export interface PromptControllerOptions {
  session: SessionState;
  provider: Provider;
  /** Tool registry for executing tool calls. When null, tool calls are not executed. */
  toolRegistry?: ToolRegistry | null;
  /** System prompt to prepend to every API call. */
  systemPrompt?: string | null;
  /**
   * Optional callback invoked when a tool call requires user permission.
   * The callback should show a permission dialog and return the user's
   * selection (optionId) or null if dismissed.
   */
  onPermissionRequest?: (request: PermissionRequest) => Promise<PermissionResult>;
  /**
   * Optional callback invoked after the stream completes successfully.
   * Used by AppState to trigger session persistence after each turn.
   */
  onStreamComplete?: () => void;
  /**
   * Callback to get the active thread's queued messages.
   * Used for auto-dequeue on turn completion (QUEUE-02).
   */
  getQueuedMessages?: () => QueuedMessage[];
  /**
   * Callback to get context window usage percent (0-100).
   * Used for compaction threshold detection (COMP-01).
   */
  getContextUsagePercent?: () => number;
  /**
   * Callback to get the compaction threshold from ConfigService.
   * Defaults to 80 if not provided. (COMP-01).
   */
  getCompactionThreshold?: () => number;
}

/**
 * A pending tool call collected during streaming.
 * These are accumulated when tool_call_ready events arrive,
 * then executed after the stream completes with stopReason='tool_use'.
 */
interface PendingToolCall {
  toolCallId: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * PromptController orchestrates the prompt submission lifecycle and agentic loop.
 *
 * Responsibilities:
 * - Submit user prompts through the provider and dispatch stream events to session
 * - Collect tool_call_ready events during streaming
 * - When stopReason is 'tool_use': execute tools, build tool_result, re-submit (agentic loop)
 * - Prevent double-submission while a prompt is in-flight
 * - Auto-reset from terminal states before new submissions
 * - Drive session through processing -> streaming -> tool_execution -> processing -> ... -> complete
 * - Handle cancellation via provider.cancelRequest()
 * - Catch and propagate errors to session.handleError()
 * - Track elapsed time during processing/streaming
 */
export class PromptController {
  private _session: SessionState;
  private _provider: Provider;
  private _toolRegistry: ToolRegistry | null;
  private _systemPrompt: string | null;
  private _isSubmitting: boolean = false;
  private _elapsedTimer: ReturnType<typeof setInterval> | null = null;
  private _promptStartedAt: number | null = null;
  private _cancelled: boolean = false;

  /**
   * Optional permission request callback for tool call approval.
   */
  readonly onPermissionRequest: ((request: PermissionRequest) => Promise<PermissionResult>) | null;

  /**
   * Optional callback invoked after stream completes successfully.
   * Used by AppState to trigger session persistence.
   */
  private readonly _onStreamComplete: (() => void) | null;

  /** Compaction status tracking. Matches AMP's compactionState. */
  private _compactionState: CompactionState = 'idle';

  /** The message ID marking the oldest preserved message after compaction. */
  private _cutMessageId: string | null = null;

  /** Callback to get the active thread's queued messages (QUEUE-02). */
  private readonly _getQueuedMessages: (() => QueuedMessage[]) | null;

  /** Callback to get context window usage percent (COMP-01). */
  private readonly _getContextUsagePercent: (() => number) | null;

  /** Callback to get the compaction threshold from ConfigService (COMP-01). */
  private readonly _getCompactionThreshold: (() => number) | null;

  /** Elapsed milliseconds since the current prompt started. */
  elapsedMs: number = 0;

  constructor(options: PromptControllerOptions) {
    this._session = options.session;
    this._provider = options.provider;
    this._toolRegistry = options.toolRegistry ?? null;
    this._systemPrompt = options.systemPrompt ?? null;
    this.onPermissionRequest = options.onPermissionRequest ?? null;
    this._onStreamComplete = options.onStreamComplete ?? null;
    this._getQueuedMessages = options.getQueuedMessages ?? null;
    this._getContextUsagePercent = options.getContextUsagePercent ?? null;
    this._getCompactionThreshold = options.getCompactionThreshold ?? null;
  }

  /**
   * Get the current compaction status snapshot.
   * Matches AMP's RhR.getCompactionStatus() -> { compactionState }.
   */
  getCompactionStatus(): CompactionStatus {
    return {
      compactionState: this._compactionState,
      cutMessageId: this._cutMessageId,
      usagePercent: this._getContextUsagePercent?.() ?? 0,
    };
  }

  /**
   * Submit a user prompt, streaming the provider response through the session.
   * Implements the agentic loop: when the model requests tool calls,
   * executes them and re-submits with results until the model is done.
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
    this._cancelled = false;
    this._startElapsedTimer();

    // Transition to processing and add user message
    this._session.startProcessing(text);

    try {
      await this._agenticLoop();
    } catch (err) {
      // Provider threw an exception — route to session error
      const errMsg = err instanceof Error ? err.message : String(err);
      log.error(`PromptController: provider error: ${errMsg}`);

      const currentLifecycle: string = this._session.lifecycle;
      if (
        currentLifecycle === 'processing' ||
        currentLifecycle === 'streaming' ||
        currentLifecycle === 'tool_execution'
      ) {
        this._session.handleError({
          message: errMsg,
          code: 'PROVIDER_ERROR',
          retryable: false,
        });
      }
    } finally {
      this._stopElapsedTimer();
      this._isSubmitting = false;

      const finalLifecycle: string = this._session.lifecycle;
      if (finalLifecycle === 'complete' && this._onStreamComplete) {
        this._onStreamComplete();
      }
    }
  }

  /**
   * The core agentic loop:
   * 1. Send messages to provider
   * 2. Stream response, collecting pending tool calls
   * 3. If stopReason is 'tool_use': execute tools, add results, repeat from 1
   * 4. If stopReason is 'end_turn' (or other): complete
   */
  private async _agenticLoop(): Promise<void> {
    let iteration = 0;

    while (iteration < MAX_AGENTIC_ITERATIONS && !this._cancelled) {
      iteration++;
      log.info(`PromptController: agentic loop iteration ${iteration}`);

      // Build messages from conversation history
      const messages = this._buildMessages(this._session.items);

      // Build options with tool definitions and system prompt
      const options: PromptOptions = {};
      if (this._systemPrompt) {
        options.systemPrompt = this._systemPrompt;
      }
      if (this._toolRegistry && this._toolRegistry.size > 0) {
        options.tools = this._toolRegistry.getDefinitions();
        options.toolChoice = 'auto';
      }

      // Stream the response
      const { stopReason, pendingToolCalls } = await this._streamResponse(messages, options);

      // Check if we were cancelled during streaming
      if (this._cancelled) {
        return;
      }

      // If stopReason is 'tool_use' and we have pending tool calls, execute them
      if (stopReason === 'tool_use' && pendingToolCalls.length > 0 && this._toolRegistry) {
        // Transition to tool_execution
        this._session.beginToolExecution(stopReason);

        // Execute all pending tool calls
        const toolResults = await this._executeToolCalls(pendingToolCalls);

        if (this._cancelled) {
          return;
        }

        // Resume with tool results — transitions back to processing
        this._session.resumeAfterToolExecution(toolResults);

        // Continue the loop (will re-send messages with tool results)
        continue;
      }

      // Not a tool_use stop — check for auto-dequeue then compaction

      // --- Auto-dequeue on turn completion (QUEUE-02) ---
      // Matches AMP's inference:completed handler in 29_thread_worker_statemachine.js:
      //   if (this.thread.queuedMessages && this.thread.queuedMessages.length > 0)
      //     this.handle({ type: "user:message-queue:dequeue" });
      if (
        stopReason === 'end_turn' &&
        this._getQueuedMessages &&
        this._getQueuedMessages().length > 0
      ) {
        const queue = this._getQueuedMessages();
        const next = queue.shift(); // dequeue first message (FIFO)
        if (next) {
          log.info(`PromptController: auto-dequeue "${next.text.slice(0, 40)}..." (${queue.length} remaining)`);
          // Reset session for next turn and add user message
          this._session.reset();
          this._session.startProcessing(next.text);
          // Continue the agentic loop for this new message
          continue;
        }
      }

      // --- Compaction check (COMP-01) ---
      this._checkCompaction();

      return;
    }

    if (iteration >= MAX_AGENTIC_ITERATIONS) {
      log.warn(`PromptController: hit max agentic iterations (${MAX_AGENTIC_ITERATIONS})`);
      // Session should already be in a terminal state from the last stream
    }
  }

  /**
   * Check context window usage and trigger compaction if threshold exceeded.
   * Matches AMP's compaction lifecycle:
   *   1. Check usage > compactionThresholdPercent (default 80%)
   *   2. Transition to 'pending' -> 'compacting' -> 'complete'
   *   3. Set cutMessageId to mark the oldest preserved message
   *
   * Compaction in flitter-cli prunes early conversation items to reclaim
   * context window space for new turns.
   */
  private _checkCompaction(): void {
    if (!this._getContextUsagePercent) return;

    const usagePercent = this._getContextUsagePercent();
    const threshold = this._getCompactionThreshold?.() ?? 80;

    if (usagePercent < threshold) {
      if (this._compactionState !== 'idle') {
        this._compactionState = 'idle';
      }
      return;
    }

    // Usage exceeds threshold -- trigger compaction
    if (this._compactionState === 'idle') {
      this._compactionState = 'pending';
      log.info(`PromptController: compaction pending — usage ${usagePercent}% >= threshold ${threshold}%`);
    }

    if (this._compactionState === 'pending') {
      this._compactionState = 'compacting';
      log.info('PromptController: compaction_started');

      // Find the cut point: preserve at least the last 2 user-assistant turns
      const items = this._session.items;
      const userMessageIndices: number[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type === 'user_message') userMessageIndices.push(i);
      }

      // Keep last N turns (N = number of user messages to keep, minimum 2)
      const keepTurns = Math.max(2, Math.floor(userMessageIndices.length / 2));
      const cutIndex = userMessageIndices.length > keepTurns
        ? userMessageIndices[userMessageIndices.length - keepTurns]
        : 0;

      if (cutIndex > 0) {
        // Mark the cut boundary
        const cutItem = items[cutIndex];
        this._cutMessageId = cutItem.type === 'user_message'
          ? `msg-${cutItem.timestamp}`
          : null;

        log.info(`PromptController: compaction — cutting at index ${cutIndex}, preserving ${items.length - cutIndex} items`);
      }

      this._compactionState = 'complete';
      log.info('PromptController: compaction_complete');
    }
  }

  /**
   * Stream a single provider response, dispatching events and collecting
   * tool call ready events.
   *
   * Implements automatic retry with exponential backoff for transient errors.
   * Only retries when:
   *   1. The error is marked retryable (error.retryable === true)
   *   2. Streaming has NOT yet begun delivering content (no text/thinking/tool events)
   *   3. The attempt count has not exceeded maxAttempts
   *
   * Returns the stop reason and any pending tool calls.
   */
  private async _streamResponse(
    messages: ProviderMessage[],
    options: PromptOptions,
  ): Promise<{ stopReason: string; pendingToolCalls: PendingToolCall[] }> {
    const retryConfig = DEFAULT_RETRY_CONFIG;
    let attempt = 0;

    while (attempt < retryConfig.maxAttempts && !this._cancelled) {
      const pendingToolCalls: PendingToolCall[] = [];
      let stopReason = 'end_turn';
      let hasBegunStreaming = false;
      let shouldRetry = false;

      const stream = this._provider.sendPrompt(messages, options);

      for await (const event of stream) {
        if (this._cancelled) {
          return { stopReason: 'cancelled', pendingToolCalls: [] };
        }

        // Transition to streaming on first content event
        if (!hasBegunStreaming && (
          event.type === 'text_delta' ||
          event.type === 'thinking_delta' ||
          event.type === 'tool_call_start'
        )) {
          this._session.beginStreaming();
          hasBegunStreaming = true;
        }

        // Collect tool_call_ready events for later execution
        if (event.type === 'tool_call_ready') {
          pendingToolCalls.push({
            toolCallId: event.toolCallId,
            name: event.name,
            input: event.input,
          });
        }

        // Dispatch to session (but don't complete stream yet for tool_use)
        if (event.type === 'message_complete') {
          stopReason = event.stopReason;
          if (stopReason !== 'tool_use') {
            // Normal completion — let session transition to complete
            this._session.completeStream(event.stopReason);
            this._stopElapsedTimer();
          }
          break;
        }

        if (event.type === 'error') {
          // Only retry if: error is retryable, streaming hasn't begun, and we have attempts left
          if (
            isRetryableError(event.error) &&
            !hasBegunStreaming &&
            attempt < retryConfig.maxAttempts - 1
          ) {
            const delay = computeDelay(attempt, retryConfig);
            log.info(
              `PromptController: retryable error on attempt ${attempt + 1}/${retryConfig.maxAttempts}, ` +
              `retrying in ${delay}ms: ${event.error.message}`,
            );
            await sleep(delay);
            shouldRetry = true;
            break;
          }
          // Not retryable or out of attempts — dispatch error normally
          this._dispatchEvent(event);
          break;
        }

        this._dispatchEvent(event);
      }

      if (shouldRetry) {
        attempt++;
        continue;
      }

      return { stopReason, pendingToolCalls };
    }

    // Exhausted all attempts or cancelled — return default
    return { stopReason: 'end_turn', pendingToolCalls: [] };
  }

  /**
   * Execute a batch of tool calls and return tool_result blocks.
   */
  private async _executeToolCalls(
    pendingCalls: PendingToolCall[],
  ): Promise<ToolResultBlock[]> {
    const results: ToolResultBlock[] = [];
    const context: ToolContext = {
      cwd: this._session.metadata.cwd,
      onPlanUpdate: (entries) => {
        this._session.setPlan(entries.map(e => ({
          content: e.content,
          priority: (e.priority || 'medium') as 'high' | 'medium' | 'low',
          status: (e.status || 'pending') as 'pending' | 'in_progress' | 'completed',
        })));
      },
    };

    for (const call of pendingCalls) {
      if (this._cancelled) {
        results.push({
          type: 'tool_result',
          tool_use_id: call.toolCallId,
          content: 'Cancelled by user.',
          is_error: true,
        });
        continue;
      }

      const executor = this._toolRegistry?.getExecutor(call.name);
      if (!executor) {
        log.warn(`PromptController: no executor for tool '${call.name}'`);
        results.push({
          type: 'tool_result',
          tool_use_id: call.toolCallId,
          content: `Unknown tool: '${call.name}'`,
          is_error: true,
        });
        // Update the tool call status in session
        this._session.updateToolCall(call.toolCallId, 'failed', undefined, {
          error: `Unknown tool: '${call.name}'`,
        });
        continue;
      }

      // Check permission if required
      if (this._toolRegistry?.requiresPermission(call.name)) {
        const approved = await this._requestToolPermission(call.name, call.input);
        if (!approved) {
          results.push({
            type: 'tool_result',
            tool_use_id: call.toolCallId,
            content: 'Permission denied by user.',
            is_error: true,
          });
          this._session.updateToolCall(call.toolCallId, 'failed', undefined, {
            error: 'Permission denied',
          });
          continue;
        }
      }

      // Execute the tool
      try {
        // Mark tool as in_progress
        this._session.addToolCall(
          call.toolCallId,
          call.name,
          call.name,
          'in_progress',
          undefined,
          call.input,
        );

        const result = await executor.execute(call.input, context);

        results.push({
          type: 'tool_result',
          tool_use_id: call.toolCallId,
          content: result.content,
          is_error: result.isError,
        });

        // Update tool call status
        this._session.updateToolCall(
          call.toolCallId,
          result.isError ? 'failed' : 'completed',
          undefined,
          { output: result.content },
        );
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        log.error(`PromptController: tool '${call.name}' threw: ${errMsg}`);
        results.push({
          type: 'tool_result',
          tool_use_id: call.toolCallId,
          content: `Tool execution error: ${errMsg}`,
          is_error: true,
        });
        this._session.updateToolCall(call.toolCallId, 'failed', undefined, {
          error: errMsg,
        });
      }
    }

    return results;
  }

  /**
   * Request permission for a tool execution.
   * Returns true if approved, false if denied.
   */
  private async _requestToolPermission(
    toolName: string,
    input: Record<string, unknown>,
  ): Promise<boolean> {
    if (!this.onPermissionRequest) {
      // No permission handler — auto-approve
      return true;
    }

    try {
      const request: PermissionRequest = {
        requestId: `perm-${toolName}-${Date.now()}`,
        toolCall: {
          toolCallId: `tc-${toolName}-${Date.now()}`,
          title: toolName,
          kind: 'tool',
          rawInput: input,
        },
        options: [
          { optionId: 'allow', name: 'Allow', kind: 'allow_once' },
          { optionId: 'always', name: 'Always Allow', kind: 'allow_always' },
          { optionId: 'deny', name: 'Deny', kind: 'reject_once' },
        ],
      };
      const result = await this.onPermissionRequest(request);
      return result !== null && (result === 'allow' || result === 'always');
    } catch {
      return false;
    }
  }

  /**
   * Cancel the in-flight prompt.
   *
   * No-op if the session is not processing, streaming, or executing tools.
   * Aborts the provider HTTP request and transitions session to cancelled.
   */
  cancel(): void {
    const lifecycle = this._session.lifecycle;
    if (
      lifecycle !== 'processing' &&
      lifecycle !== 'streaming' &&
      lifecycle !== 'tool_execution'
    ) {
      return;
    }

    this._cancelled = true;
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

      case 'tool_call_input_delta':
        this._session.appendToolOutput(event.toolCallId, event.partialJson);
        break;

      case 'tool_call_ready':
        // Handled by _streamResponse — collected into pendingToolCalls
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
        // Handled by _streamResponse
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
   * Includes tool_call items as tool_use blocks within the preceding
   * assistant message, and includes tool results as user messages with
   * tool_result content blocks.
   */
  private _buildMessages(
    items: ReadonlyArray<ConversationItem>,
  ): ProviderMessage[] {
    const messages: ProviderMessage[] = [];

    for (const item of items) {
      switch (item.type) {
        case 'user_message': {
          if (item.toolResults && item.toolResults.length > 0) {
            // User message carrying tool results (agentic loop re-submission)
            const blocks: ContentBlock[] = item.toolResults.map(tr => ({
              type: 'tool_result' as const,
              tool_use_id: tr.tool_use_id,
              content: tr.content,
              is_error: tr.is_error,
            }));
            messages.push({ role: 'user', content: blocks });
          } else {
            messages.push({ role: 'user', content: item.text });
          }
          break;
        }
        case 'assistant_message': {
          if (item.contentBlocks && item.contentBlocks.length > 0) {
            // Structured content blocks (text + tool_use interleaved)
            messages.push({ role: 'assistant', content: item.contentBlocks });
          } else if (item.text) {
            messages.push({ role: 'assistant', content: item.text });
          }
          break;
        }
        case 'tool_call': {
          // Tool calls are tracked separately for UI rendering.
          // The actual tool_use/tool_result content blocks are embedded
          // in assistant/user messages via contentBlocks and toolResults.
          break;
        }
        // Skip thinking, plan, system_message for provider messages
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
