// AppState — top-level application state composing SessionState with
// UI-facing computed properties and PromptController delegation.
//
// Ported from flitter-amp's AppState but replaces ACP ClientCallbacks
// with native session delegation. Provides the single source of truth
// for TUI rendering, wiring session lifecycle, conversation items,
// usage tracking, and UI-specific state (dense view, mode, selection).

import type { Provider } from '../provider/provider';
import type {
  SessionLifecycle,
  SessionError,
  UsageInfo,
  ConversationItem,
  SessionMetadata,
} from './types';
import type { Turn } from './turn-types';
import { SessionState, type StateListener } from './session';
import { ConversationState } from './conversation';
import { type ScreenState, deriveScreenState } from './screen-state';
import { PromptController } from './prompt-controller';
import { log } from '../utils/logger';

/**
 * AppState is the top-level application state for the flitter-cli TUI.
 *
 * It composes SessionState (lifecycle, conversation, streaming) with
 * PromptController (submission orchestration) and exposes UI-specific
 * state like dense view, agent mode, and message selection.
 *
 * All session-related properties delegate to the underlying SessionState.
 * Listeners registered on AppState are notified when session state changes.
 */
export class AppState {
  /** The session state machine managing lifecycle and conversation. */
  readonly session: SessionState;

  /** Turn-level grouped view over SessionState.items. */
  readonly conversation: ConversationState;

  /** The prompt controller wiring Provider to SessionState. Set after construction. */
  private _promptController: PromptController | null = null;

  // --- UI-specific state (not session concerns) ---

  /** Compact view toggle. */
  denseView: boolean = false;

  /** Current agent mode (e.g., 'smart', 'code', 'ask'). */
  currentMode: string | null = null;

  /** Index of the selected user message for Tab/Shift+Tab navigation. */
  selectedMessageIndex: number | null = null;

  // --- Listener management ---
  private _listeners: Set<StateListener> = new Set();

  constructor(session: SessionState) {
    this.session = session;
    this.conversation = new ConversationState(session);

    // Relay session state changes to AppState listeners
    this.session.addListener(() => {
      this._notifyListeners();
    });
  }

  // ---------------------------------------------------------------------------
  // PromptController wiring
  // ---------------------------------------------------------------------------

  /** Set the prompt controller (breaks circular init between AppState/PromptController). */
  setPromptController(controller: PromptController): void {
    this._promptController = controller;
  }

  /** Access the prompt controller. Throws if not yet wired. */
  get promptController(): PromptController {
    if (!this._promptController) {
      throw new Error('AppState: promptController not set — call setPromptController() first');
    }
    return this._promptController;
  }

  // ---------------------------------------------------------------------------
  // Listener Management
  // ---------------------------------------------------------------------------

  /** Register a listener to be notified on any state change. */
  addListener(fn: StateListener): void {
    this._listeners.add(fn);
  }

  /** Unregister a previously registered listener. */
  removeListener(fn: StateListener): void {
    this._listeners.delete(fn);
  }

  /** Notify all registered AppState listeners. */
  private _notifyListeners(): void {
    this._listeners.forEach(fn => fn());
  }

  // ---------------------------------------------------------------------------
  // Session-delegated computed properties for UI consumption
  // ---------------------------------------------------------------------------

  /** True when the session is processing or streaming (prompt in-flight). */
  get isProcessing(): boolean {
    const lc = this.session.lifecycle;
    return lc === 'processing' || lc === 'streaming';
  }

  /** True when the session is actively streaming response content. */
  get isStreaming(): boolean {
    return this.session.lifecycle === 'streaming';
  }

  /**
   * True when the last prompt was interrupted (cancelled/stopped, not end_turn).
   * Checks that the session is in a terminal state and the stop reason indicates interruption.
   */
  get isInterrupted(): boolean {
    const lc = this.session.lifecycle;
    const reason = this.session.lastStopReason;
    return (
      reason !== null &&
      reason !== 'end_turn' &&
      (lc === 'idle' || lc === 'complete')
    );
  }

  /** Current session lifecycle state. */
  get lifecycle(): SessionLifecycle {
    return this.session.lifecycle;
  }

  /** Current session error (non-null only in error state). */
  get error(): SessionError | null {
    return this.session.error;
  }

  /** Conversation items (user messages, assistant messages, tool calls, etc.). */
  get items(): ReadonlyArray<ConversationItem> {
    return this.session.items;
  }

  /** Current usage information (tokens, cost). */
  get usage(): UsageInfo | null {
    return this.session.usage;
  }

  /** Session metadata (sessionId, turnCount, cwd, model, etc.). */
  get metadata(): SessionMetadata {
    return this.session.metadata;
  }

  // ---------------------------------------------------------------------------
  // Turn-level and screen state accessors (Phase 14 Plan 02)
  // ---------------------------------------------------------------------------

  /** Grouped turns array — delegates to ConversationState. */
  get turns(): ReadonlyArray<Turn> {
    return this.conversation.turns;
  }

  /** The most recent turn (or null if no conversation). */
  get currentTurn(): Turn | null {
    return this.conversation.currentTurn;
  }

