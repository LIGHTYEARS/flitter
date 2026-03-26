// Conversation state — message list, streaming state, usage tracking

import type {
  ConversationItem,
  AssistantMessage,
  ThinkingItem,
  ToolCallItem,
  PlanEntry,
  UsageInfo,
} from '../acp/types';

/**
 * ConversationState manages the ordered list of conversation items
 * and tracks the current streaming state.
 */
export class ConversationState {
  items: ConversationItem[] = [];
  plan: PlanEntry[] = [];
  usage: UsageInfo | null = null;
  isProcessing = false;
  toolCallsExpanded = false; // Alt+T global toggle

  private _streamingMessage: AssistantMessage | null = null;
  private _streamingThinking: ThinkingItem | null = null;

  addUserMessage(text: string): void {
    this.items.push({
      type: 'user_message',
      text,
      timestamp: Date.now(),
    });
  }

  appendAssistantChunk(text: string): void {
    if (!this._streamingMessage) {
      const msg: AssistantMessage = {
        type: 'assistant_message',
        text: '',
        timestamp: Date.now(),
        isStreaming: true,
      };
      this._streamingMessage = msg;
      this.items.push(msg);
    }
    this._streamingMessage.text += text;
  }

  finalizeAssistantMessage(): void {
    if (this._streamingMessage) {
      this._streamingMessage.isStreaming = false;
      this._streamingMessage = null;
    }
  }

  appendThinkingChunk(text: string): void {
    if (!this._streamingThinking) {
      const item: ThinkingItem = {
        type: 'thinking',
        text: '',
        timestamp: Date.now(),
        isStreaming: true,
        collapsed: true,
      };
      this._streamingThinking = item;
      this.items.push(item);
    }
    this._streamingThinking.text += text;
  }

  finalizeThinking(): void {
    if (this._streamingThinking) {
      this._streamingThinking.isStreaming = false;
      this._streamingThinking = null;
    }
  }

  addToolCall(
    toolCallId: string,
    title: string,
    kind: string,
    status: ToolCallItem['status'],
    locations?: Array<{ path: string }>,
    rawInput?: Record<string, unknown>,
  ): void {
    this.finalizeAssistantMessage();
    this.items.push({
      type: 'tool_call',
      toolCallId,
      title,
      kind,
      status,
      locations,
      rawInput,
      collapsed: !this.toolCallsExpanded,
    });
  }

  updateToolCall(
    toolCallId: string,
    status: 'completed' | 'failed',
    content?: Array<{ type: string; content?: { type: string; text: string } }>,
    rawOutput?: Record<string, unknown>,
  ): void {
    const item = this.items.find(
      (i): i is ToolCallItem => i.type === 'tool_call' && i.toolCallId === toolCallId,
    );
    if (item) {
      item.status = status;
      item.result = { status, content, rawOutput };
    }
  }

  setPlan(entries: PlanEntry[]): void {
    this.plan = entries;
    // Add/update plan as a conversation item so it renders in ChatView
    const existingPlan = this.items.find(
      (i): i is { type: 'plan'; entries: PlanEntry[] } => i.type === 'plan',
    );
    if (existingPlan) {
      existingPlan.entries = entries;
    } else {
      this.items.push({ type: 'plan', entries });
    }
  }

  setUsage(usage: UsageInfo): void {
    this.usage = usage;
  }

  toggleToolCalls(): void {
    this.toolCallsExpanded = !this.toolCallsExpanded;
    for (const item of this.items) {
      if (item.type === 'tool_call') {
        item.collapsed = !this.toolCallsExpanded;
      }
    }
  }

  clear(): void {
    this.items = [];
    this.plan = [];
    this.usage = null;
    this._streamingMessage = null;
    this._streamingThinking = null;
    this.isProcessing = false;
  }
}
