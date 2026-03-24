// chat-room.ts — Multi-user chat room simulation with message input.
//
// Run with: bun run examples/chat-room.ts
//
// Controls: Enter: send | Esc: clear | Ctrl+q: quit
//
// Demonstrates: StatefulWidget + setInterval, TextField, colored usernames,
// timestamps, online sidebar, system messages (join/leave) in dim italic.

import {
  StatefulWidget, State, Widget, type BuildContext,
} from '../src/framework/widget';
import { runApp } from '../src/framework/binding';
import { Text } from '../src/widgets/text';
import { Column, Row } from '../src/widgets/flex';
import { SizedBox } from '../src/widgets/sized-box';
import { Container } from '../src/widgets/container';
import { Expanded } from '../src/widgets/flexible';
import { Divider } from '../src/widgets/divider';
import { TextField, TextEditingController } from '../src/widgets/text-field';
import { TextSpan } from '../src/core/text-span';
import { TextStyle } from '../src/core/text-style';
import { Color } from '../src/core/color';
import { EdgeInsets } from '../src/layout/edge-insets';
import { BoxDecoration, Border, BorderSide } from '../src/layout/render-decorated';
import { FocusNode, FocusManager } from '../src/input/focus';
import type { KeyEvent, KeyEventResult } from '../src/input/events';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function txt(text: string, style?: TextStyle): Text {
  return new Text({ text: new TextSpan({ text, style: style ?? new TextStyle() }) });
}

// ---------------------------------------------------------------------------
// Data types and constants
// ---------------------------------------------------------------------------

export interface ChatMessage {
  user: string;
  text: string;
  timestamp: string;
  isSystem: boolean;
}

interface MockUser { name: string; color: Color; messages: string[] }

const MOCK_USERS: MockUser[] = [
  { name: 'Alice', color: Color.magenta, messages: [
    'Has anyone tried the new API endpoint?', 'The build looks green now!',
    'I pushed a fix for the flaky test.', 'Can someone review my PR?',
  ]},
  { name: 'Bob', color: Color.green, messages: [
    'Good morning everyone!', 'I am working on the auth module today.',
    'The staging server is back up.', 'Found a bug in the parser.',
  ]},
  { name: 'Charlie', color: Color.yellow, messages: [
    'Just deployed v2.3.1 to production.', 'All metrics look healthy.',
    'Running the regression suite now.', 'The cache issue is fixed.',
  ]},
  { name: 'Diana', color: Color.cyan, messages: [
    'I will handle code review this afternoon.', 'Great work on the refactoring!',
    'We should schedule a sync for Thursday.', 'Merged the hotfix into main.',
  ]},
  { name: 'Eve', color: Color.brightRed, messages: [
    'Security scan passed with no issues.', 'Updated the CI pipeline config.',
    'Load test results look promising.', 'Pushed monitoring dashboard updates.',
  ]},
];

const SYSTEM_EVENTS = ['has joined the room', 'has left the room', 'is now away', 'is back online'];
const MAX_VISIBLE_MESSAGES = 18;

// Styles
const headerStyle = new TextStyle({ bold: true, foreground: Color.defaultColor });
const dimStyle = new TextStyle({ dim: true });
const systemStyle = new TextStyle({ dim: true, italic: true });
const timestampStyle = new TextStyle({ dim: true, foreground: Color.brightBlack });
const inputLabelStyle = new TextStyle({ bold: true, foreground: Color.cyan });

// ---------------------------------------------------------------------------
// ChatRoom Widget
// ---------------------------------------------------------------------------

export class ChatRoom extends StatefulWidget {
  createState(): State<ChatRoom> { return new ChatRoomState(); }
}

