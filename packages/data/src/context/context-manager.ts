import type { ThreadSnapshot, ThreadMessage } from "@flitter/schemas";
import { BehaviorSubject } from "@flitter/util";
import { countThreadTokens, countMessageTokens } from "./token-counter";

export type CompactionState = "idle" | "compacting";

export type CompactFunction = (messages: ThreadMessage[]) => Promise<string>;

export interface CompactionResult {
  compacted: boolean;
  thread: ThreadSnapshot;
  tokensBefore: number;
  tokensAfter: number;
  summary?: string;
}

export interface ContextManagerOptions {
  compactFn: CompactFunction;
  modelContextWindow?: number;
  compactionThresholdPercent?: number;
  keepRecentMessages?: number;
}

const DEFAULT_CONTEXT_WINDOW = 200_000;
const DEFAULT_THRESHOLD_PERCENT = 80;
const DEFAULT_KEEP_RECENT = 4;

export class ContextManager {
  readonly compactionState = new BehaviorSubject<CompactionState>("idle");

  private compactFn: CompactFunction;
  private modelContextWindow: number;
  private thresholdPercent: number;
  private keepRecent: number;

  constructor(options: ContextManagerOptions) {
    this.compactFn = options.compactFn;
    this.modelContextWindow = options.modelContextWindow ?? DEFAULT_CONTEXT_WINDOW;
    this.thresholdPercent = options.compactionThresholdPercent ?? DEFAULT_THRESHOLD_PERCENT;
    this.keepRecent = options.keepRecentMessages ?? DEFAULT_KEEP_RECENT;
  }

  /** Main entry: check threshold and compact if needed */
  async checkAndCompact(thread: ThreadSnapshot): Promise<CompactionResult> {
    const tokensBefore = countThreadTokens(thread);
    const threshold = Math.floor(this.modelContextWindow * (this.thresholdPercent / 100));

    if (tokensBefore <= threshold || thread.messages.length <= this.keepRecent) {
      return { compacted: false, thread, tokensBefore, tokensAfter: tokensBefore };
    }

    this.compactionState.next("compacting");
    try {
      // Split: messages to summarize vs messages to keep
      const keepCount = Math.min(this.keepRecent, thread.messages.length);
      const splitIdx = thread.messages.length - keepCount;
      const toSummarize = thread.messages.slice(0, splitIdx);
      const toKeep = thread.messages.slice(splitIdx);

      // Call LLM for summary
      const summaryText = await this.compactFn(toSummarize);

      // Build summary message
      const summaryMessage: ThreadMessage = {
        role: "user",
        content: [{
          type: "summary" as any,
          summary: { type: "message", summary: summaryText },
        }],
        messageId: 0,
      } as any;

      // Trim incomplete tool_use sequences from toKeep
      const trimmedKeep = trimIncompleteToolUse(toKeep);

      // Construct new thread
      const newMessages = [summaryMessage, ...trimmedKeep];
      const newThread: ThreadSnapshot = {
        ...thread,
        messages: newMessages,
      };

      const tokensAfter = countThreadTokens(newThread);
      return { compacted: true, thread: newThread, tokensBefore, tokensAfter, summary: summaryText };
    } catch (err) {
      // On failure, restore idle and return original thread
      return { compacted: false, thread, tokensBefore, tokensAfter: tokensBefore };
    } finally {
      this.compactionState.next("idle");
    }
  }
}

/**
 * Trim incomplete tool_use sequences (from _IR, llm-sdk-providers.js:1345-1370)
 * If last assistant message has tool_use content but there is no following
 * user message with tool_result, remove it. Repeat recursively.
 */
function trimIncompleteToolUse(messages: ThreadMessage[]): ThreadMessage[] {
  const result = [...messages];
  while (result.length > 0) {
    const last = result[result.length - 1];
    if (last.role !== "assistant") break;

    const hasToolUse = Array.isArray(last.content) && last.content.some((b: any) => b.type === "tool_use");

    if (!hasToolUse) break;

    // The assistant message ends with tool_use and is the LAST message,
    // meaning there is no subsequent tool_result -- it is incomplete.
    result.pop();
  }
  return result;
}
