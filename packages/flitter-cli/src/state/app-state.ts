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
import type { PermissionRequest, PermissionResult } from './permission-types';
import { SessionState, type StateListener } from './session';
import { ConversationState } from './conversation';
import { type ScreenState, deriveScreenState } from './screen-state';
import { PromptController } from './prompt-controller';
import { OverlayManager } from './overlay-manager';
import { OVERLAY_IDS, OVERLAY_PRIORITIES } from './overlay-ids';
import { PermissionDialog } from '../widgets/permission-dialog';
import { SessionStore, type SessionFile } from './session-store';
import { PromptHistory } from './history';
import { log } from '../utils/logger';
import { launchEditor, type EditorResult } from '../utils/editor-launcher';

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

  /** Centralized overlay lifecycle manager for the overlay stack. */
  readonly overlayManager: OverlayManager;

  /** Persistent prompt history for up/down navigation. */
  readonly promptHistory: PromptHistory;

  /** Session persistence store for save/load/list. */
  readonly sessionStore: SessionStore;

  /** The prompt controller wiring Provider to SessionState. Set after construction. */
  private _promptController: PromptController | null = null;

  // --- UI-specific state (not session concerns) ---

  /** Compact view toggle. */
  denseView: boolean = false;

  /** Current agent mode (e.g., 'smart', 'code', 'ask'). */
  currentMode: string | null = null;

  /** Available agent modes for cycling. */
  modes: string[] = [];

  /** Index of the selected user message for Tab/Shift+Tab navigation. */
  selectedMessageIndex: number | null = null;

  /** Whether deep/extended reasoning mode is active. */
  private _deepReasoningActive: boolean = false;

  // --- Listener management ---
  private _listeners: Set<StateListener> = new Set();

  constructor(
    session: SessionState,
    promptHistory: PromptHistory,
    sessionStore: SessionStore,
  ) {
    this.session = session;
    this.conversation = new ConversationState(session);
    this.overlayManager = new OverlayManager();
    this.promptHistory = promptHistory;
    this.sessionStore = sessionStore;

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

  /** Whether deep/extended reasoning mode is active. */
  get deepReasoningActive(): boolean {
    return this._deepReasoningActive;
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

  /** Elapsed milliseconds since the current prompt started (delegates to PromptController). */
  get elapsedMs(): number {
    return this._promptController?.elapsedMs ?? 0;
  }

  /** Context window usage as a percentage (0-100). */
  get contextWindowUsagePercent(): number {
    const usage = this.session?.usage;
    const size = usage?.size ?? 200000;
    if (size <= 0) return 0;
    const used = usage?.used ?? 0;
    return Math.round((used / size) * 100);
  }

  /** True when context window usage exceeds 80%. */
  get isContextWindowHigh(): boolean {
    return this.contextWindowUsagePercent > 80;
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
  // Permission Dialog Flow (Plan 17-02)
  // ---------------------------------------------------------------------------

  /** Pending permission request resolver — non-null while a dialog is active. */
  private _permissionResolve: ((result: PermissionResult) => void) | null = null;

  /**
   * Request permission from the user. Shows the permission dialog overlay
   * and returns a Promise that resolves when the user selects an option
   * or dismisses the dialog.
   *
   * The dialog renders at OVERLAY_PRIORITIES.PERMISSION_DIALOG (100),
   * ensuring it always appears on top of other overlays.
   */
  async requestPermission(request: PermissionRequest): Promise<PermissionResult> {
    return new Promise<PermissionResult>((resolve) => {
      this._permissionResolve = resolve;
      this.overlayManager.show({
        id: OVERLAY_IDS.PERMISSION_DIALOG,
        priority: OVERLAY_PRIORITIES.PERMISSION_DIALOG,
        modal: true,
        placement: { type: 'fullscreen' },
        builder: (onDismiss) => new PermissionDialog({
          request,
          onSelect: (optionId: string) => {
            onDismiss();
            this.resolvePermission(optionId);
          },
          onCancel: () => {
            onDismiss();
            this.resolvePermission(null);
          },
        }),
      });
    });
  }

  /**
   * Resolve a pending permission request with the given result.
   * Called by the dialog's onSelect/onCancel or by Escape dismissal.
   * No-op if no permission request is pending.
   */
  resolvePermission(result: PermissionResult): void {
    if (this._permissionResolve) {
      const resolve = this._permissionResolve;
      this._permissionResolve = null;
      resolve(result);
    }
  }

  // ---------------------------------------------------------------------------
  // Graceful Shutdown (I7 — in-flight cancellation)
  // ---------------------------------------------------------------------------

  /**
   * Gracefully shut down the application.
   *
   * 1. Cancels any in-flight prompt (aborts HTTP stream, transitions session to cancelled)
   * 2. Saves the current session to disk
   * 3. Saves prompt history
   *
   * Safe to call multiple times — subsequent calls are no-ops.
   */
  private _isShutdown = false;

  shutdown(): void {
    if (this._isShutdown) return;
    this._isShutdown = true;

    // Cancel any active prompt stream before saving
    if (this._promptController) {
      const lc = this.session.lifecycle;
      if (lc === 'processing' || lc === 'streaming' || lc === 'tool_execution') {
        log.info('AppState.shutdown: cancelling in-flight prompt');
        this._promptController.cancel();
      }
    }

    // Persist session state
    this.saveSession();
    log.info('AppState.shutdown: complete');
  }

  /** Whether shutdown() has been called. */
  get isShutdown(): boolean {
    return this._isShutdown;
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

  /** Toggle deep reasoning (extended thinking) mode. */
  toggleDeepReasoning(): void {
    this._deepReasoningActive = !this._deepReasoningActive;
    log.info(`Deep reasoning toggled: ${this._deepReasoningActive ? 'on' : 'off'}`);
    this._notifyListeners();
  }

  /**
   * Cycle through available agent modes.
   * Uses the `modes` array if non-empty, otherwise defaults to ['smart', 'code', 'ask'].
   */
  cycleMode(): void {
    const available = this.modes.length > 0
      ? this.modes
      : ['smart', 'code', 'ask'];
    const current = this.currentMode ?? available[0];
    const idx = available.indexOf(current);
    this.currentMode = available[(idx + 1) % available.length];
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
   * Get the text of a user message at the given items-array index.
   * Delegates to session.getMessageAt().
   */
  getMessageAt(index: number): string | null {
    return this.session.getMessageAt(index);
  }

  /**
   * Truncate the conversation after the given items-array index.
   * Delegates to session.truncateAfter() and notifies listeners.
   */
  truncateAfter(index: number): void {
    this.session.truncateAfter(index);
    this._notifyListeners();
  }

  /**
   * Copy the last assistant response text to the system clipboard.
   * Uses platform-appropriate commands (pbcopy on macOS, xclip on Linux, clip on Windows).
   * Returns true if successful, false otherwise.
   */
  async copyLastResponse(): Promise<boolean> {
    const text = this.getLastAssistantMessage();
    if (!text) return false;
    try {
      const platform = process.platform;
      let cmd: string[];
      if (platform === 'darwin') {
        cmd = ['pbcopy'];
      } else if (platform === 'win32') {
        cmd = ['clip'];
      } else {
        cmd = ['xclip', '-selection', 'clipboard'];
      }
      const proc = Bun.spawn(cmd, { stdin: 'pipe' });
      proc.stdin.write(text);
      proc.stdin.end();
      await proc.exited;
      return true;
    } catch {
      return false;
    }
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

  /**
   * Open $EDITOR for composing a multi-line prompt.
   * Returns an EditorResult with success status and the edited text.
   */
  async openEditor(initialContent: string = ''): Promise<EditorResult> {
    return launchEditor(initialContent);
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
  // Session Persistence
  // ---------------------------------------------------------------------------

  /**
   * Serialize the current session state into a SessionFile snapshot.
   * Returns null if the session has no conversation items (nothing to persist).
   */
  toSessionFile(): SessionFile | null {
    const items = this.session.items;
    if (items.length === 0) return null;

    const meta = this.session.metadata;
    return {
      version: 1,
      sessionId: meta.sessionId,
      cwd: meta.cwd,
      gitBranch: meta.gitBranch,
      model: meta.model,
      createdAt: meta.startTime,
      updatedAt: Date.now(),
      items: [...items],
      plan: [...this.session.plan],
      usage: this.session.usage ? { ...this.session.usage } : null,
      currentMode: this.currentMode,
    };
  }

  /**
   * Restore session state from a persisted SessionFile snapshot.
   * Delegates to SessionState.restoreItems() for items/plan/usage restoration,
   * then restores UI-specific state (currentMode).
   */
  restoreFromSession(session: SessionFile): void {
    this.session.restoreItems(session.items, session.plan, session.usage);
    this.currentMode = session.currentMode;
    this.selectedMessageIndex = null;
    this._notifyListeners();
  }

  /**
   * Save the current session to disk via SessionStore.
   * No-op if the session has no items to persist.
   */
  saveSession(): void {
    const file = this.toSessionFile();
    if (file) {
      this.sessionStore.save(file);
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
   * @param config.promptHistory - Persistent prompt history instance
   * @param config.sessionStore - Session persistence store instance
   * @returns A fully initialized AppState ready for use
   */
  static create(config: {
    cwd: string;
    provider: Provider;
    promptHistory: PromptHistory;
    sessionStore: SessionStore;
    toolRegistry?: import('../tools/registry').ToolRegistry | null;
    systemPrompt?: string | null;
    /** Whether tool calls are expanded by default (N10). */
    defaultToolExpanded?: boolean;
  }): AppState {
    const sessionId = crypto.randomUUID();
    const session = new SessionState({
      sessionId,
      cwd: config.cwd,
      model: config.provider.model,
      defaultToolExpanded: config.defaultToolExpanded,
    });

    const appState = new AppState(session, config.promptHistory, config.sessionStore);
    const controller = new PromptController({
      session,
      provider: config.provider,
      toolRegistry: config.toolRegistry ?? null,
      systemPrompt: config.systemPrompt ?? null,
      onStreamComplete: () => appState.saveSession(),
    });
    appState.setPromptController(controller);

    log.info(`AppState.create: sessionId=${sessionId} model=${config.provider.model} cwd=${config.cwd}`);

    return appState;
  }
}
