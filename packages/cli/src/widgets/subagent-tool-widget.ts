/**
 * SubagentToolWidget — main widget for rendering subagent content with 3-priority strategy.
 *
 * Renders nested agent (subagent) tool calls and their results/progress inside
 * the conversation view. Uses ExpandableToolHeader for the collapsible wrapper,
 * with the body content determined by a 3-priority rendering strategy:
 *
 * Priority 1: hasTerminalMessage(content) → render all tools + final assistant text/thinking
 * Priority 2: progressChunks exist → render progress messages, reasoning, and tool_uses
 * Priority 3: tools exist → fallback: render tools list
 *
 * 逆向: D9R class (misc_utils.js:7630-7749) — StatefulWidget with _thinkingBlockStates
 * 逆向: shT class (misc_utils.js:7653-7749) — D9R.build() is the shT rendering logic
 * 逆向: gB function (modules/1935_unknown_gB.js) — renders tools + terminal message
 * 逆向: C9R function (chunk-005.js:2128) — checks hasTerminalMessage
 * 逆向: H50 function (chunk-005.js:2166) — deduplicates progress message vs outputResult
 *
 * The widget renders nested tool calls as simple summary rows (icon + name + detail),
 * not full tool widgets — this avoids infinite recursion and matches amp's compact
 * rendering style for nested subagent tools.
 *
 * @module subagent-tool-widget
 */

import type { BuildContext, Widget } from "@flitter/tui";
import {
  Color,
  Column,
  Container,
  EdgeInsets,
  RichText,
  Row,
  SizedBox,
  State,
  StatefulWidget,
  TextSpan,
  TextStyle,
} from "@flitter/tui";
import { ExpandableToolHeader, type ToolStatus } from "./expandable-tool-header.js";
import type { SubagentContent, SubagentTool } from "./subagent-content.js";
import { hasTerminalMessage } from "./subagent-content.js";

// ════════════════════════════════════════════════════
//  Types
// ════════════════════════════════════════════════════

/**
 * Configuration for SubagentToolWidget.
 *
 * 逆向: D9R.build() destructuring — { toolRun, name, inputPrompt, outputResult, hideHeader, subagentContent }
 */
export interface SubagentToolWidgetConfig {
  /** Display name for the tool (e.g., "Subagent", "Oracle"). */
  toolName: string;

  /** Current execution status. */
  status: ToolStatus;

  /** Task description / input prompt text. 逆向: D9R inputPrompt */
  description?: string;

  /** Output result text (shown when status is done/in-progress). 逆向: D9R outputResult */
  outputResult?: string;

  /** Error message (shown when status is error/cancelled). */
  error?: string;

  /** Subagent content with nested tools, progress, and terminal message. */
  subagentContent?: SubagentContent;

  /** When true, omit the ExpandableToolHeader and return just the body. 逆向: D9R hideHeader */
  hideHeader?: boolean;
}

// ════════════════════════════════════════════════════
//  Color constants
// ════════════════════════════════════════════════════

/** Muted foreground for secondary text. 逆向: R.colors.mutedForeground */
const MUTED_COLOR = Color.default();

/** Tool status icon colors */
const TOOL_SUCCESS_COLOR = Color.indexed(2); // green
const TOOL_ERROR_COLOR = Color.indexed(1); // red
const TOOL_RUNNING_COLOR = Color.indexed(3); // yellow

// ════════════════════════════════════════════════════
//  SubagentToolWidget
// ════════════════════════════════════════════════════

/**
 * SubagentToolWidget — renders a subagent tool run with 3-priority content.
 *
 * StatefulWidget because it manages thinking-block expansion state internally.
 *
 * 逆向: D9R extends wR (StatefulWidget) — misc_utils.js:7630
 */
export class SubagentToolWidget extends StatefulWidget {
  readonly config: SubagentToolWidgetConfig;

  constructor(config: SubagentToolWidgetConfig) {
    super();
    this.config = config;
  }

  createState(): SubagentToolWidgetState {
    return new SubagentToolWidgetState();
  }
}

// ════════════════════════════════════════════════════
//  SubagentToolWidgetState
// ════════════════════════════════════════════════════

/**
 * State for SubagentToolWidget.
 *
 * 逆向: D9R state (misc_utils.js:7631-7652) — manages _thinkingBlockStates map
 *
 * For this initial implementation, thinking-block toggle state is deferred
 * (we render thinking blocks as plain text). The structure is preserved for
 * future extension.
 */