export class ChatRoomState extends State<ChatRoom> {
  private _messages: ChatMessage[] = [];
  private _inputCtrl!: TextEditingController;
  private _focusNode: FocusNode | null = null;
  private _botTimer: ReturnType<typeof setInterval> | null = null;
  private _systemTimer: ReturnType<typeof setInterval> | null = null;
  private _onlineUsers: string[] = ['You', 'Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];
  private _myUsername = 'You';

  initState(): void {
    super.initState();
    this._inputCtrl = new TextEditingController();

    // Seed initial conversation
    this._addSystemMessage('Welcome to #general!');
    this._addSystemMessage('Alice has joined the room');
    this._addSystemMessage('Bob has joined the room');
    this._addMessage('Alice', 'Hey everyone, good to be here!');
    this._addMessage('Bob', 'Hello! How is it going?');
    this._addMessage('Charlie', 'Working on the new dashboard component.');
    this._addSystemMessage('Diana has joined the room');
    this._addMessage('Diana', 'Hi all! Catching up on the thread.');

    // Focus node for keyboard input
    this._focusNode = new FocusNode({
      debugLabel: 'ChatRoomFocus',
      onKey: (event: KeyEvent): KeyEventResult => this._handleKey(event),
    });
    FocusManager.instance.registerNode(this._focusNode, null);
    this._focusNode.requestFocus();

    // Simulated bot messages every 4-8 seconds
    this._botTimer = setInterval(() => this._simulateBotMessage(), 4000 + Math.random() * 4000);
    // Simulated system events every 10-20 seconds
    this._systemTimer = setInterval(() => this._simulateSystemEvent(), 10000 + Math.random() * 10000);
  }

  dispose(): void {
    if (this._botTimer) { clearInterval(this._botTimer); this._botTimer = null; }
    if (this._systemTimer) { clearInterval(this._systemTimer); this._systemTimer = null; }
    if (this._focusNode) { this._focusNode.dispose(); this._focusNode = null; }
    this._inputCtrl.dispose();
    super.dispose();
  }

  // Public accessors for testing
  get messages(): readonly ChatMessage[] { return this._messages; }
  get inputController(): TextEditingController { return this._inputCtrl; }
  get onlineUsers(): readonly string[] { return this._onlineUsers; }

  // --- Message helpers ---

  private _formatTimestamp(): string {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  private _addMessage(user: string, text: string): void {
    this._messages.push({ user, text, timestamp: this._formatTimestamp(), isSystem: false });
  }

  private _addSystemMessage(text: string): void {
    this._messages.push({ user: '', text, timestamp: this._formatTimestamp(), isSystem: true });
  }

  private _sendMessage(): void {
    const text = this._inputCtrl.text.trim();
    if (text.length === 0) return;
    this._addMessage(this._myUsername, text);
    this._inputCtrl.clear();
  }

  private _simulateBotMessage(): void {
    const user = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)]!;
    const message = user.messages[Math.floor(Math.random() * user.messages.length)]!;
    this.setState(() => { this._addMessage(user.name, message); });
  }

