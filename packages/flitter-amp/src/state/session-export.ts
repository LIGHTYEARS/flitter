// Session export -- serialize conversation to Markdown or plain text

import type { ToolCallItem } from '../acp/types';
import type { SessionFile } from './session-store';

/**
 * Export a session to Markdown format.
 * Includes metadata header, messages with role headings, tool calls with code
 * blocks, thinking in <details> tags, and plans as checklists.
 */
export function exportToMarkdown(session: SessionFile): string {
  const lines: string[] = [];
  const date = new Date(session.createdAt).toISOString().slice(0, 19).replace('T', ' ');
  lines.push(`# Session: ${session.sessionId}`);
  lines.push(`**Agent**: ${session.agentName ?? 'unknown'}`);
  lines.push(`**CWD**: ${session.cwd}`);
  lines.push(`**Date**: ${date}`);
  if (session.gitBranch) lines.push(`**Branch**: ${session.gitBranch}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const item of session.items) {
    switch (item.type) {
      case 'user_message':
        lines.push(`## User`);
        lines.push('');
        lines.push(item.text);
        lines.push('');
        break;

      case 'assistant_message':
        lines.push(`## Assistant`);
        lines.push('');
        lines.push(item.text);
        lines.push('');
        break;

      case 'thinking':
        lines.push(`<details><summary>Thinking</summary>`);
        lines.push('');
        lines.push(item.text);
        lines.push('');
        lines.push('</details>');
        lines.push('');
        break;

      case 'tool_call': {
        const tc = item as ToolCallItem;
        const status = tc.status === 'completed' ? 'done' : tc.status;
        lines.push(`### Tool: ${tc.title} [${status}]`);
        if (tc.locations?.length) {
          lines.push(`Files: ${tc.locations.map(l => l.path).join(', ')}`);
        }
        if (tc.result?.content) {
          lines.push('');
          lines.push('```');
          for (const block of tc.result.content) {
            if (block.content?.text) lines.push(block.content.text);
          }
          lines.push('```');
        }
        lines.push('');
        break;
      }

      case 'plan':
        lines.push('### Plan');
        for (const entry of item.entries) {
          const checkbox = entry.status === 'completed' ? '[x]' : '[ ]';
          lines.push(`- ${checkbox} ${entry.content}`);
        }
        lines.push('');
        break;
    }
  }

  if (session.usage) {
    lines.push('---');
    lines.push('');
    lines.push(`**Usage**: ${session.usage.used}/${session.usage.size} tokens`);
    if (session.usage.cost) {
      lines.push(`**Cost**: ${session.usage.cost.currency} ${session.usage.cost.amount.toFixed(4)}`);
    }
  }

  return lines.join('\n');
}

/**
 * Export a session to plain text (no formatting, minimal structure).
 */
export function exportToText(session: SessionFile): string {
  const lines: string[] = [];
  for (const item of session.items) {
    switch (item.type) {
      case 'user_message':
        lines.push(`> ${item.text}`);
        lines.push('');
        break;
      case 'assistant_message':
        lines.push(item.text);
        lines.push('');
        break;
      case 'tool_call': {
        const tc = item as ToolCallItem;
        lines.push(`[Tool: ${tc.title}]`);
        lines.push('');
        break;
      }
      default:
        break;
    }
  }
  return lines.join('\n');
}