export class SubagentToolWidgetState extends State<SubagentToolWidget> {
  /**
   * Build the widget tree.
   *
   * 逆向: D9R.build (misc_utils.js:7653-7749) — 3-priority rendering:
   *   1. C9R(h) [hasTerminalMessage] → gB(h) [render tools + terminal message]
   *   2. progress exists → iterate progress chunks with messages/reasoning/tool_uses
   *   3. h.tools.length > 0 → gB(h) [fallback render tools]
   *
   * Layout:
   *   if (!hideHeader): Column([ExpandableToolHeader(title, status), body])
   *   if (hideHeader): just body
   *   body = Container(padding: horizontal 2, Column(bodyChildren))
   */
  build(_context: BuildContext): Widget {
    const { toolName, status, description, outputResult, error, subagentContent, hideHeader } =
      this.widget.config;

    const content: SubagentContent = subagentContent ?? { tools: [] };

    // ── Build body children ──
    // 逆向: D9R.build lines 7668-7737
    const bodyChildren: Widget[] = [];

    // Input prompt / description
    // 逆向: if (e) s.push(new Z3({ markdown: e }))
    if (description && description.trim().length > 0) {
      bodyChildren.push(_makeTextWidget(description));
    }

    // 3-priority rendering logic
    // 逆向: o = h !== void 0 && C9R(h)
    const hasTerminal = subagentContent !== undefined && hasTerminalMessage(content);

    if (hasTerminal) {
      // Priority 1: Terminal message exists → render all tools + terminal message
      // 逆向: if (o) s.push(...gB(h ?? { tools: [] }))
      this._renderFullContent(content, bodyChildren);
    } else if (this._hasProgress(content)) {
      // Priority 2: Progress chunks exist → render progressively
      // 逆向: else if (l) { ... iterate progress chunks ... }
      this._renderProgressChunks(content, bodyChildren);
    } else if (content.tools.length > 0 || content.terminalAssistantMessage !== undefined) {
      // Priority 3: Fallback — render tools list
      // 逆向: else if (h && (h.tools.length > 0 || h.terminalAssistantMessage !== void 0)) s.push(...gB(h))
      this._renderFullContent(content, bodyChildren);
    }

    // Output result (shown unless terminal message already provided it)
    // 逆向: if (t && !o) s.push(new Z3({ markdown: t }))
    if (outputResult && outputResult.trim().length > 0 && !hasTerminal) {
      bodyChildren.push(_makeTextWidget(outputResult));
    }

    // Error message
    if (error && error.trim().length > 0) {
      bodyChildren.push(_makeErrorWidget(error));
    }

    // ── Assemble body ──
    // 逆向: n = new uR({ padding: new TR(2, 0, 2, 0), child: new Jb({ children: s }) })
    const bodyWidget = new Container({
      padding: EdgeInsets.symmetric({ horizontal: 2 }),
      child: new Column({
        crossAxisAlignment: "start",
        mainAxisSize: "min",
        children: bodyChildren,
      }) as unknown as Widget,
    }) as unknown as Widget;

    // ── Header wrapping ──
    // 逆向: if (c) return new xR({ crossAxisAlignment: "start", children: [c, n] }); return n;
    if (hideHeader) {
      return bodyWidget;
    }

    return new ExpandableToolHeader({
      title: toolName,
      status,
      child: bodyWidget,
    }) as unknown as Widget;
  }

  // ────────────────────────────────────────────────
  //  Priority 1 & 3: render all tools + terminal message
  //  逆向: gB function (modules/1935_unknown_gB.js)
  // ────────────────────────────────────────────────

  /**
   * Render all tools as nested rows, then render terminal assistant message
   * text/thinking blocks.
   *
   * 逆向: gB(T) — iterates T.tools as Bs widgets, then renders terminalAssistantMessage
   */
  private _renderFullContent(content: SubagentContent, children: Widget[]): void {
    // Render each tool as a nested row
    for (const tool of content.tools) {
      children.push(this._buildNestedToolRow(tool));
    }

    // Render terminal assistant message if present
    // 逆向: gB lines 12-42 — iterate content blocks, accumulate text, push thinking
    if (!content.terminalAssistantMessage) return;

    const msg = content.terminalAssistantMessage;
    let textBuffer = "";

    const flushText = (): void => {
      if (textBuffer.trim().length === 0) {
        textBuffer = "";
        return;
      }
      children.push(_makeTextWidget(textBuffer));
      textBuffer = "";
    };

    for (const block of msg.content) {
      if (block.type === "text") {
        textBuffer += block.text;
      } else if (block.type === "thinking") {
        // 逆向: gB line 36 — flush text, push thinking block
        flushText();
        // Render thinking as dimmed text for now (full ThinkingBlock widget deferred)
        children.push(_makeThinkingWidget(block.thinking));
      }
    }

    flushText();
  }

