import type { ThreadContentBlock, ThreadMessage, ThreadSnapshot } from "@flitter/schemas";
import { BehaviorSubject } from "@flitter/util";
import { countThreadTokens } from "./token-counter";

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
  /**
   * Optional callback to get current system prompt blocks for context-aware
   * summaries. When provided, the summary prompt includes key system context
   * so the LLM can produce a summary that preserves relevant conversation details.
   *
   * 逆向: amp includes environment/tool context when building summaries
   * (chunk-002.js:20592-20599)
   */
  getSystemContext?: () => Promise<string | null>;
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
  private getSystemContext?: () => Promise<string | null>;

  constructor(options: ContextManagerOptions) {
    this.compactFn = options.compactFn;
    this.modelContextWindow = options.modelContextWindow ?? DEFAULT_CONTEXT_WINDOW;
    this.thresholdPercent = options.compactionThresholdPercent ?? DEFAULT_THRESHOLD_PERCENT;
    this.keepRecent = options.keepRecentMessages ?? DEFAULT_KEEP_RECENT;
    this.getSystemContext = options.getSystemContext;
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

      // ── Extract info-role messages from the summarized portion ──
      // 逆向: amp preserves loaded skills and context reminders by injecting
      // them as info-role messages. k8T (chunk-002.js:1909) starts from the
      // summary block, so info messages before the summary would be lost.
      // We extract them and re-inject after the summary.
      const pinnedInfoMessages = extractInfoMessages(toSummarize);

      // ── Check for existing summary block to avoid double-summarizing ──
      // 逆向: pm() (modules/1602_unknown_pm.js:20-31) scans backward for
      // role="info" messages with {type: "summary"} content.
      // In Flitter, summary messages use role="user". We scan accordingly.
      const existingSummary = findSummaryBlock(toSummarize);

      // ── Optionally prepend system context for context-aware summary ──
      // 逆向: amp chunk-002.js:20592-20599 includes environment/tool context
      let summaryText: string;

      if (existingSummary) {
        // Only summarize messages after the old summary; prefix with old text
        // so the new summary can build upon it
        const contextPrefix = `Previous summary: ${existingSummary.summaryText}\n\nAdditional messages to incorporate:\n`;
        const newToSummarize = toSummarize.slice(existingSummary.index + 1);
        if (newToSummarize.length > 0) {
          // Internal context prefix message (messageId=-1 is a sentinel not in the thread)
          const contextMsg: ThreadMessage = {
            role: "user",
            content: [{ type: "text", text: contextPrefix }],
            messageId: -1,
          };
          let messagesForFn: ThreadMessage[] = [contextMsg, ...newToSummarize];
          if (this.getSystemContext) {
            const systemContext = await this.getSystemContext();
            if (systemContext) {
              const systemMsg: ThreadMessage = {
                role: "user",
                content: [{ type: "text", text: `[System context for summary]\n${systemContext}` }],
                messageId: -2,
              };
              messagesForFn = [systemMsg, ...messagesForFn];
            }
          }
          summaryText = await this.compactFn(messagesForFn);
        } else {
          // Nothing new to summarize, keep the old summary text
          summaryText = existingSummary.summaryText;
        }
      } else {
        let messagesForFn: ThreadMessage[] = toSummarize;
        if (this.getSystemContext) {
          const systemContext = await this.getSystemContext();
          if (systemContext) {
            const systemMsg: ThreadMessage = {
              role: "user",
              content: [{ type: "text", text: `[System context for summary]\n${systemContext}` }],
              messageId: -2,
            };
            messagesForFn = [systemMsg, ...toSummarize];
          }
        }
        summaryText = await this.compactFn(messagesForFn);
      }

      // Build summary message
      const summaryMessage: ThreadMessage = {
        role: "user",
        content: [
          {
            type: "summary",
            summary: { type: "message", summary: summaryText },
          } satisfies ThreadContentBlock,
        ],
        messageId: 0,
      };

      // Trim incomplete tool_use sequences from toKeep
      const trimmedKeep = trimIncompleteToolUse(toKeep);

      // ── Construct new thread with pinned info messages ──
      // Order: summary → pinned info messages → kept messages
      // 逆向: k8T starts from summary, then processes remaining messages
      // in order. Info messages are processed as user-role content parts.
      const newMessages = [summaryMessage, ...pinnedInfoMessages, ...trimmedKeep];
      const newThread: ThreadSnapshot = {
        ...thread,
        messages: newMessages,
      };

      const tokensAfter = countThreadTokens(newThread);
      return {
        compacted: true,
        thread: newThread,
        tokensBefore,
        tokensAfter,
        summary: summaryText,
      };
    } catch (_err) {
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

    const hasToolUse =
      Array.isArray(last.content) &&
      last.content.some((b: ThreadContentBlock) => b.type === "tool_use");

    if (!hasToolUse) break;

    // The assistant message ends with tool_use and is the LAST message,
    // meaning there is no subsequent tool_result -- it is incomplete.
    result.pop();
  }
  return result;
}

/**
 * Extract info-role messages from a message list.
 *
 * These messages carry loaded skill content, context reminders, and other
 * injected context that should be preserved across compaction.
 *
 * 逆向: amp's info-role messages (chunk-002.js:22812-22819) carry skill
 * invocations and context blocks. k8T (chunk-002.js:1989-2004) processes
 * info messages as user-role content with text parts.
 *
 * We filter to only include info messages with substantive text content
 * (not empty or trivially short messages).
 */
function extractInfoMessages(messages: ThreadMessage[]): ThreadMessage[] {
  const infoMessages: ThreadMessage[] = [];

  for (const msg of messages) {
    if (msg.role !== "info") continue;
    // Only pin info messages with non-trivial text content
    const hasText =
      Array.isArray(msg.content) &&
      msg.content.some(
        (block: ThreadContentBlock) =>
          block.type === "text" && typeof block.text === "string" && block.text.trim().length > 20,
      );

    if (hasText) {
      infoMessages.push(msg);
    }
  }

  return infoMessages;
}

/**
 * Find the index and content of an existing summary block in the thread.
 *
 * 逆向: pm() (modules/1602_unknown_pm.js:20-31)
 * Scans backward through messages looking for role="info" (or role="user"
 * in Flitter's case) with a {type: "summary"} content block.
 */
function findSummaryBlock(
  messages: ThreadMessage[],
): { index: number; summaryText: string } | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (!Array.isArray(msg.content)) continue;
    for (const block of msg.content) {
      if (block.type === "summary" && block.summary?.type === "message") {
        return {
          index: i,
          summaryText: block.summary.summary,
        };
      }
    }
  }
  return null;
}
