// ChatView — StatefulWidget that renders the conversation turn list and
// dispatches to the correct screen (welcome, empty, loading, processing,
// error, ready) based on AppState.screenState.
//
// Owns the AppState listener lifecycle: registers in initState(), removes
// in dispose(). Calls setState() on AppState change to trigger rebuild.
//
// Turn rendering uses the Phase 14 turn model (UserTurn, AssistantTurn).
// Tool calls use ToolCallWidget dispatch (Phase 18). Phase 19 specialized
// renderers are wired: StreamingCursor, ThinkingBlock, PlanView, Markdown,
// and DiffCard replace the original placeholder renderers.

import {
  StatefulWidget,
  State,
  Widget,
  type BuildContext,
} from '../../../flitter-core/src/framework/widget';
import { Column } from '../../../flitter-core/src/widgets/flex';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { Color } from '../../../flitter-core/src/core/color';
import { Padding } from '../../../flitter-core/src/widgets/padding';
import { EdgeInsets } from '../../../flitter-core/src/layout/edge-insets';
import { SizedBox } from '../../../flitter-core/src/widgets/sized-box';
import { Container } from '../../../flitter-core/src/widgets/container';
import { Border, BorderSide, BoxDecoration } from '../../../flitter-core/src/layout/render-decorated';
import { StickyHeader } from '../../../flitter-core/src/widgets/sticky-header';
import { Center } from '../../../flitter-core/src/widgets/center';
import type { AppState } from '../state/app-state';
import type { UserTurn, AssistantTurn } from '../state/turn-types';
import type { ScreenState, ErrorScreen } from '../state/screen-state';
import type { ToolCallItem } from '../state/types';
import { ToolCallWidget } from './tool-call/tool-call-widget';
import { PlanView } from './plan-view';
import { StreamingCursor } from './streaming-cursor';
import { ThinkingBlock } from './thinking-block';
import { resolveToolName, TOOL_NAME_MAP } from './tool-call/resolve-tool-name';
import { WelcomeScreen } from './welcome-screen';
import { ActivityGroup, type ActivityAction } from './activity-group';

// ---------------------------------------------------------------------------
// ChatView — StatefulWidget
// ---------------------------------------------------------------------------

/**
 * ChatView is the primary conversation rendering widget for flitter-cli.
 *
 * Reads appState.screenState to dispatch to the appropriate sub-builder:
 *   welcome    -> buildWelcomeScreen()
 *   empty      -> buildEmptyScreen()
 *   loading    -> buildLoadingScreen()
 *   processing -> buildConversationView()
 *   error      -> buildErrorScreen()
 *   ready      -> buildConversationView()
 *
 * Registers an AppState listener in initState() and removes it in dispose().
 */
export class ChatView extends StatefulWidget {
  readonly appState: AppState;

  constructor(opts: { appState: AppState }) {
    super();
    this.appState = opts.appState;
  }

  createState(): ChatViewState {
    return new ChatViewState();
  }
}

// ---------------------------------------------------------------------------
// ChatViewState — State<ChatView>
// ---------------------------------------------------------------------------

/**
 * Mutable state for ChatView.
 *
 * Manages the AppState listener lifecycle and dispatches build() to the
 * appropriate screen builder based on screenState.kind.
 */
export class ChatViewState extends State<ChatView> {
  /** Bound listener function for add/removeListener symmetry. */
  private _onChange: (() => void) | null = null;

  /** When true, tool calls render as single-line compact status items. */
  private _denseView = false;
  get denseView(): boolean { return this._denseView; }
  set denseView(v: boolean) { this._denseView = v; }

  /** Register AppState listener on mount. */
  initState(): void {
    this._onChange = () => {
      this.setState();
    };
    this.widget.appState.addListener(this._onChange);
  }

  /** Remove AppState listener on unmount to prevent leaks. */
  dispose(): void {
    if (this._onChange) {
      this.widget.appState.removeListener(this._onChange);
      this._onChange = null;
    }
    super.dispose();
  }

  /**
   * Build the widget tree based on the current screen state.
   *
   * Processing and ready both render the conversation view — the difference
   * is in turn-level streaming indicators already encoded in
   * AssistantTurn.isStreaming.
   */
  build(_context: BuildContext): Widget {
    const screenState: ScreenState = this.widget.appState.screenState;

    switch (screenState.kind) {
      case 'welcome':
        return new WelcomeScreen({ appState: this.widget.appState });
      case 'empty':
        return buildEmptyScreen();
      case 'loading':
        return buildLoadingScreen();
      case 'processing':
        return buildConversationView(this.widget.appState, this._denseView);
      case 'error':
        return buildErrorScreen(screenState);
      case 'ready':
        return buildConversationView(this.widget.appState, this._denseView);
    }
  }
}

