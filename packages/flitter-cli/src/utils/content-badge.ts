// Content badge utility for conversation items.
//
// Inspects a ConversationItem and returns an array of short badge strings
// (e.g. "[image]", "[tool_use]", "[tool_result]") that can be rendered
// inline in the conversation list to give the user a quick visual indicator
// of what a message contains.

import type {
  ConversationItem,
  UserMessage,
  AssistantMessage,
  ToolCallItem,
  ContentBlock,
} from '../state/types';

/**
 * Return display badges for a conversation item based on its content.
 *
 * Badges are short bracketed labels that summarise the content types present:
 *   - `[image]`       — user message has image attachments
 *   - `[tool_use]`    — assistant message contains tool_use content blocks
 *   - `[tool_result]` — user message carries tool results
 *   - `[tool_call]`   — item is a tool call entry
 *   - `[thinking]`    — item is a thinking block
 *   - `[plan]`        — item is a plan item
 *   - `[system]`      — item is a system message
 *   - `[streaming]`   — assistant message is currently streaming
 *   - `[error]`       — tool call has failed status
 */
export function getContentBadges(item: ConversationItem): string[] {
  const badges: string[] = [];

  switch (item.type) {
    case 'user_message': {
      const userMsg = item as UserMessage;
      if (userMsg.images && userMsg.images.length > 0) {
        badges.push('[image]');
      }
      if (userMsg.toolResults && userMsg.toolResults.length > 0) {
        badges.push('[tool_result]');
      }
      break;
    }

    case 'assistant_message': {
      const assistantMsg = item as AssistantMessage;
      if (assistantMsg.isStreaming) {
        badges.push('[streaming]');
      }
      if (assistantMsg.contentBlocks) {
        const hasToolUse = assistantMsg.contentBlocks.some(
          (block: ContentBlock) => block.type === 'tool_use',
        );
        if (hasToolUse) {
          badges.push('[tool_use]');
        }
      }
      break;
    }

    case 'tool_call': {
      const toolCall = item as ToolCallItem;
      badges.push('[tool_call]');
      if (toolCall.status === 'failed') {
        badges.push('[error]');
      }
      break;
    }

    case 'thinking':
      badges.push('[thinking]');
      break;

    case 'plan':
      badges.push('[plan]');
      break;

    case 'system_message':
      badges.push('[system]');
      break;
  }

  return badges;
}
