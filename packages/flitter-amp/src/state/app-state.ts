// AppState — global application state bridging ACP events to the TUI

import type * as acp from '@agentclientprotocol/sdk';
import { ConversationState } from './conversation';
import { log } from '../utils/logger';
import type { ClientCallbacks } from '../acp/client';
import { asSessionInfoPayload } from '../acp/types';
import type { UsageInfo, SessionTools, SessionMode, ConversationItem, PlanEntry } from '../acp/types';
import type { SessionFile } from './session-store';
import type { ConnectionPhase, ConnectionStatus } from './connection-state';
import type { HealthStatus } from '../acp/heartbeat-monitor';
import { DEFAULT_RECONNECTION_CONFIG } from '../acp/reconnection-manager';

/**
 * Listener callback type — called when state changes to trigger widget rebuilds.
 */
export type StateListener = () => void;

/**
 * AppState manages all application state and bridges ACP events to the TUI.
 * Acts as both the state store and the ClientCallbacks implementation.
 */
export class AppState implements ClientCallbacks {
  readonly conversation = new ConversationState();
  sessionId: string | null = null;
  agentName: string | null = null;
  currentMode: string | null = null;
  error: string | null = null;
  cwd: string = process.cwd();
  gitBranch: string | null = null;
  skillCount: number = 0;
  agentCommand: string = '';
  sessionCreatedAt: number = Date.now();

  /** Whether the TUI is in dense (compact) view mode. */
  denseView: boolean = false;

  // --- Connection state machine (Gap #57) ---
  private _connectionStatus: ConnectionStatus = {
    phase: 'connecting',
    attempt: 0,
    maxAttempts: DEFAULT_RECONNECTION_CONFIG.maxAttempts,
    lastError: null,
    nextRetryAt: null,
  };

  /** Connection status for TUI rendering. */
  get connectionStatus(): ConnectionStatus {
    return this._connectionStatus;
  }

  /** Backward-compat computed property -- returns true only when phase is 'connected'. */
  get isConnected(): boolean {
    return this._connectionStatus.phase === 'connected';
  }

  /** Backward-compat setter -- delegates to setConnectionPhase. */
  set isConnected(value: boolean) {
    // No-op setter to avoid breaking existing code that sets this directly.
    // The real state is driven by setConnectionPhase().
  }

  // --- Health monitoring (Gap #58) ---
  healthStatus: HealthStatus = 'unknown';
  healthMissedBeats: number = 0;
  healthAvgLatencyMs: number | null = null;

  // --- Fields populated by session_info_update (Gap #48) ---
  agentVersion: string | null = null;
  hintText: string | null = null;
  tools: SessionTools[] = [];
  modes: SessionMode[] = [];
  autocompleteTriggers: Array<{ trigger: string; description?: string }> = [];

  /** Last stop reason from onPromptComplete, used to detect interrupted state. */
  lastStopReason: string | null = null;

  /**
   * Index into conversation.items of the currently-selected user message,
   * or null when no message is selected. Used by Tab/Shift+Tab navigation.
   */
  selectedMessageIndex: number | null = null;

  // --- Token tracking (NEW-008) ---
  inputTokens: number = 0;
  outputTokens: number = 0;
  contextWindowSize: number = 0;
  costUsd: number = 0;
  elapsedMs: number = 0;
  deepReasoningActive: boolean = false;
  private _promptStartedAt: number | null = null;
  private _elapsedTimer: ReturnType<typeof setInterval> | null = null;

  private listeners: Set<StateListener> = new Set();
  private pendingPermission: {
    resolve: (optionId: string | null) => void;
    request: acp.RequestPermissionRequest;
  } | null = null;

  // --- Listener Management ---

  addListener(listener: StateListener): void {
    this.listeners.add(listener);
  }

