/**
 * ContextAnalyzer — Token usage breakdown widget.
 *
 * Reads a thread snapshot, counts tokens per role (system, user, assistant,
 * tool_use, tool_result), and displays a text-based breakdown showing
 * role -> token count -> percentage, plus total vs model limit.
 *
 * 逆向: amp-cli-reversed/modules/2785_unknown_e0R.js:274-286 — context-analyze command
 *   `{ id: "context-analyze", noun: "context", verb: "analyze",
 *    description: "Analyze context token usage",
 *    execute: async R => { R.openContextAnalyze(); } }`
 *
 * 逆向: amp-cli-reversed/chunk-003.js:11586 — context analysis fetch
 *   amp fetches `/threads/{id}/context-analysis` from DTW (remote thread worker).
 *   In local mode, amp computes context analysis locally by counting tokens.
 *   We implement the local computation path.
 *
 * @module
 */

import type { Widget as WidgetInterface, BuildContext } from "@flitter/tui";
import { Column, SizedBox, StatelessWidget, Text } from "@flitter/tui";

// ─── Types ──────────────────────────────────────────────

/** A message in the thread for analysis. */
export interface AnalyzableMessage {
  role: string;
  content: unknown;
}

/** Token breakdown by role. */
export interface RoleTokenBreakdown {
  role: string;
  tokenCount: number;
  percentage: number;
}

/** Full context analysis result. */
export interface ContextAnalysis {
  breakdown: RoleTokenBreakdown[];
  totalTokens: number;
  modelLimit: number;
  usagePercentage: number;
}

/** Configuration for the ContextAnalyzer widget. */
export interface ContextAnalyzerConfig {
  /** Messages to analyze */
  messages: AnalyzableMessage[];
  /** Model's context window limit in tokens */
  modelLimit: number;
  /** Optional pre-computed token counts per role (if available) */
  tokenCounts?: Record<string, number>;
}

// ─── Token estimation ───────────────────────────────────

/**
 * Estimate token count for a content block.
 *
 * This is a rough heuristic (1 token ~= 4 characters for English text).
 * For accurate counts, use the model's tokenizer.
 *
 * 逆向: amp's local context analysis uses a similar heuristic when
 *   the tokenizer is not available. The DTW path uses server-side counting.
 */
export function estimateTokens(content: unknown): number {
  if (typeof content === "string") {
    return Math.ceil(content.length / 4);
  }
  if (Array.isArray(content)) {
    return content.reduce((sum: number, block: unknown) => {
      if (typeof block === "object" && block !== null) {
        const b = block as Record<string, unknown>;
        if (b.type === "text" && typeof b.text === "string") {
          return sum + Math.ceil(b.text.length / 4);
        }
        if (b.type === "tool_use") {
          const input = JSON.stringify(b.input ?? {});
          return sum + Math.ceil(((b.name as string)?.length ?? 0) / 4) + Math.ceil(input.length / 4);
        }
        if (b.type === "tool_result") {
          const resultContent = b.content;
          if (typeof resultContent === "string") {
            return sum + Math.ceil(resultContent.length / 4);
          }
          if (Array.isArray(resultContent)) {
            return sum + estimateTokens(resultContent);
          }
          return sum + 10; // fallback
        }
        if (b.type === "thinking" && typeof b.thinking === "string") {
          return sum + Math.ceil(b.thinking.length / 4);
        }
        // Other block types
        return sum + 10;
      }
      return sum;
    }, 0);
  }
  // Fallback for unknown content shapes
  const str = JSON.stringify(content);
  return Math.ceil(str.length / 4);
}

// ─── Analysis ───────────────────────────────────────────

/**
 * Analyze context token usage for a set of messages.
 *
 * Groups messages by role, estimates tokens, and computes percentages.
 *
 * @param messages - Thread messages to analyze
 * @param modelLimit - Context window size in tokens
 * @param tokenCounts - Optional pre-computed counts (override estimation)
 * @returns Full analysis with breakdown
 */
