/**
 * ContextAnalyzer widget — shows token usage breakdown for the current thread.
 *
 * 逆向: amp-cli-reversed/modules/1472_tui_components/jetbrains_wizard.js:2473-2501
 *   openContextAnalyzeModal() — creates k0R widget with deps:
 *     { configService, agentModeOverride, buildSystemPromptDeps } or dtwAnalyze
 *   The modal shows token budget breakdown:
 *     - System prompt tokens
 *     - Message history tokens
 *     - Tool definitions tokens
 *     - Available context window remaining
 *
 * 逆向: amp-cli-reversed/modules/1472_tui_components/jetbrains_wizard.js:5390-5415
 *   Build: k0R widget receives { deps, thread, dtwAnalyze, onDismiss }
 *
 * @module
 */

import type { BuildContext, Widget } from "@flitter/tui";
import { Column, Row, SizedBox, State, StatefulWidget, Text } from "@flitter/tui";

// ─── Types ───────────────────────────────────────────────

export interface TokenBreakdown {
  /** System prompt token count */
  systemPromptTokens: number;
  /** Message history token count */
  messageTokens: number;
  /** Tool definitions token count */
  toolDefinitionTokens: number;
  /** Other overhead (formatting, delimiters, etc.) */
  overheadTokens: number;
  /** Total tokens used */
  totalTokens: number;
  /** Maximum context window for the model */
  contextWindow: number;
  /** Maximum output tokens reserved */
  maxOutputTokens: number;
}

export interface ContextAnalyzerConfig {
  /** Token usage breakdown (null while loading) */
  breakdown: TokenBreakdown | null;
  /** Whether analysis is in progress */
  isLoading: boolean;
  /** Error from analysis, if any */
  error?: string;
  /** Model name being analyzed */
  modelName: string;
  /** Callback to dismiss the modal */
  onDismiss: () => void;
}

// ─── ContextAnalyzer ─────────────────────────────────────

/**
 * ContextAnalyzer — modal widget showing context window token usage.
 *
 * 逆向: k0R in amp — context analyze modal shows breakdown of token budget.
 *   Triggered via openContextAnalyzeModal() which builds system prompt deps
 *   and creates the modal widget.
 */
export class ContextAnalyzer extends StatefulWidget {
  readonly config: ContextAnalyzerConfig;

  constructor(config: ContextAnalyzerConfig) {
    super();
    this.config = config;
  }

  createState(): ContextAnalyzerState {
    return new ContextAnalyzerState();
  }
}

export class ContextAnalyzerState extends State<ContextAnalyzer> {
  build(_context: BuildContext): Widget {
    const { breakdown, isLoading, error, modelName, onDismiss } = this.widget.config;

    // Title
    const titleRow = new Row({
      children: [
        new Text({ data: `Context Analysis: ${modelName}` }),
      ],
    });

    if (error) {
      return new Column({
        children: [
          titleRow,
          new SizedBox({ height: 1 }),
          new Text({ data: `Error: ${error}` }),
          new SizedBox({ height: 1 }),
          new Text({ data: "Press Esc to dismiss" }),
        ],
      });
    }

    if (isLoading || !breakdown) {
      return new Column({
        children: [
          titleRow,
          new SizedBox({ height: 1 }),
          new Text({ data: "Analyzing context usage..." }),
        ],
      });
    }

    // Calculate derived values
    const availableInput = breakdown.contextWindow - breakdown.maxOutputTokens;
    const usedTokens = breakdown.totalTokens;
    const remainingTokens = Math.max(0, availableInput - usedTokens);
    const usagePercent = availableInput > 0
      ? Math.round((usedTokens / availableInput) * 100)
      : 0;

    // Build usage bar (simple text-based bar)
    const barWidth = 40;
    const filledWidth = Math.round((usagePercent / 100) * barWidth);
    const bar = "\u2588".repeat(filledWidth) + "\u2591".repeat(barWidth - filledWidth);

    // Format numbers with comma separators
    const fmt = (n: number) => n.toLocaleString();

    return new Column({
      children: [
        titleRow,
        new SizedBox({ height: 1 }),
        // Usage bar
        new Text({ data: `Usage: [${bar}] ${usagePercent}%` }),
        new SizedBox({ height: 1 }),
        // Breakdown table
        new Text({ data: "Token Breakdown:" }),
        new Text({ data: `  System Prompt:    ${fmt(breakdown.systemPromptTokens).padStart(10)}` }),
        new Text({ data: `  Messages:         ${fmt(breakdown.messageTokens).padStart(10)}` }),
        new Text({ data: `  Tool Definitions: ${fmt(breakdown.toolDefinitionTokens).padStart(10)}` }),
        new Text({ data: `  Overhead:         ${fmt(breakdown.overheadTokens).padStart(10)}` }),
        new Text({ data: `  ${"─".repeat(30)}` }),
        new Text({ data: `  Total Used:       ${fmt(usedTokens).padStart(10)}` }),
        new SizedBox({ height: 1 }),
        // Context window info
        new Text({ data: "Context Window:" }),
        new Text({ data: `  Max Context:      ${fmt(breakdown.contextWindow).padStart(10)}` }),
        new Text({ data: `  Reserved Output:  ${fmt(breakdown.maxOutputTokens).padStart(10)}` }),
        new Text({ data: `  Available Input:  ${fmt(availableInput).padStart(10)}` }),
        new Text({ data: `  Remaining:        ${fmt(remainingTokens).padStart(10)}` }),
        new SizedBox({ height: 1 }),
        // Warning if near capacity
        ...(usagePercent > 90
          ? [new Text({ data: "WARNING: Context window is nearly full. Consider compacting." })]
          : []),
        new Text({ data: "Press Esc to dismiss" }),
      ],
    });
  }
}
