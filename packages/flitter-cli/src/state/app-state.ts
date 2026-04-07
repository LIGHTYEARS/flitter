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
  SessionMode,
  DeepReasoningEffort,
  HandoffState,
  BashInvocation,
  ShellModeStatus,
} from './types';
import { AGENT_MODES, VISIBLE_MODE_KEYS, DEFAULT_HANDOFF_STATE } from './types';
import type { Turn } from './turn-types';
import type { PermissionRequest, PermissionResult, PermissionContentPreview } from './permission-types';
import { SessionState, type StateListener } from './session';
import { ConversationState } from './conversation';
import { ThreadPool } from './thread-pool';
import type { ThreadHandle } from './types';
import { generateThreadID } from './types';
import { type ScreenState, deriveScreenState } from './screen-state';
import { PromptController } from './prompt-controller';
import { OverlayManager } from './overlay-manager';
import { OVERLAY_IDS, OVERLAY_PRIORITIES } from './overlay-ids';
import { PermissionDialog } from '../widgets/permission-dialog';
import { ThreadList, mapThreadHandleToEntry } from '../widgets/thread-list';
import { SessionStore, type SessionFile } from './session-store';
import { PromptHistory } from './history';
import { log } from '../utils/logger';
import { launchEditor, type EditorResult } from '../utils/editor-launcher';
import { SkillService } from './skill-service';
import type { SkillDefinition } from './skill-types';

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
  session: SessionState;

  /** Turn-level grouped view over SessionState.items. */
  conversation: ConversationState;

  /** Centralized overlay lifecycle manager for the overlay stack. */
  readonly overlayManager: OverlayManager;

  /** Persistent prompt history for up/down navigation. */
  readonly promptHistory: PromptHistory;

  /** Session persistence store for save/load/list. */
  readonly sessionStore: SessionStore;

  /** ThreadPool managing multiple concurrent threads. */
  readonly threadPool: ThreadPool;

  /** Centralized skill management service. */
  readonly skillService: SkillService;

  /** The prompt controller wiring Provider to SessionState. Set after construction. */
  private _promptController: PromptController | null = null;

  // --- UI-specific state (not session concerns) ---

  /** Compact view toggle. */
  denseView: boolean = false;

  /** Whether the user is in queue mode (batching follow-up messages). Matches AMP's GhR.isInQueueMode. */
  isInQueueMode: boolean = false;

  /**
   * Handoff mode UI state matching AMP's GhR.handoffState object exactly.
   * Tracks the enter/generate/abort/exit lifecycle for thread handoff.
   * See 24_main_app_state.js and 30_main_tui_state.js in AMP source.
   */
  handoffState: HandoffState = { ...DEFAULT_HANDOFF_STATE };

  /** Interval timer for handoff countdown auto-submit. Cleared on exit/abort/submit. */
  private _countdownTimer: ReturnType<typeof setInterval> | null = null;

  /** Braille spinner animation frame index for handoff generating state. */
  private _spinnerFrame: number = 0;

  // --- Bash Invocation Tracking (SHELL-01, SHELL-02) ---

  /** Active bash invocations tracked in the UI. Matches AMP's bashInvocations array. */
  bashInvocations: BashInvocation[] = [];

  /** Pending bash invocations by ID — awaiting acknowledgement. Matches AMP's pendingBashInvocations. */
  pendingBashInvocations: Map<string, BashInvocation> = new Map();

  /** Timestamps when each invocation was first shown (epoch ms). */
  bashInvocationShownAt: Map<string, number> = new Map();

  /** Removal timer handles keyed by invocation ID. */
  bashInvocationRemoveTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  /** Current shell mode status for UI display. Matches AMP's currentShellModeStatus. */
  currentShellModeStatus: ShellModeStatus = null;

  /** Current agent mode — defaults to 'smart' matching AMP. */
  currentMode: string | null = 'smart';

  /** Available agent modes for cycling — initialized from AGENT_MODES. */
  modes: SessionMode[] = Object.values(AGENT_MODES).map(m => ({
    id: m.key,
    name: m.key,
    displayName: m.displayName,
    description: m.description,
    primaryModel: m.primaryModel,
    visible: m.visible,
    reasoningEffort: m.reasoningEffort,
    uiHints: m.uiHints,
  }));

  /** Sequence counter incremented on each mode cycle — drives agentModePulse animation. */
  private _agentModePulseSeq: number = 0;

  /** Index of the selected user message for Tab/Shift+Tab navigation. */
  selectedMessageIndex: number | null = null;

  /** Hint text displayed in the prompt area (e.g., context or status hints). */
  hintText: string | null = null;

  /** Currently registered tools/skills. */
  tools: Array<{ name: string; description?: string }> = [];

  /** Number of registered tools/skills — delegates to SkillService. */
  get skillCount(): number { return this.skillService.skillCount || this.tools.length; }

  /** Number of skill load warnings — delegates to SkillService. */
  get skillWarningCount(): number { return this.skillService.warningCount; }

  /** Autocomplete trigger definitions for the input area. */
  autocompleteTriggers: Array<{ trigger: string; description?: string }> = [];

  /** Agent version string reported by the backend. */
  agentVersion: string | null = null;

  /** Current deep reasoning effort level, or null for disabled. Per MODE-01. */
  private _deepReasoningEffort: DeepReasoningEffort | null = null;

  // --- Listener management ---
  private _listeners: Set<StateListener> = new Set();

  /** Pending skills awaiting injection into next prompt. Matches AMP's _pendingSkills BehaviorSubject. */
  private _pendingSkills: SkillDefinition[] = [];

  constructor(
    session: SessionState,
    promptHistory: PromptHistory,
    sessionStore: SessionStore,
    threadPool?: ThreadPool,
  ) {
    this.session = session;
    this.conversation = new ConversationState(session);
    this.overlayManager = new OverlayManager();
    this.promptHistory = promptHistory;
    this.sessionStore = sessionStore;
    this.threadPool = threadPool ?? new ThreadPool();
    this.skillService = new SkillService();

    // Relay session state changes to AppState listeners
    this.session.addListener(this._sessionListener);

    // Relay thread pool changes to AppState listeners
    this.threadPool.addListener(() => {
      this._notifyListeners();
    });

    // Relay SkillService changes to AppState listeners and sync tools array
    this.skillService.addListener(() => {
      this.tools = this.skillService.skills.map(s => ({ name: s.name, description: s.description }));
      this._notifyListeners();
    });
  }

  /**
   * Named session listener for re-wiring when switching threads.
   * Auto-generates thread title on first conversation completion.
   */
  private _sessionListener = (): void => {
    // Auto-generate thread title on first conversation completion
    if (this.session.lifecycle === 'complete' && this.threadPool.activeThreadContextID) {
      this.threadPool.generateTitle(this.threadPool.activeThreadContextID);
    }
    this._notifyListeners();
  };

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

  /** True when the session is processing or streaming (prompt in-flight). Includes handoff generating. */
  get isProcessing(): boolean {
    const lc = this.session.lifecycle;
    return lc === 'processing' || lc === 'streaming' || this.handoffState.isGeneratingHandoff;
  }

  /** True when the session is actively streaming response content. */
  get isStreaming(): boolean {
    return this.session.lifecycle === 'streaming';
  }

  /** Whether deep reasoning is active (any effort level set). */
  get deepReasoningActive(): boolean {
    return this._deepReasoningEffort !== null;
  }

  /** Current deep reasoning effort level, or null if disabled. */
  get deepReasoningEffort(): DeepReasoningEffort | null {
    return this._deepReasoningEffort;
  }

  /** Agent mode pulse sequence counter for border animation. */
  get agentModePulseSeq(): number {
    return this._agentModePulseSeq;
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
   * Phase 33: Builds PermissionContentPreview from toolCall data and passes
   * to the new AMP-style PermissionDialog (StatefulWidget with radio options,
   * content preview, and feedback input mode).
   *
   * The dialog renders at OVERLAY_PRIORITIES.PERMISSION_DIALOG (100),
   * ensuring it always appears on top of other overlays.
   */
  async requestPermission(request: PermissionRequest): Promise<PermissionResult> {
    // Build content preview from toolCall if not already present
    const enrichedRequest = request.contentPreview
      ? request
      : { ...request, contentPreview: this._buildContentPreview(request) };

    return new Promise<PermissionResult>((resolve) => {
      this._permissionResolve = resolve;
      this.overlayManager.show({
        id: OVERLAY_IDS.PERMISSION_DIALOG,
        priority: OVERLAY_PRIORITIES.PERMISSION_DIALOG,
        modal: true,
        placement: { type: 'fullscreen' },
        builder: (onDismiss) => new PermissionDialog({
          request: enrichedRequest,
          onResult: (result: PermissionResult) => {
            onDismiss();
            this.resolvePermission(result);
          },
        }),
      });
    });
  }

  /**
   * Build a PermissionContentPreview from a PermissionRequest's toolCall data.
   * Matches AMP's formatToolConfirmation() patterns.
   */
  private _buildContentPreview(request: PermissionRequest): PermissionContentPreview {
    const { toolCall } = request;
    const rawInput = toolCall.rawInput ?? {};

    switch (toolCall.kind) {
      case 'bash':
      case 'command': {
        const command = (rawInput.cmd ?? rawInput.command ?? '') as string;
        return {
          header: 'Run this command?',
          command,
          cwd: rawInput.cwd as string | undefined,
        };
      }
      case 'edit_file':
      case 'edit': {
        return {
          header: 'Allow editing file:',
          filePath: rawInput.path as string | undefined,
        };
      }
      case 'create_file':
      case 'write':
      case 'create': {
        return {
          header: 'Allow creating file:',
          filePath: rawInput.path as string | undefined,
        };
      }
      default: {
        const json = Object.keys(rawInput).length > 0
          ? JSON.stringify(rawInput, null, 2)
          : undefined;
        return {
          header: `Allow ${toolCall.title}?`,
          json,
        };
      }
    }
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

    // Clean up handoff countdown timer
    this._clearCountdownTimer();

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
   * Start a new conversation thread via ThreadPool.
   * Preserves the existing thread state in threadHandleMap.
   * Matches AMP's startAndSwitchToNewThread (SECTION 2d).
   */
  newThread(): void {
    // AMP's startAndSwitchToNewThread calls onThreadSwitch which exits queue/handoff mode
    this.exitQueueMode();
    this.exitHandoffMode();
    const model = this.session.metadata.model;
    const cwd = this.session.metadata.cwd;
    const handle = this.threadPool.createThread({
      cwd,
      model,
      agentMode: this.currentMode,
    });

    // Point AppState's session/conversation to the new thread's instances
    this._switchToHandle(handle);

    this.selectedMessageIndex = null;
    this.currentMode = 'smart';
    this._notifyListeners();
  }

  /**
   * Switch AppState's session and conversation references to a thread handle.
   * Re-wires the session listener and updates promptController if present.
   */
  private _switchToHandle(handle: ThreadHandle): void {
    // Remove old session listener
    this.session.removeListener(this._sessionListener);

    // Point to new thread's state
    this.session = handle.session;
    this.conversation = handle.conversation;

    // Re-wire session listener
    this.session.addListener(this._sessionListener);

    this._notifyListeners();
  }

  /**
   * Switch to an existing thread by ID.
   * Updates session/conversation to point at the target thread.
   * Matches AMP's switchToExistingThread().
   */
  switchToThread(threadID: string): void {
    // AMP's onThreadSwitch() calls exitQueueMode() and handoffController?.resetUIState()
    this.exitQueueMode();
    this.exitHandoffMode();
    this.threadPool.switchThread(threadID);
    const handle = this.threadPool.activeThreadHandle;
    this._switchToHandle(handle);
    this.selectedMessageIndex = null;
    this._notifyListeners();
  }

  /**
   * Delete a thread by ID. If it was the active thread,
   * switches to the next most recent thread or creates a new one.
   */
  deleteThread(threadID: string): void {
    const wasActive = this.threadPool.activeThreadContextID === threadID;
    this.threadPool.deleteThread(threadID);

    if (wasActive) {
      const activeHandle = this.threadPool.activeThreadHandleOrNull;
      if (activeHandle) {
        this._switchToHandle(activeHandle);
      } else {
        // No threads left -- create a fresh one
        this.newThread();
      }
    }
    this._notifyListeners();
  }

  /**
   * Show the thread list overlay for browsing and switching threads.
   * Uses the existing OVERLAY_IDS.THREAD_LIST and OVERLAY_PRIORITIES.THREAD_LIST.
   * Matches AMP's loadThreadsForPicker() and thread picker UI (SECTION 6).
   */
  showThreadList(): void {
    const threads = this.threadPool.getVisibleThreads()
      .map(handle => mapThreadHandleToEntry(handle));

    this.overlayManager.show({
      id: OVERLAY_IDS.THREAD_LIST,
      priority: OVERLAY_PRIORITIES.THREAD_LIST,
      modal: true,
      placement: { type: 'fullscreen' },
      builder: (onDismiss) => new ThreadList({
        threads,
        currentThreadID: this.threadPool.activeThreadContextID,
        onSelect: (threadID: string) => {
          onDismiss();
          this.switchToThread(threadID);
        },
        onDismiss,
        getThreadItems: (threadID: string) => {
          const handle = this.threadPool.threadHandleMap.get(threadID);
          return handle?.session.items ?? [];
        },
        getThreadTitle: (threadID: string) => {
          return this.threadPool.threadTitles[threadID] ?? null;
        },
      }),
    });
  }

  /**
   * Dismiss the thread list overlay if it is currently shown.
   */
  dismissThreadList(): void {
    this.overlayManager.dismiss(OVERLAY_IDS.THREAD_LIST);
  }

  /** Toggle dense (compact) view mode. */
  toggleDenseView(): void {
    this.denseView = !this.denseView;
    this._notifyListeners();
  }

  /** Cycle deep reasoning effort: null → medium → high → xhigh → null. Per MODE-01. */
  cycleDeepReasoning(): void {
    const cycle: (DeepReasoningEffort | null)[] = [null, 'medium', 'high', 'xhigh'];
    const idx = cycle.indexOf(this._deepReasoningEffort);
    this._deepReasoningEffort = cycle[(idx + 1) % cycle.length];
    log.info(`Deep reasoning effort: ${this._deepReasoningEffort ?? 'off'}`);
    this._notifyListeners();
  }

  /** @Deprecated — Use cycleDeepReasoning() instead. Kept for backward compatibility. */
  toggleDeepReasoning(): void {
    this.cycleDeepReasoning();
  }

  /** Cycle through visible agent modes. Per MODE-02. */
  cycleMode(): void {
    const current = this.currentMode ?? VISIBLE_MODE_KEYS[0];
    const idx = VISIBLE_MODE_KEYS.indexOf(current);
    const nextIdx = idx === -1 ? 0 : (idx + 1) % VISIBLE_MODE_KEYS.length;
    this.currentMode = VISIBLE_MODE_KEYS[nextIdx];
    this._agentModePulseSeq = (this._agentModePulseSeq ?? 0) + 1;
    log.info(`Agent mode cycled to: ${this.currentMode}`);
    this._notifyListeners();
  }

  /** Set the available agent modes. */
  setModes(modes: SessionMode[]): void {
    this.modes = modes;
    this._notifyListeners();
  }

  /** Set the hint text shown in the prompt area. */
  setHintText(text: string | null): void {
    this.hintText = text;
    this._notifyListeners();
  }

  /** Set the available tools/skills. */
  setTools(tools: Array<{ name: string; description?: string }>): void {
    this.tools = tools;
    this._notifyListeners();
  }

  /** Set the autocomplete trigger definitions. */
  setAutocompleteTriggers(triggers: Array<{ trigger: string; description?: string }>): void {
    this.autocompleteTriggers = triggers;
    this._notifyListeners();
  }

  /** Set the agent version string. */
  setAgentVersion(version: string | null): void {
    this.agentVersion = version;
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
  // Pending Skills (SKILL-08 — matching AMP's thread worker pattern)
  // ---------------------------------------------------------------------------

  /**
   * Add a skill to the pending injection list.
   * Deduplicates by name — matching AMP's `if(!T.some((a)=>a.name===R.name))`.
   */
  addPendingSkill(skill: SkillDefinition): void {
    if (!this._pendingSkills.some((s) => s.name === skill.name)) {
      this._pendingSkills.push(skill);
      log.info('AppState.addPendingSkill', { skillName: skill.name });
      this._notifyListeners();
    }
  }

  /**
   * Remove a pending skill by name.
   * Matching AMP's `T.filter((a)=>a.name!==R)`.
   */
  removePendingSkill(name: string): void {
    this._pendingSkills = this._pendingSkills.filter((s) => s.name !== name);
    log.info('AppState.removePendingSkill', { skillName: name });
    this._notifyListeners();
  }

  /** Clear all pending skills. */
  clearPendingSkills(): void {
    this._pendingSkills = [];
    log.info('AppState.clearPendingSkills');
    this._notifyListeners();
  }

  /** Get the current pending skills array. */
  getPendingSkills(): SkillDefinition[] {
    return this._pendingSkills;
  }

  /**
   * Consume pending skills into an injection message for the next prompt.
   *
   * If there are pending skills, builds a message matching AMP's injection
   * format and clears the pending list. Returns null if no pending skills.
   *
   * Matching AMP: pending skills are injected as an info message with names
   * joined by ', ' and the pending list is cleared after consumption.
   */
  consumePendingSkillsMessage(): string | null {
    if (this._pendingSkills.length === 0) return null;

    const skillNames = this._pendingSkills.map(s => s.name).join(', ');
    const toolName = 'Skill';
    const message = `You MUST call the ${toolName} tool to load: ${skillNames}. Do not proceed without loading these skills first.`;

    log.info('AppState.consumePendingSkillsMessage', { skillNames });
    this._pendingSkills = [];
    this._notifyListeners();
    return message;
  }

  // ---------------------------------------------------------------------------
  // Queue Mode (QUEUE-01)
  // ---------------------------------------------------------------------------

  /**
   * Enter queue mode. Subsequent submits will enqueue messages rather than
   * sending them immediately. Matches AMP's enterQueueMode() on TuiUIState.
   */
  enterQueueMode(): void {
    if (this.isInQueueMode) return;
    this.isInQueueMode = true;
    log.info('AppState.enterQueueMode');
    this._notifyListeners();
  }

  /**
   * Exit queue mode without submitting queued messages.
   * Discards any queued messages. Matches AMP's exitQueueMode() which
   * clears isInQueueMode and is called on thread switch (onThreadSwitch).
   */
  exitQueueMode(): void {
    if (!this.isInQueueMode) return;
    this.isInQueueMode = false;
    this.threadPool.discardQueuedMessages();
    log.info('AppState.exitQueueMode');
    this._notifyListeners();
  }

  /**
   * Submit all queued messages. Exits queue mode and triggers sequential
   * dequeue processing. Matches AMP's submitQueue() on TuiUIState.
   *
   * Each queued message is submitted as a normal prompt in order;
   * auto-dequeue after each turn completion is handled by PromptController
   * (Plan 28-02).
   */
  async submitQueue(): Promise<void> {
    if (!this.isInQueueMode) return;

    const handle = this.threadPool.activeThreadHandleOrNull;
    if (!handle || handle.queuedMessages.length === 0) {
      this.exitQueueMode();
      return;
    }

    this.isInQueueMode = false;
    log.info(`AppState.submitQueue: submitting ${handle.queuedMessages.length} queued messages`);

    // Dequeue the first message and submit it; remaining messages stay in
    // queuedMessages[] for auto-dequeue on turn completion (Plan 28-02).
    const first = handle.queuedMessages.shift();
    if (first) {
      this._notifyListeners();
      await this.submitPrompt(first.text);
    }
  }

  /**
   * Interrupt the next queued message (remove it from the queue).
   * Matches AMP's interruptNextQueuedMessage() which finds the first
   * non-interjected queued message and removes it.
   */
  interruptQueue(): void {
    const handle = this.threadPool.activeThreadHandleOrNull;
    if (!handle || handle.queuedMessages.length === 0) return;

    const removed = handle.queuedMessages.shift();
    log.info(`AppState.interruptQueue: removed "${removed?.text.slice(0, 40)}..."`);
    this._notifyListeners();
  }

  /**
   * Clear all queued messages without exiting queue mode.
   * Matches AMP's discardQueuedMessages pattern when clearing specific
   * messages but staying in queue mode for new input.
   */
  clearQueue(): void {
    this.threadPool.discardQueuedMessages();
    this._notifyListeners();
  }

  // ---------------------------------------------------------------------------
  // Handoff Mode (HAND-01, HAND-02, HAND-03)
  // ---------------------------------------------------------------------------

  /** Braille spinner animation frames matching AMP's toBraille() output. */
  private static readonly _BRAILLE_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

  /**
   * Enter handoff mode. The InputArea switches to handoff prompt editing.
   * Matches AMP's enterHandoffMode callback passed to InputArea.
   *
   * While in handoff mode (and not generating), the user can change the
   * agent mode for the target thread (canChangeAgentModeInPromptEditor).
   */
  enterHandoffMode(): void {
    if (this.handoffState.isInHandoffMode) return;
    this.handoffState = {
      ...DEFAULT_HANDOFF_STATE,
      isInHandoffMode: true,
    };
    log.info('AppState.enterHandoffMode');
    this._notifyListeners();
  }

  /**
   * Exit handoff mode, resetting all handoff state to defaults.
   * Clears any active countdown timer and spinner.
   *
   * Called on:
   * - Thread switch (onThreadSwitch -> handoffController?.resetUIState())
   * - Second Escape in abort confirmation
   * - Handoff submission completion
   * - New thread creation
   *
   * Matches AMP's exitHandoffMode / resetUIState pattern.
   */
  exitHandoffMode(): void {
    if (!this.handoffState.isInHandoffMode &&
        !this.handoffState.isGeneratingHandoff &&
        this.handoffState.countdownSeconds === null) {
      return; // Already in default state
    }
    this._clearCountdownTimer();
    this.handoffState = { ...DEFAULT_HANDOFF_STATE };
    this._spinnerFrame = 0;
    log.info('AppState.exitHandoffMode');
    this._notifyListeners();
  }

  /**
   * Submit the handoff goal. Creates a new thread via ThreadPool.createHandoff()
   * and transitions to generating state.
   *
   * Matches AMP's submit flow:
   * 1. Sets isGeneratingHandoff = true, starts spinner
   * 2. Calls threadPool.createHandoff(goal, options)
   * 3. On completion: exits handoff mode, switches to new thread
   *
   * @param goal - The user's goal text for the new thread
   */
  async submitHandoff(goal: string): Promise<void> {
    if (!this.handoffState.isInHandoffMode && this.handoffState.countdownSeconds === null) {
      log.warn('AppState.submitHandoff: not in handoff mode');
      return;
    }

    // Transition to generating state
    this._clearCountdownTimer();
    this._spinnerFrame = 0;
    this.handoffState = {
      ...this.handoffState,
      isGeneratingHandoff: true,
      isConfirmingAbortHandoff: false,
      pendingHandoffPrompt: goal,
      spinner: AppState._BRAILLE_FRAMES[0],
      countdownSeconds: null,
    };
    log.info(`AppState.submitHandoff: goal="${goal.slice(0, 60)}..."`);
    this._notifyListeners();

    // Start spinner animation
    const spinnerInterval = setInterval(() => {
      this._spinnerFrame = (this._spinnerFrame + 1) % AppState._BRAILLE_FRAMES.length;
      this.handoffState = {
        ...this.handoffState,
        spinner: AppState._BRAILLE_FRAMES[this._spinnerFrame],
      };
      this._notifyListeners();
    }, 80);

    try {
      // Create handoff thread via ThreadPool
      const handle = this.threadPool.createHandoff(goal, {
        agentMode: this.currentMode,
      });

      // Switch to the new thread
      clearInterval(spinnerInterval);
      this.exitHandoffMode();
      this._switchToHandle(handle);
      this.selectedMessageIndex = null;

      log.info(`AppState.submitHandoff: complete, switched to ${handle.threadID}`);
      this._notifyListeners();
    } catch (err) {
      clearInterval(spinnerInterval);
      this.exitHandoffMode();
      log.error(`AppState.submitHandoff: failed`, err);
      this._notifyListeners();
    }
  }

  /**
   * Handle Escape key during handoff mode. Two-stage abort:
   * - First call: sets isConfirmingAbortHandoff = true
   * - Second call: exits handoff mode entirely
   *
   * Matches AMP's two-stage abort pattern:
   *   "Esc to abort handoff" -> "Esc again to abort handoff"
   */
  abortHandoffConfirmation(): void {
    if (!this.handoffState.isInHandoffMode && this.handoffState.countdownSeconds === null) return;

    if (this.handoffState.isConfirmingAbortHandoff) {
      // Second Escape: actually exit
      this.exitHandoffMode();
      log.info('AppState.abortHandoffConfirmation: confirmed, exiting handoff mode');
    } else {
      // First Escape: enter confirmation state
      this.handoffState = {
        ...this.handoffState,
        isConfirmingAbortHandoff: true,
      };
      log.info('AppState.abortHandoffConfirmation: awaiting confirmation');
      this._notifyListeners();
    }
  }

  /**
   * Start the handoff countdown timer. Decrements countdownSeconds every
   * second and auto-submits when it reaches 0.
   *
   * Matches AMP's countdown UI: "Auto-submitting in N..." with "type to edit"
   * hint. Typing or editing cancels the countdown.
   *
   * @param seconds - Initial countdown value (typically 10-30)
   * @param goal - The goal text to auto-submit when countdown reaches 0
   */
  startCountdown(seconds: number, goal: string): void {
    this._clearCountdownTimer();
    this.handoffState = {
      ...this.handoffState,
      countdownSeconds: seconds,
      pendingHandoffPrompt: goal,
    };
    this._notifyListeners();

    this._countdownTimer = setInterval(() => {
      const current = this.handoffState.countdownSeconds;
      if (current === null || current <= 1) {
        // Countdown complete: auto-submit
        this._clearCountdownTimer();
        const pendingGoal = this.handoffState.pendingHandoffPrompt;
        if (pendingGoal) {
          this.submitHandoff(pendingGoal).catch(err => {
            log.error('AppState.startCountdown: auto-submit failed', err);
          });
        }
      } else {
        this.handoffState = {
          ...this.handoffState,
          countdownSeconds: current - 1,
        };
        this._notifyListeners();
      }
    }, 1000);
  }

  /**
   * Cancel the countdown timer without exiting handoff mode.
   * Called when the user starts typing (editing the goal).
   *
   * Matches AMP's "type to edit" behavior that cancels the auto-submit.
   */
  cancelCountdown(): void {
    if (this.handoffState.countdownSeconds === null) return;
    this._clearCountdownTimer();
    this.handoffState = {
      ...this.handoffState,
      countdownSeconds: null,
    };
    log.info('AppState.cancelCountdown');
    this._notifyListeners();
  }

  /**
   * Clear the internal countdown interval timer.
   * Idempotent — safe to call when no timer is active.
   */
  private _clearCountdownTimer(): void {
    if (this._countdownTimer !== null) {
      clearInterval(this._countdownTimer);
      this._countdownTimer = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Bash Invocation Management (SHELL-01, SHELL-02)
  // ---------------------------------------------------------------------------

  /**
   * Add a new bash invocation to the tracked set.
   * Sets the shownAt timestamp and notifies listeners.
   */
  addBashInvocation(invocation: BashInvocation): void {
    this.bashInvocations = [...this.bashInvocations, invocation];
    this.bashInvocationShownAt.set(invocation.id, Date.now());
    log.info(`AppState.addBashInvocation: id=${invocation.id} command=${invocation.command}`);
    this._notifyListeners();
  }

  /**
   * Remove a bash invocation by ID and clean up associated timers.
   */
  removeBashInvocation(id: string): void {
    this.bashInvocations = this.bashInvocations.filter(inv => inv.id !== id);
    this.bashInvocationShownAt.delete(id);
    const timer = this.bashInvocationRemoveTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.bashInvocationRemoveTimers.delete(id);
    }
    this.pendingBashInvocations.delete(id);
    log.info(`AppState.removeBashInvocation: id=${id}`);
    this._notifyListeners();
  }

  /**
   * Update the shell mode status for UI display.
   * Matches AMP's currentShellModeStatus setter.
   */
  setShellModeStatus(status: ShellModeStatus): void {
    if (this.currentShellModeStatus === status) return;
    this.currentShellModeStatus = status;
    log.info(`AppState.setShellModeStatus: ${status}`);
    this._notifyListeners();
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
    const activeHandle = this.threadPool.activeThreadHandleOrNull;

    return {
      version: 1,
      sessionId: meta.sessionId,
      threadID: activeHandle?.threadID,
      cwd: meta.cwd,
      gitBranch: meta.gitBranch,
      model: meta.model,
      createdAt: meta.startTime,
      updatedAt: Date.now(),
      items: [...items],
      plan: [...this.session.plan],
      usage: this.session.usage ? { ...this.session.usage } : null,
      currentMode: this.currentMode,
      threadTitle: activeHandle?.title ?? null,
      threadVisibility: activeHandle?.visibility,
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
    /** ConfigService for reading compaction threshold and other settings. */
    configService?: import('./config-service').ConfigService | null;
  }): AppState {
    const threadPool = new ThreadPool();
    const sessionId = crypto.randomUUID();
    const session = new SessionState({
      sessionId,
      cwd: config.cwd,
      model: config.provider.model,
      defaultToolExpanded: config.defaultToolExpanded,
    });

    const appState = new AppState(session, config.promptHistory, config.sessionStore, threadPool);

    // Register initial session as the first thread in the pool
    const threadID = generateThreadID();
    const initialHandle: ThreadHandle = {
      threadID,
      session,
      conversation: appState.conversation,
      title: null,
      createdAt: Date.now(),
      visibility: 'visible',
      agentMode: 'smart',
      queuedMessages: [],
    };
    threadPool.activateThread(initialHandle);

    const controller = new PromptController({
      session,
      provider: config.provider,
      toolRegistry: config.toolRegistry ?? null,
      systemPrompt: config.systemPrompt ?? null,
      onStreamComplete: () => appState.saveSession(),
      getQueuedMessages: () => {
        const handle = threadPool.activeThreadHandleOrNull;
        return handle?.queuedMessages ?? [];
      },
      getContextUsagePercent: () => appState.contextWindowUsagePercent,
      getCompactionThreshold: () => {
        // Read from ConfigService if available, default to 80%
        return config.configService?.get('internal.compactionThresholdPercent') ?? 80;
      },
    });
    appState.setPromptController(controller);
    threadPool.setCompactionStatusProvider(() => controller.getCompactionStatus());

    log.info(`AppState.create: sessionId=${sessionId} threadID=${threadID} model=${config.provider.model} cwd=${config.cwd}`);

    return appState;
  }
}