export function analyzeContext(
  messages: AnalyzableMessage[],
  modelLimit: number,
  tokenCounts?: Record<string, number>,
): ContextAnalysis {
  const roleCounts: Record<string, number> = {};

  if (tokenCounts) {
    // Use pre-computed counts
    Object.assign(roleCounts, tokenCounts);
  } else {
    // Estimate tokens per role
    for (const msg of messages) {
      const role = msg.role;
      const tokens = estimateTokens(msg.content);
      roleCounts[role] = (roleCounts[role] ?? 0) + tokens;
    }
  }

  const totalTokens = Object.values(roleCounts).reduce((a, b) => a + b, 0);

  const breakdown: RoleTokenBreakdown[] = Object.entries(roleCounts)
    .sort((a, b) => b[1] - a[1]) // Sort by count descending
    .map(([role, tokenCount]) => ({
      role,
      tokenCount,
      percentage: totalTokens > 0 ? (tokenCount / totalTokens) * 100 : 0,
    }));

  return {
    breakdown,
    totalTokens,
    modelLimit,
    usagePercentage: modelLimit > 0 ? (totalTokens / modelLimit) * 100 : 0,
  };
}

// ─── Formatting ─────────────────────────────────────────

/**
 * Format a context analysis as a text display string.
 *
 * 逆向: amp-cli-reversed/modules/2785_unknown_e0R.js:274-286
 *   amp displays context analysis as a breakdown table.
 *   We produce a simple text-based display.
 */
export function formatAnalysis(analysis: ContextAnalysis): string {
  const lines: string[] = [];

  lines.push("Context Token Usage");
  lines.push("═".repeat(40));

  // Role breakdown
  const maxRoleLen = Math.max(...analysis.breakdown.map((r) => r.role.length), 10);
  for (const entry of analysis.breakdown) {
    const role = entry.role.padEnd(maxRoleLen);
    const count = entry.tokenCount.toLocaleString().padStart(10);
    const pct = `${entry.percentage.toFixed(1)}%`.padStart(7);
    const bar = "█".repeat(Math.round(entry.percentage / 5));
    lines.push(`  ${role}  ${count}  ${pct}  ${bar}`);
  }

  lines.push("─".repeat(40));

  // Total
  const totalStr = analysis.totalTokens.toLocaleString();
  const limitStr = analysis.modelLimit.toLocaleString();
  const usagePct = analysis.usagePercentage.toFixed(1);
  lines.push(`  Total: ${totalStr} / ${limitStr} tokens (${usagePct}%)`);

  // Usage bar
  const barWidth = 30;
  const filled = Math.round((analysis.usagePercentage / 100) * barWidth);
  const empty = barWidth - filled;
  const usageBar = `[${"█".repeat(filled)}${"░".repeat(empty)}]`;
  lines.push(`  ${usageBar}`);

  // Warning levels
  if (analysis.usagePercentage > 90) {
    lines.push("  ⚠ CRITICAL: Context is nearly full!");
  } else if (analysis.usagePercentage > 75) {
    lines.push("  ⚠ WARNING: High context usage");
  }

  return lines.join("\n");
}

// ─── Widget ─────────────────────────────────────────────

/**
 * ContextAnalyzer widget — displays token usage breakdown.
 *
 * Simple StatelessWidget that renders the analysis as text.
 * Can be placed in a dialog/overlay or inline in the conversation.
 */
export class ContextAnalyzer extends StatelessWidget {
  readonly config: ContextAnalyzerConfig;

  constructor(config: ContextAnalyzerConfig) {
    super();
    this.config = config;
  }

  build(_context: BuildContext): WidgetInterface {
    const analysis = analyzeContext(
      this.config.messages,
      this.config.modelLimit,
      this.config.tokenCounts,
    );
    const text = formatAnalysis(analysis);

    return new Column({
      children: [
        new SizedBox({ height: 1 }),
        new Text({ data: text }),
        new SizedBox({ height: 1 }),
      ],
    });
  }
}
