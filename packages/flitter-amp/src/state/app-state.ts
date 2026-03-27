// AppState — global application state bridging ACP events to the TUI
// This will be exposed as an InheritedWidget in Phase 2

import { ConversationState } from './conversation';
import { log } from '../utils/logger';
import type { SessionUpdate, PermissionRequest, ClientCallbacks } from '../acp/client';
import type { UsageInfo } from '../acp/types';

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
  isConnected = false;
  error: string | null = null;
  cwd: string = process.cwd();
  gitBranch: string | null = null;
  skillCount: number = 0;

  private listeners: Set<StateListener> = new Set();
  private pendingPermission: {
    resolve: (optionId: string | null) => void;
    request: PermissionRequest;
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

  // --- State Getters ---

  get isProcessing(): boolean {
    return this.conversation.isProcessing;
  }

  get usage(): UsageInfo | null {
    return this.conversation.usage;
  }

  get hasPendingPermission(): boolean {
    return this.pendingPermission !== null;
  }

  get permissionRequest(): PermissionRequest | null {
    return this.pendingPermission?.request ?? null;
  }

  // --- ClientCallbacks Implementation ---

  onSessionUpdate(_sessionId: string, update: SessionUpdate): void {
    const type = update.sessionUpdate as string;

    switch (type) {
      case 'agent_message_chunk': {
        const content = update.content as { type: string; text?: string };
        if (content?.type === 'text' && content.text) {
          this.conversation.appendAssistantChunk(content.text);
        }
        break;
      }

      case 'agent_thought_chunk': {
        const content = update.content as { type: string; text?: string };
        if (content?.type === 'text' && content.text) {
          this.conversation.appendThinkingChunk(content.text);
        }
        break;
      }

      case 'tool_call': {
        this.conversation.addToolCall(
          update.toolCallId as string,
          update.title as string,
          update.kind as string,
          update.status as 'pending' | 'in_progress' | 'completed' | 'failed',
          update.locations as Array<{ path: string }> | undefined,
          update.rawInput as Record<string, unknown> | undefined,
        );
        break;
      }

      case 'tool_call_update': {
        this.conversation.updateToolCall(
          update.toolCallId as string,
          update.status as 'completed' | 'failed',
          update.content as Array<{ type: string; content?: { type: string; text: string } }> | undefined,
          update.rawOutput as Record<string, unknown> | undefined,
        );
        break;
      }

      case 'plan': {
        const entries = update.entries as Array<{
          content: string;
          priority: 'high' | 'medium' | 'low';
          status: 'pending' | 'in_progress' | 'completed';
        }>;
        this.conversation.setPlan(entries);
        break;
      }

      case 'usage_update': {
        this.conversation.setUsage({
          size: (update as any).size ?? 0,
          used: (update as any).used ?? 0,
          cost: (update as any).cost ?? null,
        });
        break;
      }

      case 'current_mode_update': {
        this.currentMode = update.currentModeId as string;
        break;
      }

      case 'session_info_update': {
        break;
      }

      case 'user_message_chunk':
      case 'available_commands_update':
      case 'config_option_update':
        break;

      default:
        log.debug(`Unknown session update type: ${type}`);
        break;
    }

    this.notifyListeners();
  }

  async onPermissionRequest(request: PermissionRequest): Promise<string | null> {
    // Store the request and notify listeners to show the dialog
    return new Promise<string | null>((resolve) => {
      this.pendingPermission = { resolve, request };
      this.notifyListeners();
    });
  }

  onPromptComplete(_sessionId: string, stopReason: string): void {
    this.conversation.finalizeAssistantMessage();
    this.conversation.finalizeThinking();
    this.conversation.isProcessing = false;
    log.info(`Prompt complete: ${stopReason}`);
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
    log.info(`startProcessing: "${userText}", items before: ${this.conversation.items.length}`);
    this.conversation.addUserMessage(userText);
    log.info(`startProcessing: items after: ${this.conversation.items.length}, isProcessing: true`);
    this.conversation.isProcessing = true;
    this.notifyListeners();
    log.info(`startProcessing: notifyListeners done, listeners: ${this.listeners.size}`);
  }

  setConnected(sessionId: string, agentName: string | null): void {
    this.isConnected = true;
    this.sessionId = sessionId;
    this.agentName = agentName;
    this.notifyListeners();
  }

  setError(error: string): void {
    this.error = error;
    this.notifyListeners();
  }

  clearError(): void {
    this.error = null;
    this.notifyListeners();
  }

  handleError(message: string): void {
    this.conversation.finalizeAssistantMessage();
    this.conversation.finalizeThinking();
    this.conversation.isProcessing = false;
    this.error = message;
    this.notifyListeners();
  }
}
