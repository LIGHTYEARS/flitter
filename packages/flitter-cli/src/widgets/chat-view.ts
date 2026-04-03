// ChatView — StatefulWidget that renders the conversation turn list and
// dispatches to the correct screen (welcome, empty, loading, processing,
// error, ready) based on AppState.screenState.
//
// Owns the AppState listener lifecycle: registers in initState(), removes
// in dispose(). Calls setState() on AppState change to trigger rebuild.
//
// Turn rendering uses the Phase 14 turn model (UserTurn, AssistantTurn).
// Placeholder renderers are used for tool calls, markdown, thinking, and
// plans — specialized renderers drop in at Phases 18-19 without changing
// the layout contract.

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
import type { Turn, UserTurn, AssistantTurn } from '../state/turn-types';
import type { ScreenState, ErrorScreen } from '../state/screen-state';

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
        return buildWelcomeScreen(this.widget.appState);
      case 'empty':
        return buildEmptyScreen();
      case 'loading':
        return buildLoadingScreen();
      case 'processing':
        return buildConversationView(this.widget.appState);
      case 'error':
        return buildErrorScreen(screenState);
      case 'ready':
        return buildConversationView(this.widget.appState);
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
function buildConversationView(appState: AppState): Widget {
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
      children.push(buildAssistantTurnWidget(turn));
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
 *   - AssistantMessage text (plain text — markdown rendering deferred to Phase 19)
 *   - ToolCall placeholders (dim "[tool: {title}]" — full rendering deferred to Phase 18)
 *   - PlanItem placeholders (deferred to Phase 19)
 *   - SystemMessage separators (horizontal rule + dim italic text)
 */
function buildAssistantTurnWidget(turn: AssistantTurn): Widget {
  const header = SizedBox.shrink();
  const bodyChildren: Widget[] = [];

  // Thinking items — placeholder
  for (const thinking of turn.thinkingItems) {
    const label = thinking.isStreaming ? '[thinking...]' : '[thinking]';
    bodyChildren.push(
      new Text({
        text: new TextSpan({
          text: label,
          style: new TextStyle({
            foreground: Color.brightBlack,
            dim: true,
          }),
        }),
      }),
    );
  }

  // Assistant message text (plain text for now)
  if (turn.message) {
    const text = turn.message.text || '';
    const suffix = turn.message.isStreaming ? '\u2588' : ''; // block cursor for streaming
    bodyChildren.push(
      new Text({
        text: new TextSpan({
          text: text + suffix,
          style: new TextStyle({
            foreground: Color.defaultColor,
          }),
        }),
      }),
    );
  }

  // Tool call placeholders
  for (const toolCall of turn.toolCalls) {
    bodyChildren.push(
      new Text({
        text: new TextSpan({
          text: `[tool: ${toolCall.title}]`,
          style: new TextStyle({
            foreground: Color.brightBlack,
            dim: true,
          }),
        }),
      }),
    );
  }

  // Plan item placeholders
  for (const _plan of turn.planItems) {
    bodyChildren.push(
      new Text({
        text: new TextSpan({
          text: '[plan]',
          style: new TextStyle({
            foreground: Color.brightBlack,
            dim: true,
          }),
        }),
      }),
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
// Screen Placeholders — welcome, empty, loading, error
// ---------------------------------------------------------------------------

/**
 * Welcome screen — first launch, no history.
 * Center with "flitter-cli" title, "Ctrl+O for help" hint, and cwd display.
 */
function buildWelcomeScreen(appState: AppState): Widget {
  return new Center({
    child: new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'center',
      children: [
        new Text({
          text: new TextSpan({
            text: 'flitter-cli',
            style: new TextStyle({
              foreground: Color.cyan,
              bold: true,
            }),
          }),
        }),
        new SizedBox({ height: 1 }),
        new Text({
          text: new TextSpan({
            children: [
              new TextSpan({
                text: 'Ctrl+O',
                style: new TextStyle({ foreground: Color.blue }),
              }),
              new TextSpan({
                text: ' for help',
                style: new TextStyle({ foreground: Color.yellow }),
              }),
            ],
          }),
        }),
        new SizedBox({ height: 1 }),
        new Text({
          text: new TextSpan({
            text: `cwd: ${appState.metadata.cwd}`,
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