  removeListener(listener: StateListener): void {
    this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  // --- Connection Phase Management (Gap #57) ---

  setConnectionPhase(
    phase: ConnectionPhase,
    attempt: number,
    error: string | null,
    nextRetryAt: number | null = null,
  ): void {
    this._connectionStatus = {
      ...this._connectionStatus,
      phase,
      attempt,
      lastError: error,
      nextRetryAt,
    };
    this.notifyListeners();
  }

  // --- Health Monitoring Methods (Gap #58) ---

  setHealthDegraded(missedBeats: number, avgLatencyMs: number | null): void {
    this.healthStatus = 'degraded';
    this.healthMissedBeats = missedBeats;
    this.healthAvgLatencyMs = avgLatencyMs;
    this.notifyListeners();
  }

  clearHealthWarning(): void {
    if (this.healthStatus !== 'healthy') {
      this.healthStatus = 'healthy';
      this.healthMissedBeats = 0;
      this.notifyListeners();
    }
  }

  // --- State Getters ---

  get isProcessing(): boolean {
    return this.conversation.isProcessing;
  }

  /** True when the last prompt was cancelled/interrupted (not a normal end_turn). */
  get isInterrupted(): boolean {
    return this.lastStopReason !== null
      && this.lastStopReason !== 'end_turn'
      && !this.conversation.isProcessing;
  }

  get usage(): UsageInfo | null {
    return this.conversation.usage;
  }

  get hasPendingPermission(): boolean {
    return this.pendingPermission !== null;
  }

  get contextWindowUsagePercent(): number {
    const usage = this.conversation.usage;
    const size = usage?.size || this.contextWindowSize;
    if (size <= 0) return 0;
    const used = usage?.used ?? 0;
    return Math.round((used / size) * 100);
  }

  get isContextWindowHigh(): boolean {
    return this.contextWindowUsagePercent > 80;
  }

  get permissionRequest(): acp.RequestPermissionRequest | null {
    return this.pendingPermission?.request ?? null;
  }

  // --- ClientCallbacks Implementation ---

  onSessionUpdate(_sessionId: string, update: acp.SessionUpdate): void {
    // Discriminated union switch -- the compiler narrows update in each branch.
    switch (update.sessionUpdate) {
      case 'agent_message_chunk': {
        const content = update.content;
        if (content.type === 'text' && content.text) {
          this.conversation.appendAssistantChunk(content.text);
        } else if (content.type !== 'text') {
          log.debug(`Unsupported content type in agent_message_chunk: ${content.type}`);
          this.conversation.appendAssistantChunk(`[unsupported content type: ${content.type}]`);
        }
        break;
      }

      case 'agent_thought_chunk': {
        const content = update.content;
        if (content.type === 'text' && content.text) {
          this.conversation.appendThinkingChunk(content.text);
          this.deepReasoningActive = true;
        }
        break;
      }

      case 'tool_call': {
        this.conversation.addToolCall(
          update.toolCallId,
          update.title,
          update.kind ?? 'other',
          update.status ?? 'pending',
          update.locations as Array<{ path: string }> | undefined,
          update.rawInput as Record<string, unknown> | undefined,
        );
        break;
      }

      case 'tool_call_update': {
        this.conversation.updateToolCall(
          update.toolCallId,
          (update.status ?? 'completed') as 'completed' | 'failed',
          update.content as Array<{ type: string; content?: { type: string; text: string } }> | undefined,
          update.rawOutput as Record<string, unknown> | undefined,
        );
        break;
      }

      case 'plan': {
        this.conversation.setPlan(update.entries);
        break;
      }

      case 'usage_update': {
        this.conversation.setUsage({
          size: update.size,
          used: update.used,
          cost: update.cost as UsageInfo['cost'],
        });
        this.contextWindowSize = update.size;
        const costObj = update.cost as UsageInfo['cost'];
        if (costObj && costObj.amount !== undefined) {
          this.costUsd = costObj.amount;
        }
        if ((update as Record<string, unknown>).inputTokens !== undefined) {
          this.inputTokens = (update as Record<string, unknown>).inputTokens as number;
        }
        if ((update as Record<string, unknown>).outputTokens !== undefined) {
          this.outputTokens = (update as Record<string, unknown>).outputTokens as number;
        }
        if ((update as Record<string, unknown>).deepReasoningActive !== undefined) {
          this.deepReasoningActive = !!(update as Record<string, unknown>).deepReasoningActive;
        }
        break;
      }

      case 'current_mode_update': {
        this.currentMode = update.currentModeId;
        break;
      }

      case 'session_info_update': {
        // The SDK's SessionInfoUpdate type only defines `title` and `updatedAt`.
        // Agent-specific extensions (agentName, cwd, tools, etc.) are delivered
        // as extra properties on the update object. asSessionInfoPayload()
        // extracts them safely via runtime type checks.
        const info = asSessionInfoPayload(update);

        if (info.agentName !== undefined) this.agentName = info.agentName;
        if (info.agentVersion !== undefined) this.agentVersion = info.agentVersion;
        if (info.cwd !== undefined) this.cwd = info.cwd;
        if (info.gitBranch !== undefined) this.gitBranch = info.gitBranch;

        if (Array.isArray(info.tools)) {
          this.tools = info.tools;
          this.skillCount = info.tools.length;
        }
        if (Array.isArray(info.modes)) {
          this.modes = info.modes;
        }
        if (info.hintText !== undefined) {
          this.hintText = info.hintText ?? null;
        }
        if (Array.isArray(info.autocompleteTriggers)) {
          this.autocompleteTriggers = info.autocompleteTriggers;
        }

        log.debug(`session_info_update: agent=${this.agentName}, cwd=${this.cwd}, tools=${this.skillCount}`);
        break;
      }

      default:
        // available_commands_update, config_option_update, user_message_chunk, etc.
        // Silently ignore unhandled update types -- log for debugging only.
        log.debug(`Unhandled session update type: ${(update as { sessionUpdate: string }).sessionUpdate}`);
        break;
    }

    this.notifyListeners();
  }

  async onPermissionRequest(request: acp.RequestPermissionRequest): Promise<string | null> {
    // Store the request and notify listeners to show the dialog
    return new Promise<string | null>((resolve) => {
      this.pendingPermission = { resolve, request };
      this.notifyListeners();
    });
  }

  onPromptComplete(_sessionId: string, stopReason: acp.StopReason): void {
    this.conversation.finalizeAssistantMessage();
    this.conversation.finalizeThinking();
    this.conversation.isProcessing = false;
    this.lastStopReason = stopReason;
    this._stopElapsedTimer();
    if (this._promptStartedAt !== null) {
      this.elapsedMs = Date.now() - this._promptStartedAt;
    }
    log.info(`Prompt complete: ${stopReason}, items=${this.conversation.items.length}`);
    this.notifyListeners();
  }

  onConnectionClosed(reason: string): void {
    this.handleError(`Agent disconnected: ${reason}`);
    // Phase transition is handled by the caller (ReconnectionManager callback)
    // so we do NOT set phase here -- we only set the error.
    this.notifyListeners();
  }

  // --- Error Handling ---

  handleError(message: string): void {
    this.conversation.finalizeAssistantMessage();
    this.conversation.finalizeThinking();
    this.conversation.isProcessing = false;
    this._stopElapsedTimer();
    if (this._promptStartedAt !== null) {
      this.elapsedMs = Date.now() - this._promptStartedAt;
    }
    this.error = message;
    this.notifyListeners();
  }

  // --- Actions (called from TUI) ---

  resolvePermission(optionId: string | null): void {
    if (this.pendingPermission) {
      this.pendingPermission.resolve(optionId);
      this.pendingPermission = null;
      this.notifyListeners();
    }
  }

  startProcessing(userText: string): void {
    this.lastStopReason = null;
    this._promptStartedAt = Date.now();
    this.elapsedMs = 0;
    this._startElapsedTimer();
    this.conversation.addUserMessage(userText);
    this.conversation.isProcessing = true;
    this.notifyListeners();
  }

  /** Starts a periodic timer that updates elapsedMs every 100ms while processing. */
  private _startElapsedTimer(): void {
    this._stopElapsedTimer();
    this._elapsedTimer = setInterval(() => {
      if (this._promptStartedAt !== null) {
        this.elapsedMs = Date.now() - this._promptStartedAt;
        this.notifyListeners();
      }
    }, 100);
  }

  /** Stops the elapsed-time timer. */
  private _stopElapsedTimer(): void {
    if (this._elapsedTimer !== null) {
      clearInterval(this._elapsedTimer);
      this._elapsedTimer = null;
    }
  }

  setConnected(sessionId: string, agentName: string | null): void {
    this.sessionId = sessionId;
    this.agentName = agentName;
    this.error = null;
    this.setConnectionPhase('connected', 0, null);
  }

  setError(error: string): void {
    this.error = error;
    this.notifyListeners();
  }

  clearError(): void {
    this.error = null;
    this.notifyListeners();
  }

  // --- Command Palette Actions (W4-3) ---

  /**
   * Reset conversation state for a new thread.
   * Clears items, plan, and usage while keeping session metadata.
   */
  newThread(): void {
    this.conversation.clear();
    this.lastStopReason = null;
    this.error = null;
    this.notifyListeners();
  }

  /** Toggle dense (compact) view mode. */
  toggleDenseView(): void {
    this.denseView = !this.denseView;
    this.notifyListeners();
  }

  cycleMode(): void {
    const available = this.modes.length > 0
      ? this.modes.map(m => m.id ?? m.name ?? 'smart')
      : ['smart', 'code', 'ask'];
    const current = this.currentMode ?? available[0];
    const idx = available.indexOf(current);
    this.currentMode = available[(idx + 1) % available.length];
    this.notifyListeners();
  }

  toggleDeepReasoning(): void {
    this.deepReasoningActive = !this.deepReasoningActive;
    this.notifyListeners();
  }

  /**
   * Return the text of the last assistant message, or null if none.
   * Scans conversation items in reverse to find the most recent one.
   */
  getLastAssistantMessage(): string | null {
    const items = this.conversation.items;
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (item.type === 'assistant_message' && item.text) {
        return item.text;
      }
    }
    return null;
  }

