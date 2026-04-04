// Session export — convert persisted sessions to Markdown or plain text.
//
// Used for session sharing, archival, and external tool integration.
// Both formats include metadata headers, conversation messages,
// thinking blocks, tool calls, plan checklists, and usage stats.

import type { SessionFile } from './session-store';
import type { ConversationItem } from './types';

// ---------------------------------------------------------------------------
// Markdown Export
// ---------------------------------------------------------------------------

/**
 * Export a session to full Markdown with metadata header, user/assistant
 * messages, collapsible thinking blocks, tool call code blocks, plan
 * checklist, and usage statistics.
 */
export function exportToMarkdown(session: SessionFile): string {
  const lines: string[] = [];

  // --- Metadata Header ---
  lines.push('# Session Export');
  lines.push('');
  lines.push(`- **Session ID:** ${session.sessionId}`);
  lines.push(`- **Model:** ${session.model}`);
  lines.push(`- **Working Directory:** ${session.cwd}`);
  if (session.gitBranch) {
    lines.push(`- **Git Branch:** ${session.gitBranch}`);
  }
  if (session.currentMode) {
    lines.push(`- **Mode:** ${session.currentMode}`);
  }
  lines.push(`- **Created:** ${new Date(session.createdAt).toISOString()}`);
  lines.push(`- **Updated:** ${new Date(session.updatedAt).toISOString()}`);
  lines.push('');

  // --- Conversation ---
  lines.push('## Conversation');
  lines.push('');

  for (const item of session.items) {
    renderMarkdownItem(item, lines);
  }

  // --- Plan ---
  if (session.plan.length > 0) {
    lines.push('## Plan');
    lines.push('');
    for (const entry of session.plan) {
      const checkbox = entry.status === 'completed' ? '[x]' : '[ ]';
      const priority = entry.priority !== 'medium' ? ` (${entry.priority})` : '';
      lines.push(`- ${checkbox} ${entry.content}${priority}`);
    }
    lines.push('');
  }

  // --- Usage ---
  if (session.usage) {
    lines.push('## Usage');
    lines.push('');
    lines.push(`- **Context:** ${session.usage.used} / ${session.usage.size} tokens`);
    if (session.usage.inputTokens !== undefined) {
      lines.push(`- **Input Tokens:** ${session.usage.inputTokens}`);
    }
    if (session.usage.outputTokens !== undefined) {
      lines.push(`- **Output Tokens:** ${session.usage.outputTokens}`);
    }
    if (session.usage.cost) {
      lines.push(`- **Cost:** ${session.usage.cost.amount} ${session.usage.cost.currency}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Render a single conversation item as Markdown and push to lines array.
 */
function renderMarkdownItem(item: ConversationItem, lines: string[]): void {
  switch (item.type) {
    case 'user_message':
      lines.push('### 🧑 User');
      lines.push('');
      lines.push(item.text);
      lines.push('');
      break;

    case 'assistant_message':
      lines.push('### 🤖 Assistant');
      lines.push('');
      lines.push(item.text);
      lines.push('');
      break;

    case 'thinking':
      lines.push('<details>');
      lines.push('<summary>💭 Thinking</summary>');
      lines.push('');
      lines.push(item.text);
      lines.push('');
      lines.push('</details>');
      lines.push('');
      break;

    case 'tool_call':
      lines.push(`#### 🔧 Tool: ${item.title}`);
      lines.push('');
      if (item.rawInput) {
        lines.push('```json');
        lines.push(JSON.stringify(item.rawInput, null, 2));
        lines.push('```');
        lines.push('');
      }
      if (item.result?.rawOutput) {
        const output = typeof item.result.rawOutput === 'string'
          ? item.result.rawOutput
          : JSON.stringify(item.result.rawOutput, null, 2);
        lines.push('**Result:**');
        lines.push('');
        lines.push('```');
        lines.push(output);
        lines.push('```');
        lines.push('');
      }
      break;

    case 'system_message':
      lines.push(`> ℹ️ ${item.text}`);
      lines.push('');
      break;

    case 'plan':
      // Plan items rendered in their own section
      break;
  }
}

// ---------------------------------------------------------------------------
// Plain Text Export
// ---------------------------------------------------------------------------

/**
 * Export a session to simplified plain text format.
 * Strips all Markdown formatting for terminal or plain-text consumption.
 */
export function exportToText(session: SessionFile): string {
  const lines: string[] = [];

  // --- Header ---
  lines.push(`Session: ${session.sessionId}`);
  lines.push(`Model: ${session.model}`);
  lines.push(`CWD: ${session.cwd}`);
  if (session.gitBranch) {
    lines.push(`Branch: ${session.gitBranch}`);
  }
  lines.push(`Created: ${new Date(session.createdAt).toISOString()}`);
  lines.push(`Updated: ${new Date(session.updatedAt).toISOString()}`);
  lines.push('');
  lines.push('='.repeat(60));
  lines.push('');

  // --- Conversation ---
  for (const item of session.items) {
    renderTextItem(item, lines);
  }

  // --- Plan ---
  if (session.plan.length > 0) {
    lines.push('-'.repeat(40));
    lines.push('Plan:');
    for (const entry of session.plan) {
      const marker = entry.status === 'completed' ? '[x]' : '[ ]';
      lines.push(`  ${marker} ${entry.content}`);
    }
    lines.push('');
  }

  // --- Usage ---
  if (session.usage) {
    lines.push('-'.repeat(40));
    lines.push(`Usage: ${session.usage.used}/${session.usage.size} tokens`);
    if (session.usage.inputTokens !== undefined) {
      lines.push(`  Input:  ${session.usage.inputTokens}`);
    }
    if (session.usage.outputTokens !== undefined) {
      lines.push(`  Output: ${session.usage.outputTokens}`);
    }
    if (session.usage.cost) {
      lines.push(`  Cost:   ${session.usage.cost.amount} ${session.usage.cost.currency}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Render a single conversation item as plain text and push to lines array.
 */
function renderTextItem(item: ConversationItem, lines: string[]): void {
  switch (item.type) {
    case 'user_message':
      lines.push('[User]');
      lines.push(item.text);
      lines.push('');
      break;

    case 'assistant_message':
      lines.push('[Assistant]');
      lines.push(item.text);
      lines.push('');
      break;

    case 'thinking':
      lines.push('[Thinking]');
      lines.push(item.text);
      lines.push('');
      break;

    case 'tool_call':
      lines.push(`[Tool: ${item.title}] (${item.status})`);
      if (item.result?.rawOutput) {
        const output = typeof item.result.rawOutput === 'string'
          ? item.result.rawOutput
          : JSON.stringify(item.result.rawOutput);
        lines.push(output);
      }
      lines.push('');
      break;

    case 'system_message':
      lines.push(`[System] ${item.text}`);
      lines.push('');
      break;

    case 'plan':
      // Plan items rendered in their own section
      break;
  }
}