// ---------------------------------------------------------------------------
// Conversation View — renders the turn list
// ---------------------------------------------------------------------------

/**
 * Build the conversation view as a Column of turn widgets with inter-turn
 * spacers. Uses mainAxisSize:'min' (content-sized, critical for scroll)
 * and crossAxisAlignment:'stretch' (fills width).
 */
function buildConversationView(appState: AppState, denseView: boolean = false): Widget {
  const turns = appState.turns;
  const children: Widget[] = [];

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];

    // Inter-turn spacer (between turns, not before the first)
    if (i > 0) {
      children.push(new SizedBox({ height: 1 }));
    }

    if (turn.kind === 'user') {
      children.push(buildUserTurnWidget(turn, appState));
    } else {
      children.push(buildAssistantTurnWidget(turn, denseView));
    }
  }

  return new Column({
    mainAxisSize: 'min',
    crossAxisAlignment: 'stretch',
    children,
  });
}

// ---------------------------------------------------------------------------
// UserTurnWidget — renders a user message with Amp-style left border
// ---------------------------------------------------------------------------

/**
 * Render a user turn with a colored left border and italic text.
 *
 * Border colors:
 *   - green: normal message
 *   - yellow: interrupted (user cancelled mid-response)
 *   - bright cyan: selected (Tab/Shift+Tab navigation)
 *
 * Image attachment count displayed if present.
 */
function buildUserTurnWidget(turn: UserTurn, appState: AppState): Widget {
  const msg = turn.message;
  const isSelected = appState.selectedMessageIndex === turn.itemIndex;
  const isInterrupted = msg.interrupted === true;

  // Border color: selected > interrupted > normal
  const borderColor = isSelected
    ? Color.brightCyan
    : isInterrupted
      ? Color.yellow
      : Color.green;

  // Text color matches border (except selected uses green text)
  const textColor = isInterrupted ? Color.yellow : Color.green;

  const contentChildren: Widget[] = [
    new Text({
      text: new TextSpan({
        text: msg.text,
        style: new TextStyle({
          foreground: textColor,
          italic: true,
          bold: isSelected ? true : undefined,
        }),
      }),
    }),
  ];

  // Show image attachment count if present
  if (msg.images && msg.images.length > 0) {
    const filenames = msg.images.map(img => img.filename).join(', ');
    contentChildren.push(
      new Text({
        text: new TextSpan({
          text: `[${msg.images.length} image${msg.images.length > 1 ? 's' : ''}: ${filenames}]`,
          style: new TextStyle({
            foreground: Color.brightBlack,
            dim: true,
          }),
        }),
      }),
    );
  }

  const child = contentChildren.length === 1
    ? contentChildren[0]
    : new Column({
        mainAxisSize: 'min',
        crossAxisAlignment: 'stretch',
        children: contentChildren,
      });

  return new Container({
    decoration: new BoxDecoration({
      border: new Border({
        left: new BorderSide({
          color: borderColor,
          width: isSelected ? 3 : 2,
          style: 'solid',
        }),
      }),
    }),
    padding: EdgeInsets.only({ left: 1 }),
    child,
  });
}

// ---------------------------------------------------------------------------
// AssistantTurnWidget — wraps children in a StickyHeader
// ---------------------------------------------------------------------------

/**
 * Render an assistant turn as a StickyHeader with an empty header.
 *
 * Body is a Column of child widgets rendered from AssistantTurn fields:
 *   - ThinkingItem placeholders (dim "[thinking...]")
 *   - AssistantMessage rendered via StreamingCursor (Markdown + blinking cursor)
 *   - ToolCallWidget dispatch (real tool rendering — Phase 18)
 *   - PlanView checklist with status icons and priority tags (Phase 19)
 *   - SystemMessage separators (horizontal rule + dim italic text)
 */