  /**
   * Derived screen state — determines which screen/placeholder the TUI should render.
   *
   * Always reflects the current session lifecycle and conversation state.
   * Pure derivation on every access — not stored.
   */
  get screenState(): ScreenState {
    return deriveScreenState(
      this.session.lifecycle,
      this.conversation.isEmpty,
      this.session.metadata.turnCount,
      this.session.error,
    );
  }

  // ---------------------------------------------------------------------------
  // Action methods — delegate to PromptController
  // ---------------------------------------------------------------------------

  /**
   * Submit a user prompt. Delegates to PromptController.submitPrompt().
   * Handles the full lifecycle: processing -> streaming -> complete/error.
   */
  async submitPrompt(text: string): Promise<void> {
    return this.promptController.submitPrompt(text);
  }

  /**
   * Cancel the in-flight prompt. Delegates to PromptController.cancel().
   * Aborts the HTTP request and transitions session to cancelled.
   */
  cancelPrompt(): void {
    this.promptController.cancel();
  }

  // ---------------------------------------------------------------------------
  // Convenience methods (ported from flitter-amp AppState)
  // ---------------------------------------------------------------------------

  /**
   * Start a new conversation thread.
   * Clears conversation items, plan, and usage while preserving session identity.
   * Also clears UI-specific state.
   */
  newThread(): void {
    this.session.newThread();
    this.selectedMessageIndex = null;
    this.currentMode = null;
    this._notifyListeners();
  }

  /** Toggle dense (compact) view mode. */
  toggleDenseView(): void {
    this.denseView = !this.denseView;
    this._notifyListeners();
  }

  /**
   * Clear the current error state.
   * Resets the session if it's in error state.
   */
  clearError(): void {
    if (this.session.lifecycle === 'error') {
      this.session.reset();
    }
    this._notifyListeners();
  }

  /**
   * Return the text of the last assistant message, or null if none.
   * Scans conversation items in reverse to find the most recent one.
   */
  getLastAssistantMessage(): string | null {
    const items = this.session.items;
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (item.type === 'assistant_message' && item.text) {
        return item.text;
      }
    }
    return null;
  }

  /**
   * Build a human-readable usage summary string.
   * Returns null if no usage data is available.
   */
  getUsageSummary(): string | null {
    const usage = this.session.usage;
    if (!usage) return null;

    const pct = usage.size > 0
      ? ((usage.used / usage.size) * 100).toFixed(1)
      : '0.0';
    let summary = `Tokens: ${usage.used.toLocaleString()} / ${usage.size.toLocaleString()} (${pct}%)`;
    if (usage.cost) {
      summary += ` | Cost: ${usage.cost.currency}${usage.cost.amount.toFixed(4)}`;
    }
    return summary;
  }

  // ---------------------------------------------------------------------------
  // Message Selection Navigation (Tab/Shift+Tab)
  // ---------------------------------------------------------------------------

  /**
   * Returns the items-array indices of all user_message items,
   * in order of appearance.
   */
  private _userMessageIndices(): number[] {
    const indices: number[] = [];
    const items = this.session.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type === 'user_message') indices.push(i);
    }
    return indices;
  }

  /**
   * Select the previous (older) user message.
   * Tab moves backward through user messages. When nothing is selected,
   * starts from the newest.
   */
  selectPrevMessage(): void {
    const indices = this._userMessageIndices();
    if (indices.length === 0) return;
    if (this.selectedMessageIndex === null) {
      this.selectedMessageIndex = indices[indices.length - 1];
    } else {
      const pos = indices.indexOf(this.selectedMessageIndex);
      if (pos > 0) {
        this.selectedMessageIndex = indices[pos - 1];
      }
    }
    this._notifyListeners();
  }

  /**
   * Select the next (newer) user message.
   * Shift+Tab moves forward. If already at the newest message, clears selection.
   */
  selectNextMessage(): void {
    const indices = this._userMessageIndices();
    if (indices.length === 0 || this.selectedMessageIndex === null) return;
    const pos = indices.indexOf(this.selectedMessageIndex);
    if (pos < indices.length - 1) {
      this.selectedMessageIndex = indices[pos + 1];
    } else {
      this.selectedMessageIndex = null;
    }
    this._notifyListeners();
  }

  /** Clear the current message selection. */
  clearMessageSelection(): void {
    if (this.selectedMessageIndex !== null) {
      this.selectedMessageIndex = null;
      this._notifyListeners();
    }
  }

  // ---------------------------------------------------------------------------
  // Static factory
  // ---------------------------------------------------------------------------

  /**
   * Create a fully-wired AppState instance.
   *
   * Constructs SessionState, AppState, and PromptController, wires them
   * together, and initializes session metadata with the provided config.
   *
   * @param config.cwd - Working directory for the session
   * @param config.provider - The LLM backend provider
   * @returns A fully initialized AppState ready for use
   */
  static create(config: { cwd: string; provider: Provider }): AppState {
    const sessionId = crypto.randomUUID();
    const session = new SessionState({
      sessionId,
      cwd: config.cwd,
      model: config.provider.model,
    });

    const appState = new AppState(session);
    const controller = new PromptController({
      session,
      provider: config.provider,
    });
    appState.setPromptController(controller);

    log.info(`AppState.create: sessionId=${sessionId} model=${config.provider.model} cwd=${config.cwd}`);

    return appState;
  }
}