  // ────────────────────────────────────────────────
  //  Priority 2: render progress chunks
  //  逆向: D9R.build lines 7677-7733 — iterate progress entries
  // ────────────────────────────────────────────────

  /**
   * Check if content has usable progress data.
   * 逆向: l = (status matches) && A.progress
   */
  private _hasProgress(content: SubagentContent): boolean {
    return Array.isArray(content.progressChunks) && content.progressChunks.length > 0;
  }

  /**
   * Render progress chunks: messages, reasoning blocks, and tool_uses.
   *
   * 逆向: D9R.build lines 7683-7733 — iterate progress entries with message/reasoning/tool_uses
   */
  private _renderProgressChunks(content: SubagentContent, children: Widget[]): void {
    const chunks = content.progressChunks ?? [];
    const tools = content.tools;
    let toolIndex = 0;

    for (const chunk of chunks) {
      // Progress message
      // 逆向: if (P?.message?.trim().length && !H50(P.message, _)) s.push(...)
      if (chunk.message && chunk.message.trim().length > 0) {
        // H50 check: skip if message matches outputResult
        if (!_isDuplicate(chunk.message, this.widget.config.outputResult)) {
          children.push(_makeTextWidget(chunk.message));
        }
      }

      // Reasoning block
      // 逆向: if (P?.reasoning) { ... s.push(v), m++ }
      if (chunk.reasoning) {
        children.push(_makeThinkingWidget(chunk.reasoning));
      }

      // Tool uses in this chunk
      // 逆向: let k = P?.tool_uses ?? []; if (Array.isArray(k) && k.length > 0) ...
      const toolUses = chunk.tool_uses ?? [];
      if (Array.isArray(toolUses) && toolUses.length > 0) {
        for (const entry of toolUses) {
          // Try to use the pre-built SubagentTool from content.tools
          // 逆向: let f = i[y]; if (f) { s.push(new Bs({...})), y++; continue; }
          const existingTool = tools[toolIndex];
          if (existingTool) {
            children.push(this._buildNestedToolRow(existingTool));
            toolIndex++;
            continue;
          }

          // Fallback: render from progress entry directly
          children.push(
            _buildProgressToolRow(
              entry.normalized_name ?? entry.tool_name ?? "unknown",
              entry.input,
              entry.status,
            ),
          );
        }
      }
    }

    // Render remaining tools not covered by progress chunks
    // 逆向: for (; y < i.length; y++) { ... s.push(new Bs({...})) }
    for (; toolIndex < tools.length; toolIndex++) {
      const tool = tools[toolIndex];
      if (tool) {
        children.push(this._buildNestedToolRow(tool));
      }
    }
  }

  // ────────────────────────────────────────────────
  //  Nested tool row builder
  //  逆向: Bs.buildToolWidget — renders a tool as a compact summary row
  // ────────────────────────────────────────────────

  /**
   * Build a single nested tool row: `  {icon} {name} {detail}`
   *
   * 逆向: Bs (chunk-006.js:29060) — builds tool widget based on tool name/status.
   * For nested subagent rendering, we use a compact single-line representation.
   */
  private _buildNestedToolRow(tool: SubagentTool): Widget {
    const name = tool.toolUse.name;
    const status = tool.toolRun.status;
    const detail = _extractToolDetail(tool.toolUse);

    const iconColor = _statusIconColor(status);
    const icon = _statusIcon(status);

    const spans: TextSpan[] = [
      new TextSpan({
        text: `${icon} `,
        style: new TextStyle({ foreground: iconColor }),
      }),
      new TextSpan({
        text: name,
        style: new TextStyle({ foreground: Color.default() }),
      }),
    ];

    if (detail) {
      spans.push(
        new TextSpan({
          text: ` ${detail}`,
          style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
        }),
      );
    }

    return new Row({
      mainAxisSize: "min",
      children: [
        new SizedBox({ width: 2 }) as unknown as Widget,
        new RichText({
          text: new TextSpan({ children: spans }),
        }) as unknown as Widget,
      ],
    }) as unknown as Widget;
  }
}

// ════════════════════════════════════════════════════
//  Helper functions
// ════════════════════════════════════════════════════

/**
 * Create a plain text widget for body content.
 * 逆向: Z3({ markdown: content }) — until MarkdownText is available, use RichText
 */
function _makeTextWidget(text: string): Widget {
  return new RichText({
    text: new TextSpan({
      text,
      style: new TextStyle({ foreground: Color.default() }),
    }),
  }) as unknown as Widget;
}

/**
 * Create a red-tinted text widget for error messages.
 */