  private _simulateSystemEvent(): void {
    const event = SYSTEM_EVENTS[Math.floor(Math.random() * SYSTEM_EVENTS.length)]!;
    const user = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)]!;
    this.setState(() => { this._addSystemMessage(`${user.name} ${event}`); });
  }

  // --- Key handling ---

  private _handleKey(event: KeyEvent): KeyEventResult {
    if (event.key === 'q' && event.ctrlKey) { process.exit(0); }

    if (event.key === 'Enter') {
      this.setState(() => { this._sendMessage(); });
      return 'handled';
    }
    if (event.key === 'Escape') {
      this.setState(() => { this._inputCtrl.clear(); });
      return 'handled';
    }
    if (event.key === 'Backspace') {
      this.setState(() => { this._inputCtrl.deleteBackward(); });
      return 'handled';
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.altKey) {
      this.setState(() => { this._inputCtrl.insertText(event.key); });
      return 'handled';
    }
    if (event.key === 'Space') {
      this.setState(() => { this._inputCtrl.insertText(' '); });
      return 'handled';
    }
    if (event.key === 'ArrowLeft') {
      this.setState(() => { this._inputCtrl.moveCursorLeft(); });
      return 'handled';
    }
    if (event.key === 'ArrowRight') {
      this.setState(() => { this._inputCtrl.moveCursorRight(); });
      return 'handled';
    }
    return 'ignored';
  }

  // --- User color lookup ---

  private _getUserColor(username: string): Color {
    if (username === this._myUsername) return Color.brightCyan;
    const found = MOCK_USERS.find((u) => u.name === username);
    return found ? found.color : Color.defaultColor;
  }

  // --- Build helpers ---

  private _buildMessageWidget(msg: ChatMessage): Widget {
    if (msg.isSystem) {
      return new Row({ children: [
        txt(`[${msg.timestamp}] `, timestampStyle),
        txt(`*** ${msg.text}`, systemStyle),
      ]});
    }
    const nameStyle = new TextStyle({ bold: true, foreground: this._getUserColor(msg.user) });
    return new Row({ children: [
      txt(`[${msg.timestamp}] `, timestampStyle),
      txt(msg.user, nameStyle),
      txt(': ', dimStyle),
      new Expanded({ child: txt(msg.text) }),
    ]});
  }

  private _buildMessageArea(): Widget {
    const visible = this._messages.slice(-MAX_VISIBLE_MESSAGES);
    const widgets: Widget[] = visible.map((msg) => this._buildMessageWidget(msg));
    // Pad with empty lines so layout stays consistent
    while (widgets.length < MAX_VISIBLE_MESSAGES) { widgets.unshift(txt('')); }
    return new Column({ mainAxisSize: 'min', crossAxisAlignment: 'stretch', children: widgets });
  }

  private _buildOnlineSidebar(): Widget {
    const userWidgets: Widget[] = this._onlineUsers.map((name) => {
      const indicator = name === this._myUsername ? '>' : ' ';
      return new Row({ children: [
        txt(`${indicator} `, new TextStyle({ foreground: Color.green })),
        txt(name, new TextStyle({ foreground: this._getUserColor(name) })),
      ]});
    });

    return new Container({
      width: 18,
      decoration: new BoxDecoration({
        border: Border.all(new BorderSide({ color: Color.brightBlack, style: 'rounded' })),
      }),
      child: new Column({
        mainAxisSize: 'min', crossAxisAlignment: 'stretch',
        children: [
          new Container({
            decoration: new BoxDecoration({ color: Color.green }),
            child: txt(' Online ', new TextStyle({ bold: true })),
          }),
          new SizedBox({ height: 1 }),
          ...userWidgets,
          new SizedBox({ height: 1 }),
          txt(` ${this._onlineUsers.length} users`, dimStyle),
        ],
      }),
    });
  }

  private _buildInputArea(): Widget {
    return new Container({
      decoration: new BoxDecoration({
        border: Border.all(new BorderSide({ color: Color.cyan, style: 'rounded' })),
      }),
      child: new Row({ children: [
        txt(' > ', inputLabelStyle),
        new Expanded({ child: new TextField({ controller: this._inputCtrl, placeholder: 'Type a message...' }) }),
      ]}),
    });
  }

  build(_context: BuildContext): Widget {
    return new Column({
      crossAxisAlignment: 'stretch',
      children: [
        // Header
        new Container({
          decoration: new BoxDecoration({
            color: Color.blue,
            border: Border.all(new BorderSide({ color: Color.blue, style: 'solid' })),
          }),
          child: Row.spaceBetween([
            txt(' #general ', headerStyle),
            txt(`${this._messages.length} messages `, dimStyle),
          ]),
        }),
        // Main content: messages + sidebar
        new Expanded({
          child: new Row({ crossAxisAlignment: 'start', children: [
            new Expanded({
              child: new Container({
                decoration: new BoxDecoration({
                  border: new Border({ right: new BorderSide({ color: Color.brightBlack, style: 'solid' }) }),
                }),
                child: this._buildMessageArea(),
              }),
            }),
            this._buildOnlineSidebar(),
          ]}),
        }),
        new Divider({ color: Color.brightBlack }),
        // Input
        this._buildInputArea(),
        txt(' Enter: send | Esc: clear | Ctrl+q: quit', dimStyle),
      ],
    });
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { txt, MOCK_USERS, SYSTEM_EVENTS, MAX_VISIBLE_MESSAGES };
export const createChatRoom = (): ChatRoom => new ChatRoom();

if (import.meta.main) {
  runApp(new ChatRoom(), { output: process.stdout });
}
