// Session state management — tracks messages, tool calls, plan, usage per session

import type {
  ConversationItem,
  AssistantMessage,
  ToolCallItem,
  PlanEntry,
  UsageInfo,
} from './types';

export class SessionState {
  readonly id: string;
  readonly cwd: string;
  items: ConversationItem[] = [];
  plan: PlanEntry[] = [];
  usage: UsageInfo | null = null;
  isProcessing = false;
  currentMode: string | null = null;

  // Track current streaming assistant message
  private _streamingMessage: AssistantMessage | null = null;

  constructor(id: string, cwd: string) {
    this.id = id;
    this.cwd = cwd;
  }

  addUserMessage(text: string): void {
    this.items.push({
      type: 'user_message',
      text,
      timestamp: Date.now(),
    });
  }

  startAssistantMessage(): AssistantMessage {
    const msg: AssistantMessage = {
      type: 'assistant_message',
      text: '',
      timestamp: Date.now(),
      isStreaming: true,
    };
    this._streamingMessage = msg;
    this.items.push(msg);
    return msg;
  }

  appendAssistantChunk(text: string): void {
    if (!this._streamingMessage) {
      this.startAssistantMessage();
    }
    this._streamingMessage!.text += text;
  }

  finalizeAssistantMessage(): void {
    if (this._streamingMessage) {
      this._streamingMessage.isStreaming = false;
      this._streamingMessage = null;
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
    // If we were mid-stream on an assistant message, finalize it first
    // so tool calls appear as separate items in the conversation
    this.finalizeAssistantMessage();

    this.items.push({
      type: 'tool_call',
      toolCallId,
      title,
      kind,
      status,
      locations,
      rawInput,
      collapsed: true,
    });
  }

  updateToolCall(
    toolCallId: string,
    status: 'completed' | 'failed',
    content?: ToolCallItem['result'],
  ): void {
    const item = this.items.find(
      (i): i is ToolCallItem => i.type === 'tool_call' && i.toolCallId === toolCallId,
    );
    if (item) {
      item.status = status;
      if (content) item.result = content;
    }
  }

  setPlan(entries: PlanEntry[]): void {
    this.plan = entries;
    // Also add/update plan as a conversation item
    const existingPlan = this.items.find((i): i is { type: 'plan'; entries: PlanEntry[] } => i.type === 'plan');
    if (existingPlan) {
      existingPlan.entries = entries;
    } else {
      this.items.push({ type: 'plan', entries });
    }
  }

  setUsage(usage: UsageInfo): void {
    this.usage = usage;
  }
}