function buildAssistantTurnWidget(turn: AssistantTurn, denseView: boolean = false): Widget {
  const header = SizedBox.shrink();
  const bodyChildren: Widget[] = [];

  // Thinking items — ThinkingBlock with collapsible content and BrailleSpinner
  for (const thinking of turn.thinkingItems) {
    bodyChildren.push(
      new ThinkingBlock({ item: thinking }),
    );
  }

  // Assistant message text — rendered via StreamingCursor (Markdown + blinking cursor)
  if (turn.message) {
    bodyChildren.push(
      new StreamingCursor({
        text: turn.message.text || '',
        isStreaming: turn.message.isStreaming,
      }),
    );
  }

  // Tool call widgets — nested tool-tree rendering (Plan 18-04)
  // Partition tool calls into root-level (no parentToolCallId) and children
  // (has parentToolCallId). Build a parent->children map, then render
  // root tool calls with their children passed as childWidgets.
  const childMap = new Map<string, ToolCallItem[]>();
  const rootToolCalls: ToolCallItem[] = [];
  for (const tc of turn.toolCalls) {
    if (tc.parentToolCallId) {
      const siblings = childMap.get(tc.parentToolCallId) ?? [];
      siblings.push(tc);
      childMap.set(tc.parentToolCallId, siblings);
    } else {
      rootToolCalls.push(tc);
    }
  }

  // Orphan check: child tool calls whose parent is not in this turn
  // render as root-level entries (defensive fallback, prevents invisible tools)
  for (const [parentId, children] of childMap) {
    const parentExists = rootToolCalls.some(tc => tc.toolCallId === parentId);
    if (!parentExists) {
      rootToolCalls.push(...children);
      childMap.delete(parentId);
    }
  }

  for (const toolCall of rootToolCalls) {
    const children = childMap.get(toolCall.toolCallId);

    // Detect subagent/Task tool calls — render as ActivityGroup (ACTV-01..05)
    if (isSubagentToolCall(toolCall)) {
      // Extract description from rawInput matching AMP
      const raw = toolCall.rawInput;
      const description = raw
        ? String(raw['Description'] || raw['description'] || raw['Prompt'] || raw['prompt'] || '')
        : '';

      const actions = buildActivityActions(toolCall, children ?? [], description);
      const summary = computeActivitySummary(children ?? []);
      const hasInProgress = (children ?? []).some(
        c => c.status === 'in_progress' || c.status === 'pending',
      ) || toolCall.status === 'in_progress';

      bodyChildren.push(
        new ActivityGroup({
          actions,
          summary,
          hasInProgress,
          displayName: 'Subagent',
          description: description.slice(0, 80),
        }),
      );
    } else {
      // Non-subagent root tool call — render with ToolCallWidget as before
      const childWidgets = children?.map(child =>
        new ToolCallWidget({ toolCall: child, isExpanded: !child.collapsed }),
      );
      bodyChildren.push(
        new ToolCallWidget({
          toolCall,
          isExpanded: !toolCall.collapsed,
          childWidgets,
        }),
      );
    }
  }

  // Plan items — PlanView checklist with status icons and priority tags
  for (const plan of turn.planItems) {
    bodyChildren.push(
      new PlanView({ entries: plan.entries }),
    );
  }

  // System messages
  for (const sysMsg of turn.systemMessages) {
    bodyChildren.push(buildSystemMessage(sysMsg.text));
  }

  // If no children at all, render an empty placeholder
  if (bodyChildren.length === 0) {
    bodyChildren.push(SizedBox.shrink());
  }

  const body = bodyChildren.length === 1
    ? bodyChildren[0]
    : new Column({
        mainAxisSize: 'min',
        crossAxisAlignment: 'stretch',
        children: bodyChildren,
      });

  return new StickyHeader({ header, body });
}

// ---------------------------------------------------------------------------
// System Message — horizontal rule + dim italic text
// ---------------------------------------------------------------------------

/**
 * Render a system message as a horizontal rule separator with dim italic text.
 */
function buildSystemMessage(text: string): Widget {
  return new Column({
    mainAxisSize: 'min',
    crossAxisAlignment: 'stretch',
    children: [
      new Text({
        text: new TextSpan({
          text: '\u2500'.repeat(40),
          style: new TextStyle({ foreground: Color.brightBlack, dim: true }),
        }),
      }),
      new Padding({
        padding: EdgeInsets.symmetric({ horizontal: 1 }),
        child: new Text({
          text: new TextSpan({
            text,
            style: new TextStyle({
              foreground: Color.brightBlack,
              dim: true,
              italic: true,
            }),
          }),
        }),
      }),
      new Text({
        text: new TextSpan({
          text: '\u2500'.repeat(40),
          style: new TextStyle({ foreground: Color.brightBlack, dim: true }),
        }),
      }),
    ],
  });
}

// ---------------------------------------------------------------------------
// Screen Placeholders — empty, loading, error
// ---------------------------------------------------------------------------

/**
 * Empty screen — new thread after previous conversation.
 * Center with "New conversation" text and prompt hint.
 */
