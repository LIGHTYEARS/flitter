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
  ImageAttachment,
  FileChangeEntry,
} from './types';
// ToastType re-exported for consumers that need it
export type { ToastType } from './types';
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
import { readImageFromClipboard } from '../utils/clipboard-image';
import { ToastController } from '../widgets/toast-overlay';
import { SkillService } from './skill-service';
import type { SkillDefinition } from './skill-types';
import { parseShellCommand } from '../widgets/input-area';
import { BashExecutor } from '../tools/bash-executor';
import { HandoffService } from './handoff-service';

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

  /** Toast notification controller. Matches AMP's GhR.toastController = new x1R. */
  readonly toastController: ToastController;

  /** The prompt controller wiring Provider to SessionState. Set after construction. */
  private _promptController: PromptController | null = null;

  /** Lazily-created HandoffService instance — delegates handoff lifecycle (F17). */
  private _handoffService: HandoffService | null = null;

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

  // --- Bash Invocation Tracking (SHELL-01, SHELL-02) ---

  /** Active bash invocations tracked in the UI. Matches AMP's bashInvocations array. */
  bashInvocations: BashInvocation[] = [];

  /** 等待显示的 bash invocation（75ms 延迟后才加入 bashInvocations[]）。匹配 AMP 的 pendingBashInvocations。 */
  pendingBashInvocations = new Map<string, { invocation: BashInvocation; showTimer: ReturnType<typeof setTimeout> }>();

  /** Timestamps when each invocation was first shown (epoch ms). */
  bashInvocationShownAt: Map<string, number> = new Map();

  /** Removal timer handles keyed by invocation ID. */
  bashInvocationRemoveTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  /** Current shell mode status for UI display. Matches AMP's currentShellModeStatus. */
  currentShellModeStatus: ShellModeStatus = null;

  // --- Double-Escape 取消确认状态 (G4) ---

  /** 是否处于"确认取消处理"状态（第一次 Esc 后设为 true，1s 超时后重置）。匹配 AMP 的 isConfirmingCancelProcessing。 */
  isConfirmingCancelProcessing = false;

  /** 取消确认超时计时器（1s 后自动重置 isConfirmingCancelProcessing）。 */
  cancelProcessingConfirmTimeout: ReturnType<typeof setTimeout> | null = null;

  // --- Image Attachment State (IMG-01, IMG-02, IMG-03, IMG-04) ---

  /** Active image attachments. Matches AMP's GhR.imageAttachments array. */
  imageAttachments: ImageAttachment[] = [];

  /** Whether an image paste operation is in progress. Matches AMP's isUploadingImageAttachments. */
  isUploadingImageAttachments: boolean = false;

  // --- File Change Tracking (OVLY-05) ---

  /** Files modified during the current session. Matches AMP's ThreadWorker.fileChanges. */
  fileChanges: FileChangeEntry[] = [];

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
    this.toastController = new ToastController();

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

  /**
   * Access the HandoffService, lazily creating it on first access.
   * Delegates all handoff lifecycle operations (F17).
   */
  get handoffService(): HandoffService {
    if (!this._handoffService) {
      this._handoffService = new HandoffService({
        threadPool: this.threadPool,
        getHandoffState: () => this.handoffState,
        setHandoffState: (s) => { this.handoffState = s; },
        getActiveThreadID: () => this.threadPool.activeThreadContextID,
        getCurrentMode: () => this.currentMode,
        notifyListeners: () => this._notifyListeners(),
      });
    }
    return this._handoffService;
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

  get isAwaitingPermission(): boolean {
    return this._permissionResolve !== null;
  }

  get hasRunningTools(): boolean {
    return this.session.lifecycle === 'tool_execution';
  }

  get isExecutingCommand(): boolean {
    return false;
  }

  get isRunningShell(): boolean {
    return this.bashInvocations.some(inv => inv.status === 'running') ||
      this.pendingBashInvocations.size > 0;
  }

  get isAutoCompacting(): boolean {
    if (!this._promptController) return false;
    const status = this._promptController.getCompactionStatus();
    return status.compactionState === 'compacting';
  }

  get isHandingOff(): boolean {
    return this.handoffState.isGeneratingHandoff;
  }

  get hasStartedResponse(): boolean {
    for (const item of this.session.items) {
      if (item.type === 'assistant_message' && item.isStreaming) return true;
    }
    return false;
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
   * Submit a user prompt. Intercepts `$`/`$$` prefixed text to invoke
   * bash commands directly (matching AMP's onTextSubmitted shell mode branch).
   * Non-shell text delegates to PromptController.submitPrompt().
   */
  async submitPrompt(text: string): Promise<void> {
    this.clearCompletedBashInvocations();

    const shellCmd = parseShellCommand(text);
    if (shellCmd) {
      if (!shellCmd.cmd) {
        log.info('AppState.submitPrompt: empty shell command, ignoring');
        return;
      }
      if (this.isProcessing) {
        log.info('AppState.submitPrompt: shell mode blocked while agent is active');
        return;
      }
      await this.invokeBashCommand(shellCmd.cmd, { visibility: shellCmd.visibility });
      return;
    }
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
          reason: 'Matches built-in permissions rule: ask Bash',
        };
      }
      case 'edit_file':
      case 'edit': {
        return {
          header: 'Allow editing file:',
          filePath: rawInput.path as string | undefined,
          reason: 'Matches built-in permissions rule: ask Edit',
        };
      }
      case 'create_file':
      case 'write':
      case 'create': {
        return {
          header: 'Allow creating file:',
          filePath: rawInput.path as string | undefined,
          reason: 'Matches built-in permissions rule: ask Create',
        };
      }
      default: {
        const json = Object.keys(rawInput).length > 0
          ? JSON.stringify(rawInput, null, 2)
          : undefined;
        return {
          header: `Allow ${toolCall.title}?`,
          json,
          reason: 'Matches built-in permissions rule: ask Tool',
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
  async newThread(): Promise<void> {
    // AMP's startAndSwitchToNewThread calls onThreadSwitch which exits queue/handoff mode
    this.exitQueueMode();
    this.exitHandoffMode();
    const model = this.session.metadata.model;
    const cwd = this.session.metadata.cwd;
    const handle = await this.threadPool.createThread({
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
   * Saves the current agent mode to the outgoing thread and restores
   * the target thread's agent mode (F15 per-thread persistence).
   * Matches AMP's switchToExistingThread().
   */
  switchToThread(threadID: string): void {
    // AMP's onThreadSwitch() calls exitQueueMode() and handoffController?.resetUIState()
    this.exitQueueMode();
    this.exitHandoffMode();
    this.threadPool.switchThread(threadID, { currentAgentMode: this.currentMode });
    const handle = this.threadPool.activeThreadHandle;
    this._switchToHandle(handle);
    // Restore the target thread's persisted agent mode (F15)
    if (handle.agentMode !== null) {
      this.currentMode = handle.agentMode;
    }
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

  /** Cycle through visible agent modes. Per MODE-02. Updates active thread handle (F15). */
  cycleMode(): void {
    const current = this.currentMode ?? VISIBLE_MODE_KEYS[0];
    const idx = VISIBLE_MODE_KEYS.indexOf(current);
    const nextIdx = idx === -1 ? 0 : (idx + 1) % VISIBLE_MODE_KEYS.length;
    this.currentMode = VISIBLE_MODE_KEYS[nextIdx];
    this._agentModePulseSeq = (this._agentModePulseSeq ?? 0) + 1;
    // Persist mode to active thread handle (F15)
    const activeHandle = this.threadPool.activeThreadHandleOrNull;
    if (activeHandle) {
      activeHandle.agentMode = this.currentMode;
    }
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

  /**
   * Enqueue a message for later submission with smart-enqueue-when-idle.
   *
   * Wraps ThreadPool.queueMessage() with an additional check: if the thread
   * worker is idle and we just added the first message to the queue, immediately
   * dequeue it and submit through the normal prompt flow. This avoids the user
   * having to wait for an explicit dequeue when nothing is running.
   *
   * Matches AMP's gZR.queueMessage() + immediate dequeue-when-idle pattern
   * from 29_thread_worker_statemachine.js.
   *
   * @param text - The user message text to enqueue
   * @param images - Optional image attachments
   */
  enqueueMessage(text: string, images?: Array<{ filename: string }>): void {
    this.threadPool.queueMessage(text, images);

    // Smart dequeue: if worker is idle, immediately dequeue and submit
    const handle = this.threadPool.activeThreadHandleOrNull;
    if (!handle) return;

    const worker = this.threadPool.getOrCreateWorker(handle.threadID);
    if (worker.isIdle && handle.queuedMessages.length === 1) {
      // Only auto-dequeue if we just added the first message (not accumulating)
      const next = handle.queuedMessages.shift();
      if (next) {
        log.info(`AppState.enqueueMessage: worker idle, immediate dequeue "${next.text.slice(0, 40)}..."`);
        this.submitPrompt(next.text);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Handoff Mode (HAND-01, HAND-02, HAND-03) — delegates to HandoffService (F17)
  // ---------------------------------------------------------------------------

  /**
   * Enter handoff mode. Delegates to HandoffService.enterHandoffMode().
   */
  enterHandoffMode(): void {
    this.handoffService.enterHandoffMode();
  }

  /**
   * Exit handoff mode, resetting all handoff state to defaults.
   * Delegates to HandoffService.exitHandoffMode().
   */
  exitHandoffMode(): void {
    this.handoffService.exitHandoffMode();
  }

  /**
   * Submit the handoff goal. Creates a new thread and switches to it.
   * Delegates to HandoffService.submitHandoff().
   *
   * @param goal - The user's goal text for the new thread
   */
  async submitHandoff(goal: string): Promise<void> {
    const handle = await this.handoffService.submitHandoff(goal);
    if (handle) {
      this._switchToHandle(handle);
      this.selectedMessageIndex = null;
      log.info(`AppState.submitHandoff: complete, switched to ${handle.threadID}`);
      this._notifyListeners();
    }
  }

  /**
   * Handle Escape key during handoff mode. Two-stage abort.
   * Delegates to HandoffService.abortHandoffConfirmation().
   */
  abortHandoffConfirmation(): void {
    this.handoffService.abortHandoffConfirmation();
  }

  /**
   * Start the handoff countdown timer.
   * Delegates to HandoffService.startCountdown().
   */
  startCountdown(seconds: number, goal: string): void {
    this.handoffService.startCountdown(seconds, goal);
  }

  /**
   * Cancel the countdown timer without exiting handoff mode.
   * Delegates to HandoffService.cancelCountdown().
   */
  cancelCountdown(): void {
    this.handoffService.cancelCountdown();
  }

  /**
   * Clear the internal countdown interval timer.
   * Delegates to HandoffService.dispose() for cleanup.
   */
  private _clearCountdownTimer(): void {
    // Preserved for shutdown() and legacy callers — delegate to service
    if (this._handoffService) {
      this._handoffService.dispose();
    }
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
   * 移除 bash invocation。严格参照 AMP 的 removeBashInvocation 实现：
   * - 如果还在 pending 中，取消 showTimer 并直接删除
   * - 如果已显示但不足 500ms，设置延迟移除定时器（G2: 500ms 最小显示时间）
   * - 否则立即通过 doRemoveBashInvocation 移除
   */
  removeBashInvocation(id: string): void {
    // 先检查 pending——如果还在 pending 中，取消 showTimer 并直接移除
    const pendingEntry = this.pendingBashInvocations.get(id);
    if (pendingEntry) {
      clearTimeout(pendingEntry.showTimer);
      this.pendingBashInvocations.delete(id);
      return;
    }

    // G2: 500ms 最小显示时间
    const shownAt = this.bashInvocationShownAt.get(id);
    if (shownAt !== undefined) {
      const elapsed = Date.now() - shownAt;
      if (elapsed < 500 && !this.bashInvocationRemoveTimers.has(id)) {
        const timer = setTimeout(() => {
          this.doRemoveBashInvocation(id);
        }, 500 - elapsed);
        this.bashInvocationRemoveTimers.set(id, timer);
        return;
      }
    }

    this.doRemoveBashInvocation(id);
  }

  /**
   * 实际移除 bash invocation 的内部方法。参照 AMP 的 doRemoveBashInvocation。
   * 清理 shownAt 和 removeTimer 记录，从 bashInvocations[] 中过滤移除，并通知 UI。
   */
  private doRemoveBashInvocation(id: string): void {
    this.bashInvocationShownAt.delete(id);
    this.bashInvocationRemoveTimers.delete(id);
    this.bashInvocations = this.bashInvocations.filter(inv => inv.id !== id);
    log.info(`AppState.doRemoveBashInvocation: id=${id}`);
    this._notifyListeners();
  }

  /**
   * 取消所有 bash invocation（pending + running + shown）。
   * 严格参照 AMP cancelBashInvocations 实现（chunk-044.js tr 后 line 393-396）：
   * 1. 清理 pending invocations（清除 showTimer 并 abort）
   * 2. 清理 remove timers 和 shownAt 记录
   * 3. Abort 正在运行的 invocation 并清空 shown 列表
   */
  cancelBashInvocations(): void {
    // 1. 清理 pending invocations
    for (const [id, entry] of this.pendingBashInvocations) {
      clearTimeout(entry.showTimer);
      entry.invocation.abortController.abort();
      this.pendingBashInvocations.delete(id);
    }

    // 2. 清理 remove timers
    for (const [id, timer] of this.bashInvocationRemoveTimers) {
      clearTimeout(timer);
      this.bashInvocationRemoveTimers.delete(id);
      this.bashInvocationShownAt.delete(id);
    }

    // 3. Abort 正在运行的 invocation（匹配 AMP: 只 abort status 为 running 的）
    const running = this.bashInvocations.find(inv => inv.status === 'running');
    if (running) {
      running.abortController.abort();
    }

    this.bashInvocations = [];
    this._notifyListeners();
  }

  /**
   * 清理所有已完成/失败的 bash invocation。
   * 在用户提交新 prompt 时调用，使之前的输出消失。
   * 同时处理 pending 和 shown 中的已完成项。
   */
  clearCompletedBashInvocations(): void {
    // 清理 pending 中已完成的
    for (const [id, entry] of this.pendingBashInvocations) {
      if (entry.invocation.status !== 'running') {
        clearTimeout(entry.showTimer);
        this.pendingBashInvocations.delete(id);
      }
    }
    // 清理 shown 中已完成的
    const before = this.bashInvocations.length;
    const completedIds = this.bashInvocations
      .filter(inv => inv.status !== 'running')
      .map(inv => inv.id);
    for (const id of completedIds) {
      this.bashInvocationShownAt.delete(id);
      const timer = this.bashInvocationRemoveTimers.get(id);
      if (timer) {
        clearTimeout(timer);
        this.bashInvocationRemoveTimers.delete(id);
      }
    }
    this.bashInvocations = this.bashInvocations.filter(inv => inv.status === 'running');
    if (this.bashInvocations.length !== before) {
      this._notifyListeners();
    }
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

  /**
   * 直接执行 shell 模式的 bash 命令（`$`/`$$` 前缀）。
   * 严格参照 AMP 的 invokeBashCommand 实现：
   * - G1: 75ms pending→shown 延迟（先放入 pendingBashInvocations，75ms 后才加入 bashInvocations[]）
   * - G2: 完成后通过 removeBashInvocation 实现 500ms 最小显示时间
   * - 使用 AbortController 支持取消
   */
  async invokeBashCommand(command: string, opts: { visibility: 'shell' | 'hidden' }): Promise<void> {
    const id = `bash-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const abortController = new AbortController();
    const invocation: BashInvocation = {
      id,
      command,
      startedAt: Date.now(),
      status: 'running',
      abortController,
      hidden: opts.visibility === 'hidden',
    };

    // G1: 75ms pending→shown 延迟（AMP: pendingBashInvocations + setTimeout 75ms）
    const showTimer = setTimeout(() => {
      const entry = this.pendingBashInvocations.get(id);
      if (entry) {
        this.pendingBashInvocations.delete(id);
        this.bashInvocationShownAt.set(id, Date.now());
        this.bashInvocations = [...this.bashInvocations, entry.invocation];
        this._notifyListeners();
      }
    }, 75);

    this.pendingBashInvocations.set(id, { invocation, showTimer });

    log.info(`AppState.invokeBashCommand: id=${id} cmd=${command.slice(0, 200)} visibility=${opts.visibility}`);

    const executor = new BashExecutor();
    try {
      const result = await executor.execute(
        { command },
        { cwd: this.metadata.cwd, abortSignal: abortController.signal },
      );

      const finalStatus = result.isError ? 'failed' : 'completed';

      // 更新 pending 和 shown 中的 invocation 状态和输出
      const pendingEntry = this.pendingBashInvocations.get(id);
      if (pendingEntry) {
        pendingEntry.invocation.status = finalStatus as BashInvocation['status'];
        pendingEntry.invocation.output = result.content;
      }
      this.bashInvocations = this.bashInvocations.map(inv =>
        inv.id === id
          ? { ...inv, status: finalStatus as BashInvocation['status'], output: result.content }
          : inv,
      );

      this._notifyListeners();
      this.removeBashInvocation(id);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);

      const pendingEntry = this.pendingBashInvocations.get(id);
      if (pendingEntry) {
        pendingEntry.invocation.status = 'failed';
        pendingEntry.invocation.output = `Error: ${errMsg}`;
      }
      this.bashInvocations = this.bashInvocations.map(inv =>
        inv.id === id ? { ...inv, status: 'failed' as const, output: `Error: ${errMsg}` } : inv,
      );

      log.error(`AppState.invokeBashCommand: error: ${errMsg}`);
      this._notifyListeners();
      this.removeBashInvocation(id);
    }
  }

  // ---------------------------------------------------------------------------
  // Image Attachment Management (IMG-01, IMG-02, IMG-03, IMG-04)
  // ---------------------------------------------------------------------------

  /**
   * Paste image from system clipboard into the image attachments array.
   * Matches AMP's handleInsertImage / pasteImageFromClipboard pattern.
   *
   * Sets isUploadingImageAttachments to true during the async clipboard read,
   * then adds the image to the attachments array on success.
   */
  async pasteImage(): Promise<void> {
    if (this.isUploadingImageAttachments) return;

    this.isUploadingImageAttachments = true;
    this._notifyListeners();

    try {
      const clipData = await readImageFromClipboard();
      if (clipData) {
        const attachment: ImageAttachment = {
          id: crypto.randomUUID(),
          data: clipData.data,
          mimeType: clipData.mimeType,
        };
        this.imageAttachments = [...this.imageAttachments, attachment];
        log.info('AppState.pasteImage: image attached', {
          id: attachment.id,
          byteLength: attachment.data.byteLength,
        });
      } else {
        log.info('AppState.pasteImage: no image in clipboard');
      }
    } catch (err) {
      log.info('AppState.pasteImage: failed', { error: String(err) });
    } finally {
      this.isUploadingImageAttachments = false;
      this._notifyListeners();
    }
  }

  /**
   * Remove the last attached image. Matches AMP's popImage / handlePopImage.
   * Called on Backspace when input is empty and images are attached.
   */
  popImage(): void {
    if (this.imageAttachments.length === 0) return;
    this.imageAttachments = this.imageAttachments.slice(0, -1);
    log.info('AppState.popImage: removed last image');
    this._notifyListeners();
  }

  /**
   * Clear all image attachments. Used on prompt submit or thread switch.
   */
  clearImageAttachments(): void {
    if (this.imageAttachments.length === 0) return;
    this.imageAttachments = [];
    log.info('AppState.clearImageAttachments');
    this._notifyListeners();
  }

  /**
   * Show full-screen image preview overlay for the given image.
   * Matches AMP's onShowImagePreview / imagePreview state field.
   */
  showImagePreview(image: ImageAttachment): void {
    // Lazy import to avoid circular dependency
    const { ImagePreviewOverlay } = require('../widgets/image-preview-overlay');
    this.overlayManager.show({
      id: OVERLAY_IDS.IMAGE_PREVIEW,
      priority: OVERLAY_PRIORITIES.IMAGE_PREVIEW,
      modal: true,
      placement: { type: 'fullscreen' },
      builder: (onDismiss: () => void) => new ImagePreviewOverlay({
        image,
        onDismiss,
        onSave: async (filename: string) => {
          try {
            const path = `${this.session.metadata.cwd}/${filename}`;
            await Bun.write(path, image.data);
            log.info('AppState.showImagePreview: saved image', { path });
            onDismiss();
          } catch (err) {
            log.info('AppState.showImagePreview: save failed', { error: String(err) });
          }
        },
      }),
    });
  }

  // ---------------------------------------------------------------------------
  // File Change Tracking (OVLY-05)
  // ---------------------------------------------------------------------------

  /**
   * Add a file change entry to the tracked changes list.
   * Deduplicates by path — replaces existing entry for the same path.
   */
  addFileChange(entry: FileChangeEntry): void {
    this.fileChanges = [
      ...this.fileChanges.filter(f => f.path !== entry.path),
      entry,
    ];
    log.info('AppState.addFileChange', { path: entry.path, status: entry.status });
    this._notifyListeners();
  }

  /**
   * Clear all tracked file changes. Used on thread switch or session reset.
   */
  clearFileChanges(): void {
    if (this.fileChanges.length === 0) return;
    this.fileChanges = [];
    log.info('AppState.clearFileChanges');
    this._notifyListeners();
  }

  // ---------------------------------------------------------------------------
  // Toast Notification (OVLY-01)
  // ---------------------------------------------------------------------------

  /**
   * Show a toast notification. Delegates to toastController.
   * Matches AMP's showToast: (t, i="success", c) => this.toastController.show(t, i, c).
   */
  showToast(message: string, type: import('./types').ToastType = 'success', durationMs?: number): void {
    this.toastController.show(message, type, durationMs);
  }

  // ---------------------------------------------------------------------------
  // Confirmation Overlay (OVLY-02)
  // ---------------------------------------------------------------------------

  /**
   * Show a generic confirmation overlay via OverlayManager.
   * Matches AMP's isShowingConfirmationOverlay pattern.
   */
  showConfirmation(opts: {
    title: string;
    message?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    options?: Array<{ label: string; keybind: string; callback: () => void }>;
  }): void {
    // Lazy import to avoid circular dependency
    const { ConfirmationOverlay } = require('../widgets/confirmation-overlay');
    this.overlayManager.show({
      id: OVERLAY_IDS.CONFIRMATION,
      priority: OVERLAY_PRIORITIES.CONFIRMATION,
      modal: true,
      placement: { type: 'fullscreen' },
      builder: (onDismiss: () => void) => new ConfirmationOverlay({
        title: opts.title,
        message: opts.message,
        onConfirm: () => {
          onDismiss();
          opts.onConfirm();
        },
        onCancel: () => {
          onDismiss();
          opts.onCancel?.();
        },
        onDismiss,
        options: opts.options,
      }),
    });
  }

  /**
   * Dismiss the confirmation overlay if active.
   */
  dismissConfirmation(): void {
    this.overlayManager.dismiss(OVERLAY_IDS.CONFIRMATION);
  }

  // ---------------------------------------------------------------------------
  // Context Detail Overlay (OVLY-03)
  // ---------------------------------------------------------------------------

  /**
   * Show the context detail overlay with token usage breakdown.
   * Matches AMP's isShowingContextDetailOverlay state field.
   */
  showContextDetail(): void {
    // Lazy import to avoid circular dependency
    const { ContextDetailOverlay } = require('../widgets/context-detail-overlay');
    this.overlayManager.show({
      id: OVERLAY_IDS.CONTEXT_DETAIL,
      priority: OVERLAY_PRIORITIES.CONTEXT_DETAIL,
      modal: true,
      placement: { type: 'fullscreen' },
      builder: (onDismiss: () => void) => new ContextDetailOverlay({
        usage: this.session.usage,
        contextWindowPercent: this.contextWindowUsagePercent,
        onDismiss,
      }),
    });
  }

  // ---------------------------------------------------------------------------
  // Context Analyze Overlay (OVLY-04)
  // ---------------------------------------------------------------------------

  /**
   * Show the context analysis modal with conversation breakdown.
   * Matches AMP's isShowingContextAnalyzeModal state field.
   */
  showContextAnalyze(): void {
    // Lazy import to avoid circular dependency
    const { ContextAnalyzeOverlay } = require('../widgets/context-analyze-overlay');
    this.overlayManager.show({
      id: OVERLAY_IDS.CONTEXT_ANALYZE,
      priority: OVERLAY_PRIORITIES.CONTEXT_ANALYZE,
      modal: true,
      placement: { type: 'fullscreen' },
      builder: (onDismiss: () => void) => new ContextAnalyzeOverlay({
        items: this.session.items,
        usage: this.session.usage,
        onDismiss,
      }),
    });
  }

  // ---------------------------------------------------------------------------
  // File Changes Overlay (OVLY-05)
  // ---------------------------------------------------------------------------

  /**
   * Show the file changes overlay listing all modifications.
   * Matches AMP's isShowingFileChangesOverlay state field.
   */
  showFileChanges(): void {
    // Lazy import to avoid circular dependency
    const { FileChangesOverlay } = require('../widgets/file-changes-overlay');
    this.overlayManager.show({
      id: OVERLAY_IDS.FILE_CHANGES,
      priority: OVERLAY_PRIORITIES.FILE_CHANGES,
      modal: true,
      placement: { type: 'fullscreen' },
      builder: (onDismiss: () => void) => new FileChangesOverlay({
        files: this.fileChanges,
        onDismiss,
      }),
    });
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
    gitBranch?: string | null;
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
      gitBranch: config.gitBranch,
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
      status: null,
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
      consumePendingSkills: () => appState.consumePendingSkillsMessage(),
    });
    appState.setPromptController(controller);
    threadPool.setCompactionStatusProvider(() => controller.getCompactionStatus());

    log.info(`AppState.create: sessionId=${sessionId} threadID=${threadID} model=${config.provider.model} cwd=${config.cwd}`);

    return appState;
  }
}