function _makeErrorWidget(text: string): Widget {
  return new RichText({
    text: new TextSpan({
      text,
      style: new TextStyle({ foreground: Color.indexed(1) }), // red
    }),
  }) as unknown as Widget;
}

/**
 * Create a dimmed text widget for thinking blocks.
 * 逆向: Rd (ThinkingBlock widget) — deferred; for now render as dimmed text.
 */
function _makeThinkingWidget(thinking: string): Widget {
  return new RichText({
    text: new TextSpan({
      text: `💭 ${thinking}`,
      style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
    }),
  }) as unknown as Widget;
}

/**
 * Build a compact tool row from progress entry data (when no pre-built SubagentTool exists).
 * 逆向: fallback path in D9R.build — builds Bs from progress entry fields
 */
function _buildProgressToolRow(name: string, input: unknown, status?: string): Widget {
  const resolvedStatus = (status as SubagentTool["toolRun"]["status"]) ?? "in-progress";
  const iconColor = _statusIconColor(resolvedStatus);
  const icon = _statusIcon(resolvedStatus);

  const normalizedInput =
    typeof input === "object" && input !== null && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const detail = _extractDetailFromInput(name, normalizedInput);

  const spans: TextSpan[] = [
    new TextSpan({
      text: `${icon} `,
      style: new TextStyle({ foreground: iconColor }),
    }),
    new TextSpan({
      text: name,
      style: new TextStyle({ foreground: Color.default() }),
    }),
  ];

  if (detail) {
    spans.push(
      new TextSpan({
        text: ` ${detail}`,
        style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
      }),
    );
  }

  return new Row({
    mainAxisSize: "min",
    children: [
      new SizedBox({ width: 2 }) as unknown as Widget,
      new RichText({
        text: new TextSpan({ children: spans }),
      }) as unknown as Widget,
    ],
  }) as unknown as Widget;
}

/**
 * Extract a human-readable detail string from a tool_use's input.
 *
 * 逆向: various tool-specific detail extraction in amp's tool widgets:
 *   - Bash → command (truncated)
 *   - Read/Edit/Write → file_path
 *   - Grep → pattern
 *   - fallback → path or query field
 */
function _extractToolDetail(toolUse: SubagentTool["toolUse"]): string | undefined {
  return _extractDetailFromInput(toolUse.name, toolUse.input);
}

/**
 * Extract detail from tool name + input record.
 */
function _extractDetailFromInput(name: string, input: Record<string, unknown>): string | undefined {
  switch (name) {
    case "Bash":
    case "shell_command": {
      const cmd = input.command;
      if (typeof cmd === "string") {
        return cmd.length > 40 ? cmd.slice(0, 40) + "…" : cmd;
      }
      return undefined;
    }
    case "Read":
    case "Edit":
    case "Write":
    case "edit_file":
    case "create_file": {
      const path = input.file_path ?? input.path;
      return typeof path === "string" ? path : undefined;
    }
    case "Grep":
    case "grep":
    case "search": {
      const pattern = input.pattern;
      return typeof pattern === "string" ? pattern : undefined;
    }
    case "Glob":
    case "glob": {
      const pattern = input.pattern ?? input.glob;
      return typeof pattern === "string" ? pattern : undefined;
    }
    default: {
      // Fallback: try path, query, url, file_path
      const fallback = input.path ?? input.query ?? input.url ?? input.file_path;
      return typeof fallback === "string" ? fallback : undefined;
    }
  }
}

/**
 * Map tool run status to a Unicode icon character.
 * 逆向: xW function — done → ✓, error/cancelled → ✕, in-progress/queued → ⋯
 */
function _statusIcon(status: string): string {
  switch (status) {
    case "done":
      return "✓"; // ✓
    case "error":
    case "cancelled":
    case "rejected-by-user":
      return "✕"; // ✕
    default:
      return "⋯"; // ⋯
  }
}

/**
 * Map tool run status to a color.
 * 逆向: qr function — done → green, error → red, in-progress → yellow
 */
function _statusIconColor(status: string): Color {
  switch (status) {
    case "done":
      return TOOL_SUCCESS_COLOR;
    case "error":
    case "cancelled":
    case "rejected-by-user":
      return TOOL_ERROR_COLOR;
    case "in-progress":
    case "queued":
      return TOOL_RUNNING_COLOR;
    default:
      return MUTED_COLOR;
  }
}

/**
 * Check if a progress message is a duplicate of the output result.
 * 逆向: H50(T, R) — returns true if both exist and trim() equals
 */
function _isDuplicate(message: string | undefined, outputResult: string | undefined): boolean {
  if (!message || !outputResult) return false;
  return message.trim() === outputResult.trim();
}