function buildEmptyScreen(): Widget {
  return new Center({
    child: new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'center',
      children: [
        new Text({
          text: new TextSpan({
            text: 'New conversation',
            style: new TextStyle({
              foreground: Color.brightBlack,
              dim: true,
            }),
          }),
        }),
        new SizedBox({ height: 1 }),
        new Text({
          text: new TextSpan({
            text: 'Type a message to begin',
            style: new TextStyle({
              foreground: Color.brightBlack,
              dim: true,
            }),
          }),
        }),
      ],
    }),
  });
}

/**
 * Loading screen — first prompt submitted, waiting for stream to start.
 * Center with "Thinking..." text.
 */
function buildLoadingScreen(): Widget {
  return new Center({
    child: new Text({
      text: new TextSpan({
        text: 'Thinking...',
        style: new TextStyle({
          foreground: Color.brightBlack,
          dim: true,
        }),
      }),
    }),
  });
}

/**
 * Error screen — session entered error state.
 * Center with error message (red bold), error kind, and recovery hint.
 */
function buildErrorScreen(screen: ErrorScreen): Widget {
  const err = screen.error;
  return new Center({
    child: new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'center',
      children: [
        new Text({
          text: new TextSpan({
            text: `Error: ${err.message}`,
            style: new TextStyle({
              foreground: Color.red,
              bold: true,
            }),
          }),
        }),
        ...(err.code
          ? [
              new SizedBox({ height: 1 }),
              new Text({
                text: new TextSpan({
                  text: `Code: ${err.code}`,
                  style: new TextStyle({
                    foreground: Color.brightBlack,
                    dim: true,
                  }),
                }),
              }),
            ]
          : []),
        new SizedBox({ height: 1 }),
        new Text({
          text: new TextSpan({
            text: err.retryable
              ? 'Press Enter to retry, or Ctrl+C to exit'
              : 'Press Ctrl+C to exit',
            style: new TextStyle({
              foreground: Color.yellow,
              dim: true,
            }),
          }),
        }),
      ],
    }),
  });
}

// ---------------------------------------------------------------------------
// ActivityGroup Helpers — detect subagent tools, build actions, compute summary
// ---------------------------------------------------------------------------

/** Set of canonical tool names that represent subagent/Task tool calls. */
const SUBAGENT_TOOL_NAMES = new Set([
  'Task', 'Subagent', 'oracle', 'code_review', 'librarian',
]);

/**
 * Returns true if a root tool call is a subagent/Task type that should be
 * rendered as an ActivityGroup with tree-line children.
 */
function isSubagentToolCall(toolCall: ToolCallItem): boolean {
  const rawName = resolveToolName(toolCall);
  const name = TOOL_NAME_MAP[rawName] ?? rawName;
  // Prefix-based detection (sa__*, tb__*)
  if (name.startsWith('sa__') || name.startsWith('tb__')) return true;
  // Name-based detection
  return SUBAGENT_TOOL_NAMES.has(name);
}

/**
 * Converts child ToolCallItems into ActivityAction entries for ActivityGroup.
 *
 * Matches AMP tree structure:
 *   1. First entry: task description text (from rawInput)
 *   2. Streaming assistant text messages (from parent tool's streamingOutput)
 *   3. Child tool calls interleaved with any per-child streaming text
 *
 * ACTV-04: streaming shows inline subagent messages with name label and progress.
 */
function buildActivityActions(
  parent: ToolCallItem,
  children: ToolCallItem[],
  description: string,
): ActivityAction[] {
  const actions: ActivityAction[] = [];

  // First action: task description (matches AMP golden first tree entry)
  if (description) {
    actions.push({ kind: 'text', text: description });
  }

  // Streaming output from parent (inline subagent assistant text)
  if (parent.streamingOutput) {
    // Split into lines and add each non-empty line as a text action
    const lines = parent.streamingOutput.split('\n').filter(l => l.trim());
    for (const line of lines) {
      actions.push({ kind: 'text', text: line });
    }
  }

  // Child tool calls
  for (const child of children) {
    actions.push({ kind: 'tool_call', toolCall: child });
  }
  return actions;
}

/**
 * Computes summary aggregation counts (success / error) from child tool calls.
 * Matches AMP's z1R summary rendering: "N checkmark | M cross".
 */
function computeActivitySummary(children: ToolCallItem[]): { success: number; error: number } {
  let success = 0;
  let error = 0;
  for (const child of children) {
    if (child.status === 'completed') {
      success++;
    } else if (child.status === 'failed') {
      error++;
    }
  }
  return { success, error };
}