  /**
   * Copy the last assistant response to the system clipboard.
   * Uses platform-specific clipboard commands for portability.
   * Returns true if a message was found to copy.
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
    } catch {
      // Silently fail -- clipboard access may not be available
    }
    return true;
  }

  /**
   * Build a human-readable usage summary string.
   * Returns null if no usage data is available.
   */
  getUsageSummary(): string | null {
    const usage = this.conversation.usage;
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

  // --- Message Selection Navigation (W4-1) ---

  /**
   * Returns the items-array indices of all user_message items,
   * in order of appearance.
   */
  private userMessageIndices(): number[] {
    const indices: number[] = [];
    const items = this.conversation.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type === 'user_message') indices.push(i);
    }
    return indices;
  }

  /**
   * Select the next (older) user message. Tab moves backward through
   * user messages. When nothing is selected, starts from the newest.
   */
  selectPrevMessage(): void {
    const indices = this.userMessageIndices();
    if (indices.length === 0) return;
    if (this.selectedMessageIndex === null) {
      this.selectedMessageIndex = indices[indices.length - 1];
    } else {
      const pos = indices.indexOf(this.selectedMessageIndex);
      if (pos > 0) {
        this.selectedMessageIndex = indices[pos - 1];
      }
    }
    this.notifyListeners();
  }

  /**
   * Select the next (newer) user message. Shift+Tab moves forward.
   * If already at the newest message, clears selection.
   */
  selectNextMessage(): void {
    const indices = this.userMessageIndices();
    if (indices.length === 0 || this.selectedMessageIndex === null) return;
    const pos = indices.indexOf(this.selectedMessageIndex);
    if (pos < indices.length - 1) {
      this.selectedMessageIndex = indices[pos + 1];
    } else {
      this.selectedMessageIndex = null;
    }
    this.notifyListeners();
  }

  /** Clear the current message selection. */
  clearMessageSelection(): void {
    if (this.selectedMessageIndex !== null) {
      this.selectedMessageIndex = null;
      this.notifyListeners();
    }
  }

  // --- Message Edit / Restore (W4-2) ---

  /**
   * Returns the text of the user message at the given items-array index,
   * or null if the index is invalid or not a user_message.
   */
  getMessageAt(index: number): string | null {
    return this.conversation.getMessageAt(index);
  }

  /**
   * Remove all conversation items after the given items-array index.
   * Used by the "restore" (r) action to replay from a selected message.
   */
  truncateAfter(index: number): void {
    this.conversation.truncateAfter(index);
    this.notifyListeners();
  }

  // --- Session Persistence (Gap #54) ---

  /**
   * Capture a snapshot of the current state for session persistence.
   * Returns null if no session is active (no sessionId).
   * Streaming state is NOT finalized here -- the SessionStore.sanitizeItem()
   * handles that during serialization.
   */
  toSessionFile(): SessionFile | null {
    if (!this.sessionId) return null;
    return {
      version: 1,
      sessionId: this.sessionId,
      agentName: this.agentName,
      agentCommand: this.agentCommand,
      cwd: this.cwd,
      gitBranch: this.gitBranch,
      createdAt: this.sessionCreatedAt,
      updatedAt: Date.now(),
      items: [...this.conversation.items] as ConversationItem[],
      plan: [...this.conversation.plan] as PlanEntry[],
      usage: this.conversation.usage as UsageInfo | null,
      currentMode: this.currentMode,
    };
  }

  /**
   * Restore conversation state from a persisted session file.
   * This restores the local UI state only. It does NOT restore agent-side
   * state -- that requires ACP LoadSession (handled in connection.ts).
   */
  restoreFromSession(session: SessionFile): void {
    this.conversation.restoreFromSession(
      [...session.items],
      [...session.plan],
      session.usage,
      session.currentMode,
    );
    this.currentMode = session.currentMode;
    this.sessionCreatedAt = session.createdAt;
    this.notifyListeners();
  }
}
